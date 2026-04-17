const AuditLog = require('../models/AuditLog');

const logAction = async (req, { action, resource, resourceId, details, metadata } = {}) => {
  try {
    if (!req.user) return;
    await AuditLog.create({
      user: req.user._id,
      action, resource, resourceId,
      details, metadata,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']?.substring(0, 200),
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAction };
