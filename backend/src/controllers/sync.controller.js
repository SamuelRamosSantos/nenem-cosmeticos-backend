const prisma = require('../lib/prisma');

// =============================================================================
// Configuração central de todas as tabelas sincronizáveis
//
// Versão 2 — mudanças em relação à v1:
//   - marcas:   + ativo
//   - produtos: + movimenta_estoque, + ativo
//   - vendas:   + data_venda (campo de data — adicionado a dateFields)
//
// allowedFields age como whitelist para evitar injeção de campos não esperados.
// dateFields lista todos os campos que chegam/saem como Unix ms e precisam
// de conversão para/de Date no Prisma.
// =============================================================================
const TABLE_CONFIG = {
  // 'usuarios' não sincroniza mais (NC-68 refeito): autenticação é sempre em
  // nuvem via /api/auth/login e /api/usuarios, sem cópia local da senha.

  pessoas: {
    model: 'pessoa',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'nome', 'telefone', 'tipo',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  marcas: {
    model: 'marca',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'nome', 'percentual_comissao', 'ativo',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  formas_pagamento: {
    model: 'formaPagamento',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'descricao', 'tipo',
      'intervalo_dias', 'limite_parcelas', 'juros_percentual_padrao',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  // NC-71 — taxas de cartão (Débito/Crédito por parcela), só existem para
  // formas_pagamento com tipo = 'C'.
  forma_pagamento_taxas: {
    model: 'formaPagamentoTaxa',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'forma_pagamento_id', 'modalidade', 'parcelas', 'taxa_percentual',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  produtos: {
    model: 'produto',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'descricao', 'marca_id', 'preco_venda', 'custo_preco',
      'cod_barras', 'codigo_interno', 'tipo_baixa', 'qtd_estoque',
      'movimenta_estoque', 'ativo',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  produto_kit_itens: {
    model: 'produtoKitItem',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'produto_mestre_id', 'produto_individual_id',
      'quantidade_necessaria',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  estoque_movimentacoes: {
    model: 'estoqueMovimentacao',
    dateFields: ['created_at', 'updated_at', 'data_movimentacao'],
    allowedFields: [
      'id', 'produto_id', 'tipo_movimentacao', 'quantidade',
      'referencia_id', 'pessoa_id', 'data_movimentacao',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  vendas: {
    model: 'vendaHeader',
    // data_venda adicionado a dateFields para conversão Unix ms ↔ Date
    dateFields: ['created_at', 'updated_at', 'data_venda'],
    allowedFields: [
      'id', 'cliente_id', 'status', 'total', 'data_venda',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  vendas_itens: {
    model: 'vendaItem',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'venda_id', 'produto_id', 'quantidade',
      'preco_unitario', 'custo_unitario_gravado',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  vendas_pagamentos: {
    model: 'vendaPagamento',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'venda_id', 'forma_pagamento_id', 'valor',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  compras: {
    model: 'compraHeader',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'fornecedor_id', 'status', 'total',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  compras_itens: {
    model: 'compraItem',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'compra_id', 'produto_id', 'quantidade', 'custo_unitario',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  compras_pagamentos: {
    model: 'compraPagamento',
    dateFields: ['created_at', 'updated_at'],
    allowedFields: [
      'id', 'compra_id', 'forma_pagamento_id', 'valor',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  // NC-73/74/75 — títulos gerados na finalização da venda.
  titulos: {
    model: 'titulo',
    dateFields: ['created_at', 'updated_at', 'data_vencimento'],
    allowedFields: [
      'id', 'venda_id', 'cliente_id', 'parcela_numero', 'parcelas_total',
      'valor_original', 'valor_taxa_cartao', 'valor_liquido',
      'data_vencimento', 'status',
      'created_at', 'updated_at', 'deleted',
    ],
  },

  // NC-78 — recebimentos contra um título.
  titulos_baixas: {
    model: 'tituloBaixa',
    dateFields: ['created_at', 'updated_at', 'data_baixa'],
    allowedFields: [
      'id', 'titulo_id', 'forma_pagamento_id', 'valor_pago', 'data_baixa',
      'created_at', 'updated_at', 'deleted',
    ],
  },
};

// Ordem de escrita no push respeita FK constraints (pais antes de filhos).
const PUSH_ORDER = [
  'pessoas', 'marcas', 'formas_pagamento', 'forma_pagamento_taxas',
  'produtos', 'produto_kit_itens',
  'vendas', 'compras',
  'vendas_itens', 'vendas_pagamentos',
  'compras_itens', 'compras_pagamentos',
  'estoque_movimentacoes',
  'titulos', 'titulos_baixas',
];

// =============================================================================
// HELPERS DE CONVERSÃO
// =============================================================================

// Prisma → WatermelonDB: DateTime → Unix ms, Decimal → number
function toSyncRecord(record) {
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (value instanceof Date) {
      result[key] = value.getTime();
    } else if (value !== null && typeof value === 'object' && typeof value.toNumber === 'function') {
      result[key] = value.toNumber();
    } else {
      result[key] = value;
    }
  }
  return result;
}

// WatermelonDB → Prisma: Unix ms → Date, filtra apenas campos permitidos,
// trata null explicitamente para campos opcionais.
function toPrismaRecord(rawRecord, config) {
  const record = {};
  for (const field of config.allowedFields) {
    if (rawRecord[field] === undefined) continue;

    const value = rawRecord[field];

    // Converte Unix ms → Date para campos de data (aceita null)
    if (config.dateFields.includes(field)) {
      record[field] = value != null ? new Date(value) : null;
    } else {
      record[field] = value;
    }
  }
  return record;
}

// =============================================================================
// GET /api/sync/pull?lastPulledAt=<unix_ms>&schemaVersion=<n>
//
// Retorna todas as mudanças desde lastPulledAt no formato:
// { changes: { tabela: { created, updated, deleted } }, timestamp: unix_ms }
//
// Registros com deleted=true são enviados apenas pelo id (array deleted).
// O campo ativo=false vai nos arrays created/updated normalmente, pois o
// soft-delete de negócio é transparente ao protocolo WatermelonDB.
// =============================================================================
const pull = async (req, res, next) => {
  const lastPulledAt = req.query.lastPulledAt
    ? new Date(parseInt(req.query.lastPulledAt, 10))
    : new Date(0);

  console.log(`[SYNC PULL] lastPulledAt=${lastPulledAt.toISOString()}`);

  try {
    const serverTimestamp = Date.now();
    const changes = {};

    for (const [tableName, config] of Object.entries(TABLE_CONFIG)) {
      const records = await prisma[config.model].findMany({
        where: { updated_at: { gt: lastPulledAt } },
      });

      const created = [];
      const updated = [];
      const deleted = [];

      for (const record of records) {
        if (record.deleted) {
          // Protocolo WatermelonDB: registro deletado = envia só o ID
          deleted.push(record.id);
        } else if (record.created_at > lastPulledAt) {
          created.push(toSyncRecord(record));
        } else {
          updated.push(toSyncRecord(record));
        }
      }

      changes[tableName] = { created, updated, deleted };

      if (records.length > 0) {
        console.log(`[SYNC PULL] ${tableName}: ${created.length} created, ${updated.length} updated, ${deleted.length} deleted`);
      }
    }

    console.log(`[SYNC PULL] Concluído. Timestamp retornado: ${serverTimestamp}`);
    res.json({ changes, timestamp: serverTimestamp });

  } catch (err) {
    console.error('[SYNC PULL ERROR]', {
      message: err.message,
      code:    err.code,
      meta:    err.meta,
      stack:   err.stack,
    });
    next(err);
  }
};

// =============================================================================
// POST /api/sync/push?lastPulledAt=<unix_ms>
//
// Recebe as mudanças do app no formato:
// { changes: { tabela: { created: [], updated: [], deleted: [] } } }
//
// Estratégia de conflito: last-write-wins — o cliente sempre prevalece.
//
// Soft delete de protocolo: registros no array deleted recebem deleted=true,
// permanecendo no banco para integridade referencial e auditoria.
//
// Nota sobre ativo=false: é um soft-delete de negócio enviado no array updated
// com o campo ativo=false. Não gera deleted=true no banco do servidor.
// =============================================================================
const push = async (req, res, next) => {
  const resumo = {}; // acumula contadores para o log final

  try {
    const { changes } = req.body;

    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({ error: 'O campo "changes" é obrigatório no body.' });
    }

    console.log('[SYNC PUSH] Iniciando transação...');

    await prisma.$transaction(async (tx) => {
      for (const tableName of PUSH_ORDER) {
        const config       = TABLE_CONFIG[tableName];
        const tableChanges = changes[tableName];
        if (!tableChanges) continue;

        const { created = [], updated = [], deleted = [] } = tableChanges;

        if (created.length + updated.length + deleted.length === 0) continue;

        resumo[tableName] = { created: created.length, updated: updated.length, deleted: deleted.length };
        console.log(`[SYNC PUSH] ${tableName}: ${created.length} creates, ${updated.length} updates, ${deleted.length} deletes`);

        // ── CREATED ─────────────────────────────────────────────────────────
        for (const rawRecord of created) {
          let data;
          try {
            data = toPrismaRecord(rawRecord, config);
            await tx[config.model].upsert({
              where:  { id: data.id },
              create: data,
              update: data,
            });
          } catch (err) {
            console.error(`[SYNC PUSH ERROR] ${tableName} CREATE — id: ${rawRecord?.id}`);
            console.error('  raw :', JSON.stringify(rawRecord));
            console.error('  convertido:', JSON.stringify(data ?? 'falha na conversão'));
            console.error('  prisma:', err.message, err.meta ?? '');
            throw err;
          }
        }

        // ── UPDATED ─────────────────────────────────────────────────────────
        for (const rawRecord of updated) {
          let data;
          try {
            data = toPrismaRecord(rawRecord, config);
            const { id, ...updateData } = data;
            await tx[config.model].update({
              where: { id },
              data:  updateData,
            });
          } catch (err) {
            console.error(`[SYNC PUSH ERROR] ${tableName} UPDATE — id: ${rawRecord?.id}`);
            console.error('  raw :', JSON.stringify(rawRecord));
            console.error('  convertido:', JSON.stringify(data ?? 'falha na conversão'));
            console.error('  prisma:', err.message, err.meta ?? '');
            // P2025 = registro não encontrado: ignora (pode já ter sido deletado)
            if (err.code === 'P2025') {
              console.warn(`  ⚠ Registro não encontrado para update, ignorando.`);
              continue;
            }
            throw err;
          }
        }

        // ── DELETED (soft-delete de protocolo WatermelonDB) ──────────────────
        for (const id of deleted) {
          try {
            await tx[config.model].update({
              where: { id },
              data:  { deleted: true },
            });
          } catch (err) {
            // P2025 = registro não existe no servidor — não é crítico
            if (err.code === 'P2025') {
              console.warn(`[SYNC PUSH] ${tableName} soft-delete — id ${id} não encontrado, ignorando.`);
              continue;
            }
            console.error(`[SYNC PUSH ERROR] ${tableName} SOFT-DELETE — id: ${id}`);
            console.error('  prisma:', err.message, err.meta ?? '');
            throw err;
          }
        }
      }
    }, { maxWait: 10000, timeout: 60000 });

    console.log('[SYNC PUSH] Transação concluída com sucesso:', resumo);
    res.status(200).json({ success: true });

  } catch (err) {
    console.error('[SYNC PUSH FATAL]', {
      message: err.message,
      code:    err.code,
      meta:    err.meta,
      stack:   err.stack,
    });
    next(err);
  }
};

module.exports = { pull, push };
