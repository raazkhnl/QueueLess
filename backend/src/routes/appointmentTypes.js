const router = require('express').Router();
const ctrl = require('../controllers/appointmentTypeController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/public/org/:orgId', ctrl.getPublicByOrg);
router.get('/', authenticate, authorize('super_admin','org_admin','branch_manager','staff'), ctrl.getAll);
router.post('/', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.update);
router.put('/:id/toggle-suspend', authenticate, authorize('super_admin','org_admin'), ctrl.toggleSuspend);
router.delete('/:id', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.remove);

module.exports = router;
