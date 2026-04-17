const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, enum: [
    'create', 'update', 'delete', 'login', 'logout', 'approve', 'cancel',
    'reschedule', 'check_in', 'complete', 'bulk_upload', 'export',
    'settings_update', 'status_change', 'assign_staff'
  ]},
  resource: { type: String, required: true, enum: [
    'user', 'organization', 'branch', 'appointment_type', 'appointment',
    'feedback', 'settings', 'notification', 'bulk'
  ]},
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
