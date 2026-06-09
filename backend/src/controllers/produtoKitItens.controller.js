const prisma = require('../lib/prisma');

const listarPorMestre = async (req, res, next) => {
  try {
    const itens = await prisma.produtoKitItem.findMany({
      where: { produto_mestre_id: req.params.mestreId, deleted: false },
      include: { produto_individual: true },
    });
    res.json(itens);
  } catch (err) {
    next(err);
  }
};

const adicionar = async (req, res, next) => {
  try {
    const { produto_mestre_id, produto_individual_id, quantidade_necessaria } = req.body;
    if (!produto_mestre_id || !produto_individual_id || quantidade_necessaria == null) {
      return res.status(400).json({ error: 'Os campos produto_mestre_id, produto_individual_id e quantidade_necessaria são obrigatórios.' });
    }

    const mestre = await prisma.produto.findFirst({ where: { id: produto_mestre_id, deleted: false } });
    if (!mestre) return res.status(404).json({ error: 'Produto mestre não encontrado.' });
    if (mestre.tipo_baixa !== 'mestre') {
      return res.status(400).json({ error: 'O produto informado não é do tipo mestre.' });
    }

    const item = await prisma.produtoKitItem.create({
      data: { produto_mestre_id, produto_individual_id, quantidade_necessaria },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { quantidade_necessaria } = req.body;
    const item = await prisma.produtoKitItem.update({
      where: { id: req.params.id },
      data: { quantidade_necessaria },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

const remover = async (req, res, next) => {
  try {
    await prisma.produtoKitItem.update({
      where: { id: req.params.id },
      data: { deleted: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listarPorMestre, adicionar, atualizar, remover };
