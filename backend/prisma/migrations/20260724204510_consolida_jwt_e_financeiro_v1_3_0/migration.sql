-- Épico v1.3.0 — Segurança Avançada (JWT) e Módulo Financeiro (NC-84).
-- Consolida 6 migrations intermediárias (NC-63, NC-70/71/72, NC-73/74/75/78,
-- NC-76/77, NC-83/86) numa única. Reflete apenas o estado FINAL do schema —
-- a coluna "codigo" de titulos foi adicionada e depois removida ao longo do
-- épico (NC-76 → NC-84), então não aparece aqui (nunca existiu no resultado
-- final). Conteúdo cross-checado com `prisma migrate diff --from-empty`.

-- ── NC-63: código de barras único (produtos) ───────────────────────────────
CREATE UNIQUE INDEX "produtos_cod_barras_key" ON "produtos"("cod_barras");

-- ── NC-70/71/72: tipo, taxas de cartão e prazo em Formas de Pagamento ──────
ALTER TABLE "formas_pagamento" ADD COLUMN     "intervalo_dias" INTEGER,
ADD COLUMN     "juros_percentual_padrao" DECIMAL(5,2),
ADD COLUMN     "limite_parcelas" INTEGER,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'V';

CREATE TABLE "forma_pagamento_taxas" (
    "id" TEXT NOT NULL,
    "forma_pagamento_id" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "parcelas" INTEGER NOT NULL,
    "taxa_percentual" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "forma_pagamento_taxas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "forma_pagamento_taxas_forma_pagamento_id_modalidade_parcela_key" ON "forma_pagamento_taxas"("forma_pagamento_id", "modalidade", "parcelas");

ALTER TABLE "forma_pagamento_taxas" ADD CONSTRAINT "forma_pagamento_taxas_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── NC-73/74/75/78/83/86: Títulos (Contas a Receber) e Baixas ──────────────
CREATE TABLE "titulos" (
    "id" TEXT NOT NULL,
    "venda_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "parcela_numero" INTEGER NOT NULL DEFAULT 1,
    "parcelas_total" INTEGER NOT NULL DEFAULT 1,
    "valor_original" DECIMAL(10,2) NOT NULL,
    "valor_taxa_cartao" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_liquido" DECIMAL(10,2) NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "reclassificado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "titulos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "titulos_baixas" (
    "id" TEXT NOT NULL,
    "titulo_id" TEXT NOT NULL,
    "forma_pagamento_id" TEXT NOT NULL,
    "valor_pago" DECIMAL(10,2) NOT NULL,
    "valor_desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_juros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_taxa_cartao" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "data_baixa" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "titulos_baixas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "titulos" ADD CONSTRAINT "titulos_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "titulos" ADD CONSTRAINT "titulos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "titulos_baixas" ADD CONSTRAINT "titulos_baixas_titulo_id_fkey" FOREIGN KEY ("titulo_id") REFERENCES "titulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "titulos_baixas" ADD CONSTRAINT "titulos_baixas_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
