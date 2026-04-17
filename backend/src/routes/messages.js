const router = require('express').Router();
const ctrl = require('../controllers/messageController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/appointment/:appointmentId', optionalAuth, ctrl.getByAppointment);
router.post('/', optionalAuth, ctrl.create);
router.put('/read/:appointmentId', optionalAuth, ctrl.markRead);

module.exports = router;
