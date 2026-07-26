const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const where = { deleted: false };

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'nome',
      allowedSortBy: ['nome', 'created_at'],
    });

    const [marcas, total] = await Promise.all([
      prisma.marca.findMany({ where, orderBy, skip, take }),
      prisma.marca.count({ where }),
    ]);
    res.json({ data: marcas, pagination: buildPaginationMeta({ page, pageSize, total }) });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const marca = await prisma.marca.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!marca) throw new ApiError(404, 'Marca não encontrada.', 'NOT_FOUND');
    res.json(marca);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, percentual_comissao } = req.body;
    if (!nome || percentual_comissao == null) {
      throw new ApiError(400, 'Os campos nome e percentual_comissao são obrigatórios.', 'VALIDATION_ERROR');
    }
    const marca = await prisma.marca.create({ data: { nome, percentual_comissao } });
    res.status(201).json(marca);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { nome, percentual_comissao } = req.body;
    const marca = await prisma.marca.update({
      where: { id: req.params.id },
      data: { nome, percentual_comissao },
    });
    res.json(marca);
  } catch (err) {
    next(err);
  }
};

const remover = async (req, res, next) => {
  try {
    await prisma.marca.update({
      where: { id: req.params.id },
      data: { deleted: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
