const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const { tipo } = req.query;
    const where = { deleted: false };
    if (tipo) where.tipo = tipo;

    const pessoas = await prisma.pessoa.findMany({ where, orderBy: { nome: 'asc' } });
    res.json(pessoas);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const pessoa = await prisma.pessoa.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!pessoa) return res.status(404).json({ error: 'Pessoa não encontrada.' });
    res.json(pessoa);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, telefone, tipo } = req.body;
    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Os campos nome e tipo são obrigatórios.' });
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
