const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { tipo } = req.query;
    const where = { deleted: false };
    if (tipo) where.tipo = tipo;

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'nome',
      allowedSortBy: ['nome', 'created_at'],
    });

    const [pessoas, total] = await Promise.all([
      prisma.pessoa.findMany({ where, orderBy, skip, take }),
      prisma.pessoa.count({ where }),
    ]);
    res.json({ data: pessoas, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const pessoa = await prisma.pessoa.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!pessoa) throw new ApiError(404, 'Pessoa não encontrada.', 'NOT_FOUND');
    res.json(pessoa);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, telefone, tipo } = req.body;
    if (!nome || !tipo) {
      throw new ApiError(400, 'Os campos nome e tipo são obrigatórios.', 'VALIDATION_ERROR');
    }
    const pessoa = await prisma.pessoa.create({ data: { nome, telefone, tipo } });
    res.status(201).json(pessoa);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { nome, telefone, tipo } = req.body;
    const pessoa = await prisma.pessoa.update({
      where: { id: req.params.id },
      data: { nome, telefone, tipo },
    });
    res.json(pessoa);
  } catch (err) {
    next(err);
  }
};

const remover = async (req, res, next) => {
  try {
    await prisma.pessoa.update({
      where: { id: req.params.id },
      data: { deleted: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
