const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');

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
      throw new ApiError(400, 'Os campos produto_mestre_id, produto_individual_id e quantidade_necessaria são obrigatórios.', 'VALIDATION_ERROR');
    }

    const mestre = await prisma.produto.findFirst({ where: { id: produto_mestre_id, deleted: false } });
    if (!mestre) throw new ApiError(404, 'Produto mestre não encontrado.', 'NOT_FOUND');
    // tipo_baixa usa 'M' (mestre/kit) | 'I' (individual) — não a palavra "mestre" por extenso.
    if (mestre.tipo_baixa !== 'M') {
      throw new ApiError(400, 'O produto informado não é do tipo mestre.', 'VALIDATION_ERROR');
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
