-- AlterTable
-- NC-63: blinda a base contra novas duplicidades de código de barras.
-- Pré-requisito (NC-62): duplicados existentes já foram higienizados
-- manualmente antes desta migration (ver histórico de estoque_movimentacoes
-- 'ajuste_positivo'/'ajuste_negativo' geradas na correção).
CREATE UNIQUE INDEX "produtos_cod_barras_key" ON "produtos"("cod_barras");
