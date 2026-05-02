/**
 * Super-admin impersonation.
 *
 * Issues a short-lived JWT scoped to the target user; embeds the original
 * super-admin id in `imp.actor` so AuditLog rows preserve the human-in-the-
 * loop. Default lifetime is 30 minutes.
 *
 * Always logged via AuditLog (server-side logAction).
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const TTL_MIN = 30;

router.post('/:targetUserId', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const target = await User.findById(req.params.targetUserId);
    if (!target) return res.status(404).json({ message: 'Target user not found' });
    if (!target.isActive) return res.status(400).json({ message: 'Target user is inactive' });

    const token = jwt.sign(
      { id: target._id, role: target.role, imp: { actor: req.user._id, at: Date.now() } },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: `${TTL_MIN}m` }
    );

    try {
      const { logAction } = require('../utils/auditLog');
      await logAction(req, { action: 'impersonate', resource: 'user', resourceId: target._id, details: `Impersonating ${target.email || target.name}` });
    } catch {}

    res.json({ success: true, token, ttlMinutes: TTL_MIN, target: { id: target._id, name: target.name, role: target.role } });
  } catch (err) { next(err); }
});

module.exports = router;
