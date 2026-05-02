const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const svc = require('../services/paymentService');

// Citizen / staff create a payment intent → returns redirectUrl.
router.post('/intent', optionalAuth, async (req, res, next) => {
  try {
    const { amount, currency, description, provider, organization, appointment, issue } = req.body;
    const data = await svc.createIntent({
      amount, currency, description, provider, organization, appointment, issue,
      citizen: req.user?._id,
      recordedBy: req.user?._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

// Generic gateway callback — provider passed as :provider for routing.
router.post('/callback/:provider', async (req, res, next) => {
  try {
    const signature = req.headers['x-payment-signature'] || req.body?.signature;
    const payment = await svc.handleCallback({ provider: req.params.provider, payload: req.body, signature });
    res.json({ success: true, status: payment.status, refCode: payment.refCode });
  } catch (err) { next(err); }
});

// Staff records over-the-counter cash payment.
router.post('/cash', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const { amount, currency, description, organization, appointment, issue } = req.body;
    const orgId = organization || req.user.organization;
    const payment = await svc.recordCashPayment({ amount, currency, description, organization: orgId, appointment, issue, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: payment });
  } catch (err) { next(err); }
});

// Citizen lookup: payments for this user.
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const list = await Payment.find({ citizen: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: list.length, data: list });
  } catch (err) { next(err); }
});

// Admin / staff list with filters.
router.get('/', authenticate, authorize('super_admin', 'org_admin', 'branch_manager', 'staff'), async (req, res, next) => {
  try {
    const q = {};
    if (req.user.role !== 'super_admin' && req.user.organization) q.organization = req.user.organization;
    if (req.query.status) q.status = req.query.status;
    if (req.query.provider) q.provider = req.query.provider;
    const list = await Payment.find(q)
      .populate('appointment', 'refCode fileNumber')
      .populate('issue', 'refCode')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 100);
    res.json({ success: true, count: list.length, data: list });
  } catch (err) { next(err); }
});

router.get('/:refCode', authenticate, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ refCode: req.params.refCode })
      .populate('appointment', 'refCode fileNumber')
      .populate('issue', 'refCode')
      .populate('citizen', 'name email phone');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
});

module.exports = router;
