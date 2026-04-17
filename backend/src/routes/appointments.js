const router = require('express').Router();
const ctrl = require('../controllers/appointmentController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');

router.get('/slots', ctrl.getSlots);
router.post('/book', optionalAuth, ctrl.book);
router.get('/my-contact', optionalAuth, ctrl.getMyByContact);
router.get('/ref/:refCode', ctrl.getByRefCode);
router.get('/ref/:refCode/pdf', ctrl.downloadPDFByRef);
router.get('/calendar', authenticate, authorize('super_admin','org_admin','branch_manager','staff'), ctrl.getCalendarEvents);
router.get('/analytics', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.getAnalytics);
router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id/status', authenticate, authorize('super_admin','org_admin','branch_manager','staff'), ctrl.updateStatus);
router.put('/:id/cancel', authenticate, ctrl.cancel);
router.put('/:id/reschedule', authenticate, ctrl.reschedule);
router.put('/:id/shift', authenticate, authorize('super_admin','org_admin','branch_manager','staff'), ctrl.shiftAppointment);
router.post('/bulk-shift', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.bulkShift);
router.post('/bulk-cancel', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.bulkCancel);
router.post('/bulk-reschedule', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.bulkReschedule);
router.get('/:id/pdf', ctrl.downloadPDF);
router.get('/:id/ical', ctrl.exportICal);

module.exports = router;
