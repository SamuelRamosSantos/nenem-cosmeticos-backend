const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { tipo_baixa, marca_id } = req.query;
    const where = { deleted: false };
    if (tipo_baixa) where.tipo_baixa = tipo_baixa;
    if (marca_id) where.marca_id = marca_id;

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'descricao',
      allowedSortBy: ['descricao', 'preco_venda', 'custo_preco', 'qtd_estoque', 'created_at'],
    });

    const [produtos, total] = await Promise.all([
      prisma.produto.findMany({ where, include: { marca: true }, orderBy, skip, take }),
      prisma.produto.count({ where }),
    ]);
    res.json({ data: produtos, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const produto = await prisma.produto.findFirst({
      where: { id: req.params.id, deleted: false },
      include: {
        marca: true,
        kit_itens_como_mestre: {
          where: { deleted: false },
          include: { produto_individual: true },
        },
      },
    });
    if (!produto) throw new ApiError(404, 'Produto não encontrado.', 'NOT_FOUND');
    res.json(produto);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { descricao, marca_id, preco_venda, custo_preco, cod_barras, codigo_interno, tipo_baixa } = req.body;
    if (!descricao || !marca_id || preco_venda == null || custo_preco == null) {
      throw new ApiError(400, 'Os campos descricao, marca_id, preco_venda e custo_preco são obrigatórios.', 'VALIDATION_ERROR');
    }
    const produto = await prisma.produto.create({
      data: { descricao, marca_id, preco_venda, custo_preco, cod_barras, codigo_interno, tipo_baixa },
    });
    res.status(201).json(produto);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { descricao, marca_id, preco_venda, custo_preco, cod_barras, codigo_interno, tipo_baixa } = req.body;
    const produto = await prisma.produto.update({
      where: { id: req.params.id },
      data: { descricao, marca_id, preco_venda, custo_preco, cod_barras, codigo_interno, tipo_baixa },
    });
    res.json(produto);
  } catch (err) {
    next(err);
  }
};

const remover = async (req, res, next) => {
  try {
    await prisma.produto.update({
      where: { id: req.params.id },
      data: { deleted: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
