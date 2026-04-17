const router = require('express').Router();
const ctrl = require('../controllers/staffAvailabilityController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/staff/:userId', authenticate, authorize('super_admin','org_admin','branch_manager','staff'), ctrl.getByStaff);
router.put('/staff/:userId', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.upsert);
router.post('/staff/:userId/override', authenticate, authorize('super_admin','org_admin','branch_manager','staff'), ctrl.addDateOverride);
router.delete('/staff/:userId/override/:date', authenticate, authorize('super_admin','org_admin','branch_manager','staff'), ctrl.removeDateOverride);
router.get('/branch/:branchId', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.getByBranch);

module.exports = router;
