const router = require('express').Router();
const ctrl = require('../controllers/auditLogController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('super_admin'), ctrl.getAll);

module.exports = router;
