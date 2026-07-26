const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { tipo_baixa, marca_id, busca, estoque } = req.query;
    const where = { deleted: false, ativo: true };
    if (tipo_baixa) where.tipo_baixa = tipo_baixa;
    if (marca_id) where.marca_id = marca_id;
    if (busca?.trim()) {
      where.OR = [
        { descricao: { contains: busca.trim(), mode: 'insensitive' } },
        { cod_barras: busca.trim() },
      ];
    }
    // Mesmos filtros de ProdutosScreen.js (FILTROS: todos/com_estoque/sem_estoque).
    if (estoque === 'com_estoque') where.qtd_estoque = { gt: 0 };
    else if (estoque === 'sem_estoque') where.qtd_estoque = { lte: 0 };

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'descricao',
      allowedSortBy: ['descricao', 'preco_venda', 'custo_preco', 'qtd_estoque', 'created_at'],
    });

    const [produtos, total] = await Promise.all([
      prisma.produto.findMany({ where, include: { marca: true }, orderBy, skip, take }),
      prisma.produto.count({ where }),
    ]);
    res.json({ data: produtos, pagination: buildPaginationMeta({ page, pageSize, total }) });
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
    if (!produto) throw new ApiError(404, 'Produto não encontrado.', 'NOT_FOUND');
    res.json(produto);
  } catch (err) {
    next(err);
  }
};

// Espelha CadastrarProdutoScreen.js#proximoCodigoInterno: maior codigo_interno
// numérico já usado + 1. Não precisa carregar todos os produtos (o app faz
// isso local no WatermelonDB) — aqui dá pra agregar direto no Postgres.
async function proximoCodigoInterno() {
  const produtos = await prisma.produto.findMany({ select: { codigo_interno: true } });
  const max = produtos.reduce((acc, p) => {
    const n = parseInt(p.codigo_interno, 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return String(max + 1);
}

const criar = async (req, res, next) => {
  try {
    const { descricao, marca_id, preco_venda, custo_preco, cod_barras, codigo_interno, tipo_baixa } = req.body;
    if (!descricao || preco_venda == null || custo_preco == null) {
      throw new ApiError(400, 'Os campos descricao, preco_venda e custo_preco são obrigatórios.', 'VALIDATION_ERROR');
    }
    const produto = await prisma.produto.create({
      data: {
        descricao,
        marca_id: marca_id || null,
        preco_venda,
        custo_preco,
        cod_barras: cod_barras || null,
        codigo_interno: codigo_interno || (await proximoCodigoInterno()),
        tipo_baixa,
        ativo: true,
      },
    });
    res.status(201).json(produto);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { descricao, marca_id, preco_venda, custo_preco, cod_barras, codigo_interno, tipo_baixa, movimenta_estoque } = req.body;
    const produto = await prisma.produto.update({
      where: { id: req.params.id },
      data: {
        descricao,
        marca_id: marca_id || null,
        preco_venda,
        custo_preco,
        cod_barras: cod_barras || null,
        codigo_interno,
        tipo_baixa,
        movimenta_estoque,
      },
    });
    res.json(produto);
  } catch (err) {
    next(err);
  }
};

// Espelha ProdutosScreen.js#handleExcluir: sem vendas/movimentações → exclusão
// de verdade (deleted:true); com histórico → inativa (ativo:false) em vez de
// excluir, pra não quebrar vendas/movimentações já registradas.
const remover = async (req, res, next) => {
  try {
    const [qtdVendas, qtdMovimentacoes] = await Promise.all([
      prisma.vendaItem.count({ where: { produto_id: req.params.id, deleted: false } }),
      prisma.estoqueMovimentacao.count({ where: { produto_id: req.params.id, deleted: false } }),
    ]);

    if (qtdVendas === 0 && qtdMovimentacoes === 0) {
      await prisma.produto.update({ where: { id: req.params.id }, data: { deleted: true } });
      return res.status(204).send();
    }

    await prisma.produto.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ inativado: true, mensagem: 'Possui histórico — foi inativado em vez de excluído.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
