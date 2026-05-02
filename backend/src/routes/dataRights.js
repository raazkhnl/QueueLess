/**
 * Data-rights endpoints — portability + erasure.
 *
 * Portability: a citizen can download every record QueueLess holds about
 *   them as a single JSON document.
 * Erasure:    a citizen can request account deletion. We anonymise their
 *   personal fields rather than hard-deleting the docs (because they're
 *   referenced by appointments, payments, audit logs, etc.). The deactivated
 *   user's email/phone are released so they can re-register.
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Issue = require('../models/Issue');
const Feedback = require('../models/Feedback');
const Payment = require('../models/Payment');
const { authenticate } = require('../middleware/auth');

router.get('/export', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const me = await User.findById(userId).lean();
    const [appointments, issues, feedback, payments] = await Promise.all([
      Appointment.find({ $or: [{ citizen: userId }, { guestEmail: me.email }] }).lean(),
      Issue.find({ $or: [{ citizen: userId }, { guestEmail: me.email }] }).lean(),
      Feedback.find({ user: userId }).lean(),
      Payment.find({ citizen: userId }).lean(),
    ]);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="queueless-export-${Date.now()}.json"`);
    res.send(JSON.stringify({
      exportedAt: new Date().toISOString(),
      user: me,
      appointments, issues, feedback, payments,
    }, null, 2));
  } catch (err) { next(err); }
});

router.post('/erase', authenticate, async (req, res, next) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'ERASE') return res.status(400).json({ message: 'Pass { confirm: "ERASE" } to confirm' });

    const u = await User.findById(req.user._id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    const tag = `erased-${u._id.toString().slice(-6)}`;
    u.name = `Deleted user (${tag})`;
    u.email = `${tag}@erased.local`;
    u.phone = undefined;
    u.password = undefined;
    u.citizenshipNumber = undefined;
    u.nationalId = undefined;
    u.panNumber = undefined;
    u.dateOfBirth = undefined;
    u.address = undefined;
    u.avatar = undefined;
    u.bio = undefined;
    u.refreshToken = undefined;
    u.isActive = false;
    await u.save();

    // Also redact PII on appointment / issue records that reference them.
    await Appointment.updateMany({ citizen: u._id }, { $set: { guestName: 'Erased', guestEmail: '', guestPhone: '' } });
    await Issue.updateMany({ citizen: u._id }, { $set: { guestName: 'Erased', guestEmail: '', guestPhone: '' } });

    res.json({ success: true, message: 'Personal data redacted; records are retained anonymised for compliance.' });
  } catch (err) { next(err); }
});

module.exports = router;
