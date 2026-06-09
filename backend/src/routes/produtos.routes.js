const { Router } = require('express');
const ctrl = require('../controllers/produtos.controller');
const kitCtrl = require('../controllers/produtoKitItens.controller');

const router = Router();

router.get('/',      ctrl.listar);
router.get('/:id',   ctrl.buscarPorId);
router.post('/',     ctrl.criar);
router.put('/:id',   ctrl.atualizar);
router.delete('/:id', ctrl.remover);

// Kit itens aninhados em produto
router.get('/:mestreId/kit-itens',       kitCtrl.listarPorMestre);
router.post('/kit-itens',                kitCtrl.adicionar);
router.put('/kit-itens/:id',             kitCtrl.atualizar);
router.delete('/kit-itens/:id',          kitCtrl.remover);

module.exports = router;
