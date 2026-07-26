const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { produto_id, tipo_movimentacao } = req.query;
    const where = { deleted: false };
    if (produto_id) where.produto_id = produto_id;
    if (tipo_movimentacao) where.tipo_movimentacao = tipo_movimentacao;

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'data_movimentacao',
      allowedSortBy: ['data_movimentacao', 'created_at', 'quantidade'],
      defaultSortOrder: 'desc',
    });

    const [movimentacoes, total] = await Promise.all([
      prisma.estoqueMovimentacao.findMany({
        where,
        include: { produto: true, pessoa: true },
        orderBy,
        skip,
        take,
      }),
      prisma.estoqueMovimentacao.count({ where }),
    ]);
    res.json({ data: movimentacoes, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const mov = await prisma.estoqueMovimentacao.findFirst({
      where: { id: req.params.id, deleted: false },
      include: { produto: true, pessoa: true },
    });
    if (!mov) throw new ApiError(404, 'Movimentação não encontrada.', 'NOT_FOUND');
    res.json(mov);
  } catch (err) {
    next(err);
  }
};

// Apenas para ajustes manuais — compras e vendas criam movimentações automaticamente
const criarAjuste = async (req, res, next) => {
  try {
    const { produto_id, tipo_movimentacao, quantidade, pessoa_id, data_movimentacao } = req.body;

    const tiposAjuste = ['ajuste_positivo', 'ajuste_negativo'];
    if (!tiposAjuste.includes(tipo_movimentacao)) {
      throw new ApiError(400, 'Para ajustes manuais use: ajuste_positivo ou ajuste_negativo.', 'VALIDATION_ERROR');
    }
    if (!produto_id || quantidade == null) {
      throw new ApiError(400, 'Os campos produto_id e quantidade são obrigatórios.', 'VALIDATION_ERROR');
    }

    const movimentacao = await prisma.$transaction(async (tx) => {
      const mov = await tx.estoqueMovimentacao.create({
        data: { produto_id, tipo_movimentacao, quantidade, pessoa_id, data_movimentacao },
      });

      const delta = tipo_movimentacao === 'ajuste_positivo' ? quantidade : -quantidade;
      await tx.produto.update({
        where: { id: produto_id },
        data: { qtd_estoque: { increment: delta } },
      });

      return mov;
    });

    res.status(201).json(movimentacao);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criarAjuste };
