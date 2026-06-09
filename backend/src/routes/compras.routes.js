const { Router } = require('express');
const ctrl = require('../controllers/compras.controller');

const router = Router();

router.get('/',                   ctrl.listar);
router.get('/:id',                ctrl.buscarPorId);
router.post('/',                  ctrl.criar);
router.post('/:id/itens',         ctrl.adicionarItem);
router.patch('/:id/finalizar',    ctrl.finalizar);
router.patch('/:id/cancelar',     ctrl.cancelar);

module.exports = router;
