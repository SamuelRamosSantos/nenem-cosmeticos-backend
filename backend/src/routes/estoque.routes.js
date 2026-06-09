const { Router } = require('express');
const ctrl = require('../controllers/estoqueMovimentacoes.controller');

const router = Router();

router.get('/',        ctrl.listar);
router.get('/:id',     ctrl.buscarPorId);
router.post('/ajuste', ctrl.criarAjuste);

module.exports = router;
