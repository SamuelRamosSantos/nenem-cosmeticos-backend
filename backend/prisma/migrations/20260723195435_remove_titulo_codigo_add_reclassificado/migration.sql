-- Abandona o "número do título" (codigo) — passa a exibir só parcela/total.
ALTER TABLE "titulos" DROP COLUMN "codigo";

-- Marca títulos cuja forma de pagamento foi alterada num estorno (ver estornarBaixa).
ALTER TABLE "titulos" ADD COLUMN "reclassificado" BOOLEAN NOT NULL DEFAULT false;
