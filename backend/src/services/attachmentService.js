const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/issues');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration (Local storage logic to be pluggable later)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter (images and docs typically)
const fileFilter = (req, file, cb) => {
  const allowedMime = [
    'image/jpeg', 'image/png', 'application/pdf', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and DOCX are allowed.'), false);
  }
};

// Return configured multer instance
// Max 5MB default
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

/**
 * Normalizes uploaded files for storing in Issue model's attachments array
 */
const prepareAttachmentData = (reqFiles) => {
  if (!reqFiles || reqFiles.length === 0) return [];
  return reqFiles.map(file => ({
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/issues/${file.filename}` // Local static path
  }));
};

module.exports = {
  upload,
  prepareAttachmentData
};
