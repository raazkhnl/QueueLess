/**
 * Tenant lifecycle endpoints — self-service onboarding, API token management,
 * super-admin review/activation, and logo upload.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const Organization = require('../models/Organization');
const User = require('../models/User');
const ApiToken = require('../models/ApiToken');
const { authenticate, authorize } = require('../middleware/auth');
const { honeypot } = require('../middleware/honeypot');

// Logo upload — small file, image only.
const logoDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, logoDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, `${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG / JPEG / SVG / WebP'));
  },
});

// ─── Public self-service onboarding ──────────────────
// Anyone can submit; record lands in 'pending_review' until super-admin verifies.
router.post('/onboard', honeypot, async (req, res, next) => {
  try {
    const { orgName, orgNameNp, slug, category, email, phone, address,
      adminName, adminEmail, adminPassword } = req.body;

    if (!orgName || !email || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'orgName, email, adminEmail, adminPassword are required' });
    }

    const existingOrg = await Organization.findOne({ $or: [{ slug }, { email }] });
    if (existingOrg) return res.status(409).json({ message: 'Organization already exists with that slug or email' });

    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) return res.status(409).json({ message: 'A user with that email already exists' });

    const org = await Organization.create({
      name: orgName, nameNp: orgNameNp, slug, category, email, phone, address,
      status: 'pending_review', isActive: false,
    });
    const admin = await User.create({
      name: adminName || orgName + ' Admin',
      email: adminEmail, password: adminPassword,
      role: 'org_admin', organization: org._id,
      isActive: false, isEmailVerified: false,
    });
    org.createdBy = admin._id;
    await org.save();

    res.status(201).json({
      success: true,
      message: 'Onboarding submitted. A super-admin will review and activate your organization.',
      data: { orgId: org._id, status: org.status },
    });
  } catch (err) { next(err); }
});

// ─── Super-admin review actions ──────────────────────
router.put('/:id/activate', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    org.status = 'active';
    org.isActive = true;
    org.verifiedAt = new Date();
    org.verifiedBy = req.user._id;
    await org.save();
    await User.updateMany({ organization: org._id, role: 'org_admin' }, { isActive: true });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

router.put('/:id/suspend', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const org = await Organization.findByIdAndUpdate(req.params.id, { status: 'suspended', isActive: false }, { new: true });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ success: true, data: org });
  } catch (err) { next(err); }
});

// ─── Logo upload ─────────────────────────────────────
router.put('/:id/logo', authenticate, authorize('super_admin', 'org_admin'), logoUpload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    if (req.user.role === 'org_admin' && String(req.user.organization) !== String(org._id)) {
      return res.status(403).json({ message: 'Cannot edit another organization' });
    }
    org.logo = `/uploads/logos/${req.file.filename}`;
    await org.save();
    res.json({ success: true, data: { logo: org.logo } });
  } catch (err) { next(err); }
});

// ─── API token CRUD ──────────────────────────────────
router.get('/:orgId/tokens', authenticate, authorize('super_admin', 'org_admin'), async (req, res, next) => {
  try {
    if (req.user.role === 'org_admin' && String(req.user.organization) !== String(req.params.orgId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const list = await ApiToken.find({ organization: req.params.orgId }).select('-hash').sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

router.post('/:orgId/tokens', authenticate, authorize('super_admin', 'org_admin'), async (req, res, next) => {
  try {
    if (req.user.role === 'org_admin' && String(req.user.organization) !== String(req.params.orgId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { name, scopes, expiresAt, rateLimitPerMinute } = req.body;
    if (!name) return res.status(400).json({ message: 'Token name required' });
    const { doc, token } = await ApiToken.mint({
      name, organization: req.params.orgId, scopes, expiresAt, rateLimitPerMinute,
      createdBy: req.user._id,
    });
    // Token is shown ONCE. Caller must save it.
    res.status(201).json({ success: true, data: { ...doc.toObject(), hash: undefined }, token });
  } catch (err) { next(err); }
});

router.delete('/tokens/:tokenId', authenticate, authorize('super_admin', 'org_admin'), async (req, res, next) => {
  try {
    const tk = await ApiToken.findById(req.params.tokenId);
    if (!tk) return res.status(404).json({ message: 'Token not found' });
    if (req.user.role === 'org_admin' && String(req.user.organization) !== String(tk.organization)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    tk.isActive = false;
    await tk.save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
