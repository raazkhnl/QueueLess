const router = require('express').Router();
const ctrl = require('../controllers/branchController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/public/org/:orgId', ctrl.getPublicByOrg);
router.get('/code/:orgSlug/:code', ctrl.getByCode);
router.get('/nearest', ctrl.findNearest);
router.get('/', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.getAll);
router.post('/', authenticate, authorize('super_admin','org_admin'), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.update);
router.delete('/:id', authenticate, authorize('super_admin','org_admin'), ctrl.remove);
router.post('/:id/holidays', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.addHoliday);
router.delete('/:id/holidays/:holidayDate', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.removeHoliday);
router.put('/:id/working-hours', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.updateWorkingHours);

module.exports = router;
