const router = require('express').Router();
const ctrl = require('../controllers/organizationController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/public', ctrl.getPublicList);
router.get('/slug/:slug', ctrl.getBySlug);
router.get('/', authenticate, authorize('super_admin','org_admin'), ctrl.getAll);
router.post('/', authenticate, authorize('super_admin'), ctrl.create);
router.get('/:id', authenticate, authorize('super_admin','org_admin'), ctrl.getById);
router.put('/:id', authenticate, authorize('super_admin','org_admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('super_admin'), ctrl.remove);

module.exports = router;
