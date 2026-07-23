-- AlterTable
ALTER TABLE "titulos" ADD COLUMN     "codigo" TEXT;

-- AlterTable
ALTER TABLE "titulos_baixas" ADD COLUMN     "valor_desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valor_juros" DECIMAL(10,2) NOT NULL DEFAULT 0;
