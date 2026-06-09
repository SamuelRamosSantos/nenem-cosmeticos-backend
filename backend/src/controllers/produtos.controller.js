const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const { tipo_baixa, marca_id } = req.query;
    const where = { deleted: false };
    if (tipo_baixa) where.tipo_baixa = tipo_baixa;
    if (marca_id) where.marca_id = marca_id;

    const produtos = await prisma.produto.findMany({
      where,
      include: { marca: true },
      orderBy: { descricao: 'asc' },
    });
    res.json(produtos);
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
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json(produto);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { descricao, marca_id, preco_venda, custo_preco, cod_barras, codigo_interno, tipo_baixa } = req.body;
    if (!descricao || !marca_id || preco_venda == null || custo_preco == null) {
      return res.status(400).json({ error: 'Os campos descricao, marca_id, preco_venda e custo_preco são obrigatórios.' });
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
