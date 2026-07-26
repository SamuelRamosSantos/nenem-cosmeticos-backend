const prisma = require('../lib/prisma');
const ApiError = require('../utils/apiError');
const arredondar = require('../utils/arredondar');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const listar = async (req, res, next) => {
  try {
    const { status, cliente_id } = req.query;
    const where = { deleted: false };
    if (status) where.status = status;
    if (cliente_id) where.cliente_id = cliente_id;

    const { page, pageSize, skip, take, orderBy } = parsePagination(req.query, {
      defaultSortBy: 'created_at',
      allowedSortBy: ['created_at', 'data_venda', 'total'],
      defaultSortOrder: 'desc',
    });

    const [vendas, total] = await Promise.all([
      prisma.vendaHeader.findMany({
        where,
        include: { cliente: true, itens: { include: { produto: true } }, pagamentos: { include: { forma_pagamento: true } } },
        orderBy,
        skip,
        take,
      }),
      prisma.vendaHeader.count({ where }),
    ]);
    res.json({ data: vendas, pagination: buildPaginationMeta({ page, pageSize, total }) });
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
    if (!venda) throw new ApiError(404, 'Venda não encontrada.', 'NOT_FOUND');
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
      throw new ApiError(400, 'Os campos produto_id, quantidade e preco_unitario são obrigatórios.', 'VALIDATION_ERROR');
    }

    const venda = await prisma.vendaHeader.findFirst({ where: { id: req.params.id, deleted: false } });
    if (!venda) throw new ApiError(404, 'Venda não encontrada.', 'NOT_FOUND');
    if (venda.status !== 'aberta') throw new ApiError(400, 'Só é possível adicionar itens em vendas abertas.', 'VALIDATION_ERROR');

    const produto = await prisma.produto.findFirst({ where: { id: produto_id, deleted: false } });
    if (!produto) throw new ApiError(404, 'Produto não encontrado.', 'NOT_FOUND');

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
    if (!venda) throw new ApiError(404, 'Venda não encontrada.', 'NOT_FOUND');
    if (venda.status !== 'aberta') throw new ApiError(400, 'Só é possível remover itens de vendas abertas.', 'VALIDATION_ERROR');

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

// =============================================================================
// Espelha frontend/src/services/financeiroService.js#prepararOpsTitulosDaVenda
// — mesma regra de negócio (títulos gerados por UM pagamento da venda),
// reescrita para gravar direto via Prisma em vez de preparar ops do
// WatermelonDB. Qualquer mudança de regra aqui precisa ser replicada lá
// também — não há um único lugar de verdade hoje entre mobile e web.
// =============================================================================
async function criarTitulosDoPagamento(tx, {
  vendaId, clienteId, dataVenda, formaPagamento, valorPago, modalidadeCartao, parcelas,
}) {
  if (formaPagamento.tipo === 'P') {
    const n = Math.max(1, parcelas || 1);
    const jurosPercentual = formaPagamento.juros_percentual_padrao != null
      ? formaPagamento.juros_percentual_padrao.toNumber()
      : 0;
    const intervaloDias = formaPagamento.intervalo_dias ?? 30;

    const valorBaseParcela = arredondar(valorPago / n);
    let somaParcelasAnteriores = 0;

    for (let i = 1; i <= n; i++) {
      // Última parcela absorve o resíduo de arredondamento.
      const valorOriginal = i === n
        ? arredondar(valorPago - somaParcelasAnteriores)
        : valorBaseParcela;
      somaParcelasAnteriores += valorOriginal;

      const valorLiquido = arredondar(valorOriginal * (1 + jurosPercentual / 100));

      const vencimento = new Date(dataVenda);
      vencimento.setDate(vencimento.getDate() + intervaloDias * i);

      await tx.titulo.create({
        data: {
          venda_id: vendaId,
          cliente_id: clienteId,
          parcela_numero: i,
          parcelas_total: n,
          valor_original: valorOriginal,
          valor_taxa_cartao: 0,
          valor_liquido: valorLiquido,
          data_vencimento: vencimento,
          status: 'Aberto',
        },
      });
    }
    return;
  }

  // tipo 'V' ou 'C' — título único, já baixado na data da venda.
  let taxaPercentual = 0;
  if (formaPagamento.tipo === 'C') {
    const taxa = await tx.formaPagamentoTaxa.findFirst({
      where: {
        forma_pagamento_id: formaPagamento.id,
        modalidade: modalidadeCartao,
        parcelas,
        deleted: false,
      },
    });
    taxaPercentual = taxa?.taxa_percentual != null ? taxa.taxa_percentual.toNumber() : 0;
  }

  const valorTaxaCartao = arredondar(valorPago * (taxaPercentual / 100));
  const valorLiquido = arredondar(valorPago - valorTaxaCartao);

  const titulo = await tx.titulo.create({
    data: {
      venda_id: vendaId,
      cliente_id: clienteId,
      parcela_numero: 1,
      parcelas_total: 1,
      valor_original: valorPago,
      valor_taxa_cartao: valorTaxaCartao,
      valor_liquido: valorLiquido,
      data_vencimento: dataVenda,
      status: 'Baixado',
    },
  });

  await tx.tituloBaixa.create({
    data: {
      titulo_id: titulo.id,
      forma_pagamento_id: formaPagamento.id,
      valor_pago: valorLiquido,
      valor_desconto: 0,
      valor_juros: 0,
      data_baixa: dataVenda,
    },
  });
}

// =============================================================================
// POST /api/vendas/web/finalizar  (NC-106)
//
// Endpoint DEDICADO à web — não mexe em `finalizar` acima, que é o stub 501
// intencional do fluxo incremental (criar venda vazia → POST itens → PATCH
// finalizar), documentado em SKILL.md como "não conserte, é proposital".
//
// A web não tem WatermelonDB/offline-first, então não dá pra montar a venda
// aos poucos feito o mobile: este endpoint recebe o carrinho inteiro (itens +
// pagamentos) e grava tudo — VendaHeader, VendaItens, movimentações de
// estoque, VendaPagamentos e Títulos — numa única transação, espelhando
// frontend/src/services/vendaService.js#finalizarVenda linha por linha.
// =============================================================================
const finalizarWeb = async (req, res, next) => {
  try {
    const { cliente_id = null, data_venda, itens, pagamentos } = req.body;

    if (!itens?.length) {
      throw new ApiError(400, 'A venda precisa ter pelo menos um item.', 'VALIDATION_ERROR');
    }
    if (!pagamentos?.length) {
      throw new ApiError(400, 'A venda precisa ter pelo menos uma forma de pagamento.', 'VALIDATION_ERROR');
    }
    for (const item of itens) {
      if (!item.produto_id || item.quantidade == null || item.preco_unitario == null) {
        throw new ApiError(400, 'Cada item precisa de produto_id, quantidade e preco_unitario.', 'VALIDATION_ERROR');
      }
    }
    for (const pagamento of pagamentos) {
      if (!pagamento.forma_pagamento_id || pagamento.valor == null) {
        throw new ApiError(400, 'Cada pagamento precisa de forma_pagamento_id e valor.', 'VALIDATION_ERROR');
      }
    }

    const dataVenda = data_venda ? new Date(data_venda) : new Date();

    // ── Formas de pagamento usadas ────────────────────────────────────────
    const formaPagamentoIds = [...new Set(pagamentos.map((p) => p.forma_pagamento_id))];
    const formasPagamento = await prisma.formaPagamento.findMany({
      where: { id: { in: formaPagamentoIds }, deleted: false },
    });
    const formaPagamentoMap = new Map(formasPagamento.map((f) => [f.id, f]));

    for (const pagamento of pagamentos) {
      const forma = formaPagamentoMap.get(pagamento.forma_pagamento_id);
      if (!forma) {
        throw new ApiError(404, `Forma de pagamento "${pagamento.forma_pagamento_id}" não encontrada.`, 'NOT_FOUND');
      }
      // Falha rápido, antes de tocar em qualquer dado (NC-75).
      if (forma.tipo === 'P' && !cliente_id) {
        throw new ApiError(400, `Venda a prazo (${forma.descricao}) exige um cliente vinculado.`, 'VALIDATION_ERROR');
      }
    }

    // ── Produtos ──────────────────────────────────────────────────────────
    const produtoIds = [...new Set(itens.map((i) => i.produto_id))];
    const produtosVendidos = await prisma.produto.findMany({
      where: { id: { in: produtoIds }, deleted: false },
    });
    const produtoMap = new Map(produtosVendidos.map((p) => [p.id, p]));

    for (const item of itens) {
      if (!produtoMap.has(item.produto_id)) {
        throw new ApiError(404, `Produto "${item.produto_id}" não encontrado.`, 'NOT_FOUND');
      }
    }

    // ── Kits (produtos mestre) ────────────────────────────────────────────
    const mestreIds = itens
      .map((i) => i.produto_id)
      .filter((id) => produtoMap.get(id)?.tipo_baixa === 'M');

    const kitItensMap = new Map();

    if (mestreIds.length > 0) {
      const todosKitItens = await prisma.produtoKitItem.findMany({
        where: { produto_mestre_id: { in: mestreIds }, deleted: false },
      });

      for (const ki of todosKitItens) {
        if (!kitItensMap.has(ki.produto_mestre_id)) kitItensMap.set(ki.produto_mestre_id, []);
        kitItensMap.get(ki.produto_mestre_id).push(ki);
      }

      for (const mestreId of mestreIds) {
        if (!kitItensMap.get(mestreId)?.length) {
          throw new ApiError(400, `Produto mestre "${produtoMap.get(mestreId).descricao}" sem itens de kit.`, 'VALIDATION_ERROR');
        }
      }

      const individualIds = [...new Set(
        [...kitItensMap.values()].flat().map((ki) => ki.produto_individual_id)
      )];
      const individuais = await prisma.produto.findMany({
        where: { id: { in: individualIds }, deleted: false },
      });
      for (const p of individuais) produtoMap.set(p.id, p);
    }

    const total = itens.reduce((acc, i) => acc + i.quantidade * i.preco_unitario, 0);

    // ── TRANSAÇÃO ATÔMICA ─────────────────────────────────────────────────
    const venda = await prisma.$transaction(async (tx) => {
      const vendaHeader = await tx.vendaHeader.create({
        data: { cliente_id, status: 'finalizada', total, data_venda: dataVenda },
      });

      for (const item of itens) {
        const produto = produtoMap.get(item.produto_id);
        const custoGravado = item.custo_unitario ?? produto.custo_preco;

        await tx.vendaItem.create({
          data: {
            venda_id: vendaHeader.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            custo_unitario_gravado: custoGravado,
          },
        });

        if (produto.tipo_baixa === 'M') {
          // Kit: baixa nos filhos.
          const filhos = kitItensMap.get(item.produto_id);
          for (const kitItem of filhos) {
            const qtdBaixa = item.quantidade * kitItem.quantidade_necessaria.toNumber();
            const produtoIndividual = produtoMap.get(kitItem.produto_individual_id);

            if (produtoIndividual && produtoIndividual.movimenta_estoque !== false) {
              await tx.estoqueMovimentacao.create({
                data: {
                  produto_id: kitItem.produto_individual_id,
                  tipo_movimentacao: 'saida_venda',
                  quantidade: qtdBaixa,
                  referencia_id: vendaHeader.id,
                  pessoa_id: cliente_id,
                  data_movimentacao: dataVenda,
                },
              });
              await tx.produto.update({
                where: { id: kitItem.produto_individual_id },
                data: { qtd_estoque: { decrement: qtdBaixa } },
              });
            }
          }
        } else if (produto.movimenta_estoque !== false) {
          // Individual: baixa direta.
          await tx.estoqueMovimentacao.create({
            data: {
              produto_id: item.produto_id,
              tipo_movimentacao: 'saida_venda',
              quantidade: item.quantidade,
              referencia_id: vendaHeader.id,
              pessoa_id: cliente_id,
              data_movimentacao: dataVenda,
            },
          });
          await tx.produto.update({
            where: { id: item.produto_id },
            data: { qtd_estoque: { decrement: item.quantidade } },
          });
        }
      }

      // Pagamentos + Títulos (um conjunto por forma de pagamento usada).
      for (const pagamento of pagamentos) {
        await tx.vendaPagamento.create({
          data: {
            venda_id: vendaHeader.id,
            forma_pagamento_id: pagamento.forma_pagamento_id,
            valor: pagamento.valor,
          },
        });

        await criarTitulosDoPagamento(tx, {
          vendaId: vendaHeader.id,
          clienteId: cliente_id,
          dataVenda,
          formaPagamento: formaPagamentoMap.get(pagamento.forma_pagamento_id),
          valorPago: pagamento.valor,
          modalidadeCartao: pagamento.modalidade_cartao ?? 'D',
          parcelas: pagamento.parcelas ?? 1,
        });
      }

      return vendaHeader;
    });

    const vendaCompleta = await prisma.vendaHeader.findFirst({
      where: { id: venda.id },
      include: {
        cliente: true,
        itens: { where: { deleted: false }, include: { produto: true } },
        pagamentos: { where: { deleted: false }, include: { forma_pagamento: true } },
        titulos: { where: { deleted: false } },
      },
    });

    res.status(201).json(vendaCompleta);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, adicionarItem, removerItem, cancelar, finalizar, finalizarWeb };
