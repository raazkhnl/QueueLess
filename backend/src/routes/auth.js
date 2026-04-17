const router = require('express').Router();
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/register', validate(schemas.register), auth.register);
router.post('/login', validate(schemas.login), auth.login);
router.post('/otp/request', auth.requestOTP);
router.post('/otp/verify', auth.verifyOTP);
router.get('/me', authenticate, auth.getMe);
router.put('/profile', authenticate, auth.updateProfile);
router.put('/change-password', authenticate, auth.changePassword);

module.exports = router;
