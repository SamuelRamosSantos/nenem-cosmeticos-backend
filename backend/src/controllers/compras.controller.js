const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { status, fornecedor_id } = req.query;
    const where = { deleted: false };
    if (status) where.status = status;
    if (fornecedor_id) where.fornecedor_id = fornecedor_id;

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'created_at',
      allowedSortBy: ['created_at', 'total'],
      defaultSortOrder: 'desc',
    });

    const [compras, total] = await Promise.all([
      prisma.compraHeader.findMany({
        where,
        include: { fornecedor: true, itens: { include: { produto: true } }, pagamentos: { include: { forma_pagamento: true } } },
        orderBy,
        skip,
        take,
      }),
      prisma.compraHeader.count({ where }),
    ]);
    res.json({ data: compras, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const compra = await prisma.compraHeader.findFirst({
      where: { id: req.params.id, deleted: false },
      include: {
        fornecedor: true,
        itens: { where: { deleted: false }, include: { produto: { include: { marca: true } } } },
        pagamentos: { where: { deleted: false }, include: { forma_pagamento: true } },
      },
    });
    if (!compra) throw new ApiError(404, 'Compra não encontrada.', 'NOT_FOUND');
    res.json(compra);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { fornecedor_id } = req.body;
    const compra = await prisma.compraHeader.create({
      data: { fornecedor_id, total: 0, status: 'aberta' },
    });
    res.status(201).json(compra);
  } catch (err) {
    next(err);
  }
};

const adicionarItem = async (req, res, next) => {
  try {
    const { produto_id, quantidade, custo_unitario } = req.body;
    if (!produto_id || quantidade == null || custo_unitario == null) {
      throw new ApiError(400, 'Os campos produto_id, quantidade e custo_unitario são obrigatórios.', 'VALIDATION_ERROR');
    }

    const compra = await prisma.compraHeader.findFirst({ where: { id: req.params.id, deleted: false } });
    if (!compra) throw new ApiError(404, 'Compra não encontrada.', 'NOT_FOUND');
    if (compra.status !== 'aberta') throw new ApiError(400, 'Só é possível adicionar itens em compras abertas.', 'VALIDATION_ERROR');

    const item = await prisma.$transaction(async (tx) => {
      const novoItem = await tx.compraItem.create({
        data: { compra_id: req.params.id, produto_id, quantidade, custo_unitario },
      });

      const totalAtual = await tx.compraItem.aggregate({
        where: { compra_id: req.params.id, deleted: false },
        _sum: { custo_unitario: true },
      });

      await tx.compraHeader.update({
        where: { id: req.params.id },
        data: { total: totalAtual._sum.custo_unitario || 0 },
      });

      return novoItem;
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

const finalizar = async (req, res, next) => {
  try {
    const compra = await prisma.compraHeader.findFirst({
      where: { id: req.params.id, deleted: false },
      include: { itens: { where: { deleted: false } } },
    });
    if (!compra) throw new ApiError(404, 'Compra não encontrada.', 'NOT_FOUND');
    if (compra.status !== 'aberta') throw new ApiError(400, 'Compra já foi finalizada ou cancelada.', 'VALIDATION_ERROR');

    const compraFinalizada = await prisma.$transaction(async (tx) => {
      for (const item of compra.itens) {
        await tx.estoqueMovimentacao.create({
          data: {
            produto_id: item.produto_id,
            tipo_movimentacao: 'entrada_compra',
            quantidade: item.quantidade,
            referencia_id: compra.id,
            pessoa_id: compra.fornecedor_id,
          },
        });

        await tx.produto.update({
          where: { id: item.produto_id },
          data: { qtd_estoque: { increment: item.quantidade } },
        });
      }

      return tx.compraHeader.update({
        where: { id: req.params.id },
        data: { status: 'finalizada' },
      });
    });

    res.json(compraFinalizada);
  } catch (err) {
    next(err);
  }
};

const cancelar = async (req, res, next) => {
  try {
    const compra = await prisma.compraHeader.update({
      where: { id: req.params.id },
      data: { status: 'cancelada' },
    });
    res.json(compra);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, adicionarItem, finalizar, cancelar };
