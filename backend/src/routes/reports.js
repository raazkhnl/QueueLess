const router = require('express').Router();
const ctrl = require('../controllers/reportsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/analytics', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.getAnalytics);
router.get('/export-excel', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.exportExcelReport);

module.exports = router;
