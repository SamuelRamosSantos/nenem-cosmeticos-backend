const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const marcas = await prisma.marca.findMany({
      where: { deleted: false },
      orderBy: { nome: 'asc' },
    });
    res.json(marcas);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const marca = await prisma.marca.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!marca) return res.status(404).json({ error: 'Marca não encontrada.' });
    res.json(marca);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, percentual_comissao } = req.body;
    if (!nome || percentual_comissao == null) {
      return res.status(400).json({ error: 'Os campos nome e percentual_comissao são obrigatórios.' });
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
