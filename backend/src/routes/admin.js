const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx','.xls','.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Only Excel/CSV files allowed'));
  }
});

router.get('/dashboard', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.getDashboardStats);
router.get('/users', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.getUsers);
router.post('/users', authenticate, authorize('super_admin','org_admin'), ctrl.createUser);
router.put('/users/:id', authenticate, authorize('super_admin','org_admin'), ctrl.updateUser);
router.delete('/users/:id', authenticate, authorize('super_admin','org_admin'), ctrl.deleteUser);
router.post('/upload-excel', authenticate, authorize('super_admin','org_admin'), upload.single('file'), ctrl.uploadExcel);
router.get('/sample-excel/:type', authenticate, ctrl.downloadSampleExcel);
router.get('/export-csv', authenticate, authorize('super_admin','org_admin','branch_manager'), ctrl.exportCSV);

module.exports = router;
