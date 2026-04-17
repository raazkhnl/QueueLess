const router = require('express').Router();
const ctrl = require('../controllers/feedbackController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/', optionalAuth, validate(schemas.feedback), ctrl.create);
router.get('/appointment/:appointmentId', ctrl.getByAppointment);
router.get('/org/:orgId', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.getByOrg);
router.put('/:id/reply', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.adminReply);
router.delete('/:id', authenticate, authorize('super_admin','org_admin'), ctrl.remove);

module.exports = router;
