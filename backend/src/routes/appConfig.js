const router = require('express').Router();
const ctrl = require('../controllers/appConfigController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', ctrl.get);
router.put('/', authenticate, authorize('super_admin'), ctrl.update);

module.exports = router;
