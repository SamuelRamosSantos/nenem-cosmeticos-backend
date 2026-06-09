const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const formas = await prisma.formaPagamento.findMany({
      where: { deleted: false },
      orderBy: { descricao: 'asc' },
    });
    res.json(formas);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const forma = await prisma.formaPagamento.findFirst({
      where: { id: req.params.id, deleted: false },
    });
    if (!forma) return res.status(404).json({ error: 'Forma de pagamento não encontrada.' });
    res.json(forma);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { descricao } = req.body;
    if (!descricao) {
      return res.status(400).json({ error: 'O campo descricao é obrigatório.' });
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
