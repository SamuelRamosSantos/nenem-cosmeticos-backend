-- AlterTable
ALTER TABLE "formas_pagamento" ADD COLUMN     "intervalo_dias" INTEGER,
ADD COLUMN     "juros_percentual_padrao" DECIMAL(5,2),
ADD COLUMN     "limite_parcelas" INTEGER,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'V';

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "forma_pagamento_taxas_forma_pagamento_id_modalidade_parcela_key" ON "forma_pagamento_taxas"("forma_pagamento_id", "modalidade", "parcelas");

-- AddForeignKey
ALTER TABLE "forma_pagamento_taxas" ADD CONSTRAINT "forma_pagamento_taxas_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
