const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const where = { deleted: false };

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'descricao',
      allowedSortBy: ['descricao', 'created_at'],
    });

    const [formas, total] = await Promise.all([
      prisma.formaPagamento.findMany({ where, orderBy, skip, take }),
      prisma.formaPagamento.count({ where }),
    ]);
    res.json({ data: formas, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const forma = await prisma.formaPagamento.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!forma) throw new ApiError(404, 'Forma de pagamento não encontrada.', 'NOT_FOUND');
    res.json(forma);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { descricao } = req.body;
    if (!descricao) {
      throw new ApiError(400, 'O campo descricao é obrigatório.', 'VALIDATION_ERROR');
    }
    const forma = await prisma.formaPagamento.create({ data: { descricao } });
    res.status(201).json(forma);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { descricao } = req.body;
    const forma = await prisma.formaPagamento.update({
      where: { id: req.params.id },
      data: { descricao },
    });
    res.json(forma);
  } catch (err) {
    next(err);
  }
};

const remover = async (req, res, next) => {
  try {
    await prisma.formaPagamento.update({
      where: { id: req.params.id },
      data: { deleted: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
