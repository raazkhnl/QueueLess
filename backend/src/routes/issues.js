const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const issueService = require('../services/issueService');
const { upload, prepareAttachmentData } = require('../services/attachmentService');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { honeypot } = require('../middleware/honeypot');

const POPULATE = [
  { path: 'issueType', select: 'name nameNp slaHours estimatedSLA priority requiresAppointment' },
  { path: 'organization', select: 'name nameNp slug branding' },
  { path: 'branch', select: 'name nameNp code' },
  { path: 'currentAssignee', select: 'name email role' },
  { path: 'citizen', select: 'name email phone' },
  { path: 'linkedAppointments', select: 'refCode date startTime endTime status' },
  { path: 'comments.author', select: 'name role' },
  { path: 'history.actor', select: 'name role' },
  { path: 'history.toAssignee', select: 'name role' },
  { path: 'history.fromAssignee', select: 'name role' },
];

const sanitizeForCitizen = (issueObj) => {
  if (!issueObj) return issueObj;
  const obj = issueObj.toObject ? issueObj.toObject() : issueObj;
  if (Array.isArray(obj.comments)) obj.comments = obj.comments.filter((c) => !c.isInternal);
  if (Array.isArray(obj.history)) obj.history = obj.history.filter((h) => h.action !== 'internal_note');
  return obj;
};

// ─── Public submission ────────────────────────────────
router.post('/', upload.array('attachments', 5), honeypot, optionalAuth, async (req, res, next) => {
  try {
    const data = { ...req.body };
    data.attachments = prepareAttachmentData(req.files);
    const issue = await issueService.createIssue(data, req.user || null);
    const populated = await Issue.findById(issue._id).populate(POPULATE);
    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
});

// ─── Public tracking by ref code ──────────────────────
router.get('/track/:refCode', optionalAuth, async (req, res, next) => {
  try {
    const issue = await Issue.findOne({ refCode: req.params.refCode }).populate(POPULATE);
    if (!issue) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const isOwner = req.user && issue.citizen && String(issue.citizen._id || issue.citizen) === String(req.user._id);
    const isStaff = req.user && req.user.role !== 'citizen';
    const data = (isStaff || isOwner) ? issue.toObject() : sanitizeForCitizen(issue);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ─── My tickets (citizen) ─────────────────────────────
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const filter = { $or: [{ citizen: req.user._id }] };
    if (req.user.email) filter.$or.push({ guestEmail: req.user.email.toLowerCase() });
    const issues = await Issue.find(filter)
      .populate('issueType', 'name nameNp')
      .populate('organization', 'name nameNp slug')
      .populate('branch', 'name nameNp')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: issues.length, data: issues });
  } catch (err) { next(err); }
});

// ─── Admin/staff list ─────────────────────────────────
router.get('/', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const { status, priority, branch, organization, issueType, search, assignee, page = 1, limit = 50 } = req.query;
    const q = {};

    if (req.user.role === 'org_admin' && req.user.organization) q.organization = req.user.organization;
    if (['branch_manager', 'staff'].includes(req.user.role)) {
      if (req.user.organization) q.organization = req.user.organization;
      if (req.user.role === 'branch_manager' && req.user.branch) q.branch = req.user.branch;
      if (req.user.role === 'staff') {
        q.$or = [{ branch: req.user.branch }, { currentAssignee: req.user._id }];
      }
    }
    if (organization && req.user.role === 'super_admin') q.organization = organization;
    if (status) q.status = status;
    if (priority) q.priority = priority;
    if (branch) q.branch = branch;
    if (issueType) q.issueType = issueType;
    if (assignee) q.currentAssignee = assignee;

    if (search) {
      const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const orClauses = [{ refCode: re }, { description: re }, { subject: re }, { guestName: re }, { guestEmail: re }];
      q.$and = (q.$and || []).concat([{ $or: orClauses }]);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [issues, total] = await Promise.all([
      Issue.find(q).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Issue.countDocuments(q)
    ]);
    res.json({ success: true, count: issues.length, total, page: Number(page), data: issues });
  } catch (err) { next(err); }
});

// ─── Detail ──────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id).populate(POPULATE);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (!issueService.canViewIssue(issue, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const isStaff = req.user && req.user.role !== 'citizen';
    res.json({ success: true, data: isStaff ? issue.toObject() : sanitizeForCitizen(issue) });
  } catch (err) { next(err); }
});

// ─── Status update ───────────────────────────────────
router.put('/:id/status', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const issue = await issueService.updateStatus(req.params.id, status, req.user, reason);
    const populated = await Issue.findById(issue._id).populate(POPULATE);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
});

// ─── Forward ─────────────────────────────────────────
router.put('/:id/forward', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const issue = await issueService.forwardIssue(req.params.id, req.body, req.user);
    const populated = await Issue.findById(issue._id).populate(POPULATE);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
});

// ─── Assign ──────────────────────────────────────────
router.put('/:id/assign', authenticate, authorize('super_admin', 'org_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { assignee, reason } = req.body;
    const issue = await issueService.assignIssue(req.params.id, assignee, req.user, reason);
    const populated = await Issue.findById(issue._id).populate(POPULATE);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
});

// ─── Reopen (citizen or staff) ───────────────────────
router.put('/:id/reopen', authenticate, async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const isOwner = issue.citizen && String(issue.citizen) === String(req.user._id);
    const isStaff = req.user.role !== 'citizen';
    if (!isOwner && !isStaff) return res.status(403).json({ success: false, message: 'Not allowed' });
    if (!Issue.TERMINAL_STATUSES.includes(issue.status)) {
      return res.status(400).json({ success: false, message: 'Only resolved/closed tickets can be reopened' });
    }

    const updated = await issueService.reopenIssue(req.params.id, req.user, req.body.reason);
    const populated = await Issue.findById(updated._id).populate(POPULATE);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
});

// ─── Comments ────────────────────────────────────────
router.post('/:id/comments', authenticate, upload.array('attachments', 3), async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (!issueService.canViewIssue(issue, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const attachments = prepareAttachmentData(req.files);
    const updated = await issueService.addComment(req.params.id, {
      body: req.body.body,
      isInternal: req.body.isInternal === 'true' || req.body.isInternal === true,
      attachments
    }, req.user);
    const populated = await Issue.findById(updated._id).populate(POPULATE);
    const isStaff = req.user.role !== 'citizen';
    res.json({ success: true, data: isStaff ? populated.toObject() : sanitizeForCitizen(populated) });
  } catch (err) { next(err); }
});

// ─── Bulk actions ────────────────────────────────────
router.post('/bulk/status', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const { ids, status, reason } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids[] required' });
    const results = [];
    for (const id of ids) {
      try {
        const issue = await issueService.updateStatus(id, status, req.user, reason);
        results.push({ id, ok: true, status: issue.status });
      } catch (err) { results.push({ id, ok: false, error: err.message }); }
    }
    res.json({ success: true, count: results.length, results });
  } catch (err) { next(err); }
});

router.post('/bulk/assign', authenticate, authorize('super_admin', 'org_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { ids, assignee, reason } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids[] required' });
    const results = [];
    for (const id of ids) {
      try {
        await issueService.assignIssue(id, assignee, req.user, reason);
        results.push({ id, ok: true });
      } catch (err) { results.push({ id, ok: false, error: err.message }); }
    }
    res.json({ success: true, count: results.length, results });
  } catch (err) { next(err); }
});

router.post('/bulk/forward', authenticate, authorize('super_admin', 'org_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { ids, toAssignee, toBranch, toUnit, reason } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ids[] required' });
    const results = [];
    for (const id of ids) {
      try {
        await issueService.forwardIssue(id, { toAssignee, toBranch, toUnit, reason }, req.user);
        results.push({ id, ok: true });
      } catch (err) { results.push({ id, ok: false, error: err.message }); }
    }
    res.json({ success: true, count: results.length, results });
  } catch (err) { next(err); }
});

// ─── Aggregate stats for charts ──────────────────────
router.get('/stats/summary', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const match = {};
    if (req.user.role === 'org_admin' && req.user.organization) match.organization = req.user.organization;
    if (req.user.role === 'branch_manager' && req.user.branch) match.branch = req.user.branch;

    const Issue = require('../models/Issue');
    const dayAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [byStatus, byPriority, byDay, byCategory] = await Promise.all([
      Issue.aggregate([{ $match: match }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Issue.aggregate([{ $match: match }, { $group: { _id: '$priority', n: { $sum: 1 } } }]),
      Issue.aggregate([
        { $match: { ...match, createdAt: { $gte: dayAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Issue.aggregate([
        { $match: match },
        { $lookup: { from: 'issuetypes', localField: 'issueType', foreignField: '_id', as: 'type' } },
        { $unwind: { path: '$type', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$type.name', n: { $sum: 1 } } },
        { $sort: { n: -1 } }, { $limit: 10 },
      ]),
    ]);

    res.json({
      byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.n])),
      byPriority: Object.fromEntries(byPriority.map((b) => [b._id, b.n])),
      byDay,
      byCategory: byCategory.map((b) => ({ name: b._id || 'Uncategorised', count: b.n })),
    });
  } catch (err) { next(err); }
});

// ─── Approval chain ──────────────────────────────────
router.post('/:id/approval-chain', authenticate, authorize('super_admin', 'org_admin', 'branch_manager'), async (req, res, next) => {
  try {
    const { steps } = req.body;
    const updated = await issueService.startApprovalChain(req.params.id, steps, req.user);
    const populated = await Issue.findById(updated._id).populate(POPULATE);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
});

router.put('/:id/approval-chain/decide', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const updated = await issueService.decideApprovalStep(req.params.id, req.body, req.user);
    const populated = await Issue.findById(updated._id).populate(POPULATE);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
});

// ─── Add attachments to existing ticket ──────────────
router.post('/:id/attachments', authenticate, upload.array('attachments', 5), async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (!issueService.canViewIssue(issue, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const attachments = prepareAttachmentData(req.files);
    const updated = await issueService.addAttachments(req.params.id, attachments, req.user);
    const populated = await Issue.findById(updated._id).populate(POPULATE);
    res.json({ success: true, data: populated });
  } catch (err) { next(err); }
});

module.exports = router;
