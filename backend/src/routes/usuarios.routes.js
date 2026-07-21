const { Router } = require('express');
const ctrl = require('../controllers/usuarios.controller');

const router = Router();

router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);

module.exports = router;
