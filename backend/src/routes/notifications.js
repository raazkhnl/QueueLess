const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('super_admin','org_admin'), ctrl.getAll);
router.get('/stats', authenticate, authorize('super_admin','org_admin'), ctrl.getStats);
router.post('/send', authenticate, authorize('super_admin','org_admin'), ctrl.sendCustom);

module.exports = router;
