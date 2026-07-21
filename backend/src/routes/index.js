const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');

const authRoutes              = require('./auth.routes');
const pessoasRoutes           = require('./pessoas.routes');
const marcasRoutes            = require('./marcas.routes');
const formasPagamentoRoutes   = require('./formasPagamento.routes');
const produtosRoutes          = require('./produtos.routes');
const estoqueRoutes           = require('./estoque.routes');
const vendasRoutes            = require('./vendas.routes');
const comprasRoutes           = require('./compras.routes');
const syncRoutes              = require('./sync.routes');

const router = Router();

// Público — login (NC-67) e sync (o app mobile ainda não envia token; ver NC-68/69)
router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);

// Protegidas por JWT — uso administrativo/externo (não fazem parte do fluxo
// de escrita do app, que é sempre local-first; ver SKILL 1 do projeto)
router.use('/pessoas',          autenticar, pessoasRoutes);
router.use('/marcas',           autenticar, marcasRoutes);
router.use('/formas-pagamento', autenticar, formasPagamentoRoutes);
router.use('/produtos',         autenticar, produtosRoutes);
router.use('/estoque',          autenticar, estoqueRoutes);
router.use('/vendas',           autenticar, vendasRoutes);
router.use('/compras',          autenticar, comprasRoutes);

module.exports = router;
