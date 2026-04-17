const router = require('express').Router();
const ctrl = require('../controllers/notificationTemplateController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('super_admin','org_admin'), ctrl.getAll);
router.get('/defaults', authenticate, ctrl.getDefaults);
router.post('/', authenticate, authorize('super_admin','org_admin'), ctrl.create);
router.put('/:id', authenticate, authorize('super_admin','org_admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('super_admin','org_admin'), ctrl.remove);

module.exports = router;
