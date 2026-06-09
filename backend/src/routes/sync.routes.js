const { Router } = require('express');
const ctrl = require('../controllers/sync.controller');

const router = Router();

router.get('/pull',  ctrl.pull);
router.post('/push', ctrl.push);

module.exports = router;
