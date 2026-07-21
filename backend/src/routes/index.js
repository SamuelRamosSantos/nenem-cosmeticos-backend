const { Router } = require('express');
const autenticar = require('../middlewares/auth.middleware');

const authRoutes              = require('./auth.routes');
const usuariosRoutes          = require('./usuarios.routes');
const pessoasRoutes           = require('./pessoas.routes');
const marcasRoutes            = require('./marcas.routes');
const formasPagamentoRoutes   = require('./formasPagamento.routes');
const produtosRoutes          = require('./produtos.routes');
const estoqueRoutes           = require('./estoque.routes');
const vendasRoutes            = require('./vendas.routes');
const comprasRoutes           = require('./compras.routes');
const syncRoutes              = require('./sync.routes');

const router = Router();

// Só o login fica público — todo o resto exige JWT, incluindo /sync
// (o app sempre tem um token salvo depois do login; ver NC-67/68/69).
router.use('/auth', authRoutes);

router.use('/sync',             autenticar, syncRoutes);
router.use('/usuarios',         autenticar, usuariosRoutes);
router.use('/pessoas',          autenticar, pessoasRoutes);
router.use('/marcas',           autenticar, marcasRoutes);
router.use('/formas-pagamento', autenticar, formasPagamentoRoutes);
router.use('/produtos',         autenticar, produtosRoutes);
router.use('/estoque',          autenticar, estoqueRoutes);
router.use('/vendas',           autenticar, vendasRoutes);
router.use('/compras',          autenticar, comprasRoutes);

module.exports = router;
