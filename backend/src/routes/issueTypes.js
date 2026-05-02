const express = require('express');
const router = express.Router();
const IssueType = require('../models/IssueType');
const { authenticate, authorize } = require('../middleware/auth');

const PUBLIC_FIELDS = 'name nameNp slug description priority slaHours estimatedSLA requiresAppointment defaultBranch defaultUnit organization customFields requiredFields';

// @route   GET /api/issue-types/slug/:slug
// @desc    Resolve an issue type by slug (for external portal deep-links)
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const it = await IssueType.findOne({ slug: req.params.slug, isActive: true })
      .select(PUBLIC_FIELDS)
      .populate('organization', 'name nameNp slug branding')
      .populate('defaultBranch', 'name code');
    if (!it) return res.status(404).json({ success: false, message: 'Issue type not found' });
    res.json({ success: true, data: it });
  } catch (err) { next(err); }
});

// @route   GET /api/issue-types
// @desc    Public list of active types (optionally filtered by org)
router.get('/', async (req, res, next) => {
  try {
    const q = { isActive: true };
    if (req.query.organization) q.organization = req.query.organization;
    const issueTypes = await IssueType.find(q)
      .select(PUBLIC_FIELDS)
      .populate('organization', 'name nameNp slug')
      .populate('defaultBranch', 'name code')
      .sort({ name: 1 });
    res.json({ success: true, count: issueTypes.length, data: issueTypes });
  } catch (err) { next(err); }
});

// @route   GET /api/issue-types/admin
router.get('/admin', authenticate, authorize('super_admin', 'org_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const q = {};
    if (req.user.role !== 'super_admin' && req.user.organization) q.organization = req.user.organization;
    if (req.query.organization && req.user.role === 'super_admin') q.organization = req.query.organization;
    const issueTypes = await IssueType.find(q)
      .populate('organization', 'name nameNp slug')
      .populate('defaultBranch', 'name code')
      .sort({ name: 1 });
    res.json({ success: true, count: issueTypes.length, data: issueTypes });
  } catch (err) { next(err); }
});

// @route   POST /api/issue-types
router.post('/', authenticate, authorize('super_admin', 'org_admin'), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.user.role === 'org_admin' && req.user.organization) data.organization = req.user.organization;
    if (!data.organization) return res.status(400).json({ success: false, message: 'organization is required' });
    const issueType = await IssueType.create(data);
    res.status(201).json({ success: true, data: issueType });
  } catch (err) { next(err); }
});

// @route   PUT /api/issue-types/:id
router.put('/:id', authenticate, authorize('super_admin', 'org_admin'), async (req, res, next) => {
  try {
    const it = await IssueType.findById(req.params.id);
    if (!it) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'org_admin' && String(it.organization) !== String(req.user.organization)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const allowed = ['name', 'nameNp', 'description', 'priority', 'slaHours', 'estimatedSLA',
      'requiresAppointment', 'defaultBranch', 'defaultUnit', 'assignableTo', 'requiredFields',
      'customFields', 'attachmentConfig', 'isActive'];
    for (const k of allowed) if (k in req.body) it[k] = req.body[k];
    await it.save();
    res.json({ success: true, data: it });
  } catch (err) { next(err); }
});

// @route   DELETE /api/issue-types/:id (soft)
router.delete('/:id', authenticate, authorize('super_admin', 'org_admin'), async (req, res, next) => {
  try {
    const it = await IssueType.findById(req.params.id);
    if (!it) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'org_admin' && String(it.organization) !== String(req.user.organization)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    it.isActive = false;
    await it.save();
    res.json({ success: true, data: it });
  } catch (err) { next(err); }
});

module.exports = router;
