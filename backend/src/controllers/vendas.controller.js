const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const { status, cliente_id } = req.query;
    const where = { deleted: false };
    if (status) where.status = status;
    if (cliente_id) where.cliente_id = cliente_id;

    const vendas = await prisma.vendaHeader.findMany({
      where,
      include: { cliente: true, itens: { include: { produto: true } }, pagamentos: { include: { forma_pagamento: true } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(vendas);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const venda = await prisma.vendaHeader.findFirst({
      where: { id: req.params.id, deleted: false },
      include: {
        cliente: true,
        itens: { where: { deleted: false }, include: { produto: { include: { marca: true } } } },
        pagamentos: { where: { deleted: false }, include: { forma_pagamento: true } },
      },
    });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    res.json(venda);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { cliente_id } = req.body;
    const venda = await prisma.vendaHeader.create({
      data: { cliente_id, total: 0, status: 'aberta' },
    });
    res.status(201).json(venda);
  } catch (err) {
    next(err);
  }
};

const adicionarItem = async (req, res, next) => {
  try {
    const { produto_id, quantidade, preco_unitario } = req.body;
    if (!produto_id || quantidade == null || preco_unitario == null) {
      return res.status(400).json({ error: 'Os campos produto_id, quantidade e preco_unitario são obrigatórios.' });
    }

    const venda = await prisma.vendaHeader.findFirst({ where: { id: req.params.id, deleted: false } });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    if (venda.status !== 'aberta') return res.status(400).json({ error: 'Só é possível adicionar itens em vendas abertas.' });

    const produto = await prisma.produto.findFirst({ where: { id: produto_id, deleted: false } });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado.' });

    const item = await prisma.$transaction(async (tx) => {
      const novoItem = await tx.vendaItem.create({
        data: {
          venda_id: req.params.id,
          produto_id,
          quantidade,
          preco_unitario,
          custo_unitario_gravado: 0, // será gravado ao finalizar
        },
      });

      const totalAtual = await tx.vendaItem.aggregate({
        where: { venda_id: req.params.id, deleted: false },
        _sum: { preco_unitario: true },
      });

      await tx.vendaHeader.update({
        where: { id: req.params.id },
        data: { total: totalAtual._sum.preco_unitario || 0 },
      });

      return novoItem;
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

const removerItem = async (req, res, next) => {
  try {
    const venda = await prisma.vendaHeader.findFirst({ where: { id: req.params.id, deleted: false } });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    if (venda.status !== 'aberta') return res.status(400).json({ error: 'Só é possível remover itens de vendas abertas.' });

    await prisma.vendaItem.update({
      where: { id: req.params.itemId },
      data: { deleted: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const cancelar = async (req, res, next) => {
  try {
    const venda = await prisma.vendaHeader.update({
      where: { id: req.params.id },
      data: { status: 'cancelada' },
    });
    res.json(venda);
  } catch (err) {
    next(err);
  }
};

// A finalização (com congelamento de custo e baixa de estoque) fica na Etapa 5
const finalizar = async (req, res, next) => {
  res.status(501).json({ error: 'Implementado na Etapa 5 — lógica transacional de venda.' });
};

module.exports = { listar, buscarPorId, criar, adicionarItem, removerItem, cancelar, finalizar };
