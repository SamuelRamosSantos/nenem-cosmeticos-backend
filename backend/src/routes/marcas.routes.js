const { Router } = require('express');
const ctrl = require('../controllers/marcas.controller');

const router = Router();

router.get('/',      ctrl.listar);
router.get('/:id',   ctrl.buscarPorId);
router.post('/',     ctrl.criar);
router.put('/:id',   ctrl.atualizar);
router.delete('/:id', ctrl.remover);

module.exports = router;
