const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const autenticar = require('../middlewares/auth.middleware');

const router = Router();

router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', autenticar, ctrl.me);

module.exports = router;
