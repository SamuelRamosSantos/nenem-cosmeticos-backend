-- CreateTable
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "titulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titulos_baixas" (
    "id" TEXT NOT NULL,
    "titulo_id" TEXT NOT NULL,
    "forma_pagamento_id" TEXT NOT NULL,
    "valor_pago" DECIMAL(10,2) NOT NULL,
    "data_baixa" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "titulos_baixas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos" ADD CONSTRAINT "titulos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos_baixas" ADD CONSTRAINT "titulos_baixas_titulo_id_fkey" FOREIGN KEY ("titulo_id") REFERENCES "titulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "titulos_baixas" ADD CONSTRAINT "titulos_baixas_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
