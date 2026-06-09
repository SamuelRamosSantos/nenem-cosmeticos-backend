const { Router } = require('express');

const pessoasRoutes          = require('./pessoas.routes');
const marcasRoutes           = require('./marcas.routes');
const formasPagamentoRoutes  = require('./formasPagamento.routes');
const produtosRoutes         = require('./produtos.routes');
const estoqueRoutes          = require('./estoque.routes');
const vendasRoutes           = require('./vendas.routes');
const comprasRoutes          = require('./compras.routes');
const syncRoutes             = require('./sync.routes');

const router = Router();

router.use('/sync',             syncRoutes);
router.use('/pessoas',          pessoasRoutes);
router.use('/marcas',           marcasRoutes);
router.use('/formas-pagamento', formasPagamentoRoutes);
router.use('/produtos',         produtosRoutes);
router.use('/estoque',          estoqueRoutes);
router.use('/vendas',           vendasRoutes);
router.use('/compras',          comprasRoutes);

module.exports = router;
