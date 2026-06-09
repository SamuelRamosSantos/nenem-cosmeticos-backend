const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const { produto_id, tipo_movimentacao } = req.query;
    const where = { deleted: false };
    if (produto_id) where.produto_id = produto_id;
    if (tipo_movimentacao) where.tipo_movimentacao = tipo_movimentacao;

    const movimentacoes = await prisma.estoqueMovimentacao.findMany({
      where,
      include: { produto: true, pessoa: true },
      orderBy: { data_movimentacao: 'desc' },
    });
    res.json(movimentacoes);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const mov = await prisma.estoqueMovimentacao.findFirst({
      where: { id: req.params.id, deleted: false },
      include: { produto: true, pessoa: true },
    });
    if (!mov) return res.status(404).json({ error: 'Movimentação não encontrada.' });
    res.json(mov);
  } catch (err) {
    next(err);
  }
};

// Apenas para ajustes manuais — compras e vendas criam movimentações automaticamente
const criarAjuste = async (req, res, next) => {
  try {
    const { produto_id, tipo_movimentacao, quantidade, pessoa_id, data_movimentacao } = req.body;

    const tiposAjuste = ['ajuste_positivo', 'ajuste_negativo'];
    if (!tiposAjuste.includes(tipo_movimentacao)) {
      return res.status(400).json({ error: 'Para ajustes manuais use: ajuste_positivo ou ajuste_negativo.' });
    }
    if (!produto_id || quantidade == null) {
      return res.status(400).json({ error: 'Os campos produto_id e quantidade são obrigatórios.' });
    }

    const movimentacao = await prisma.$transaction(async (tx) => {
      const mov = await tx.estoqueMovimentacao.create({
        data: { produto_id, tipo_movimentacao, quantidade, pessoa_id, data_movimentacao },
      });

      const delta = tipo_movimentacao === 'ajuste_positivo' ? quantidade : -quantidade;
      await tx.produto.update({
        where: { id: produto_id },
        data: { qtd_estoque: { increment: delta } },
      });

      return mov;
    });

    res.status(201).json(movimentacao);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criarAjuste };
