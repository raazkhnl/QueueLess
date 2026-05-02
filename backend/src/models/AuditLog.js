const mongoose = require('mongoose');
const crypto = require('crypto');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, enum: [
    'create', 'update', 'delete', 'login', 'logout', 'approve', 'cancel',
    'reschedule', 'check_in', 'complete', 'bulk_upload', 'export',
    'settings_update', 'status_change', 'assign_staff', 'forward', 'link', 'reopen',
    'impersonate', 'erase', 'token_mint', 'tenant_activate', 'tenant_suspend'
  ]},
  resource: { type: String, required: true, enum: [
    'user', 'organization', 'branch', 'appointment_type', 'appointment',
    'feedback', 'settings', 'notification', 'bulk', 'issue', 'issue_type',
    'payment', 'api_token', 'tenant'
  ]},
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },

  // Tamper-evident hash chain: each row stores the SHA-256 of its own canonical
  // payload concatenated with the previous row's hash. Verification compares
  // the recomputed chain to the stored hashes; any mutation breaks the chain.
  prevHash: { type: String, default: '' },
  hash: { type: String },
}, { timestamps: true });

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1, createdAt: -1 });

function canonicalize(doc) {
  return JSON.stringify({
    user: String(doc.user || ''),
    action: doc.action,
    resource: doc.resource,
    resourceId: String(doc.resourceId || ''),
    details: doc.details || '',
    metadata: doc.metadata || null,
    ipAddress: doc.ipAddress || '',
    createdAt: doc.createdAt,
    prevHash: doc.prevHash || '',
  });
}

auditLogSchema.pre('save', async function preHashChain(next) {
  if (this.isNew) {
    if (!this.createdAt) this.createdAt = new Date();
    if (this.prevHash === '' || this.prevHash == null) {
      const last = await mongoose.model('AuditLog').findOne().sort({ createdAt: -1 }).select('hash');
      this.prevHash = last?.hash || '';
    }
    this.hash = crypto.createHash('sha256').update(canonicalize(this.toObject())).digest('hex');
  }
  next();
});

auditLogSchema.statics.verifyChain = async function verifyChain(limit = 1000) {
  const rows = await this.find().sort({ createdAt: 1 }).limit(limit);
  let prev = '';
  for (const r of rows) {
    if (r.prevHash !== prev) return { ok: false, brokenAt: r._id, reason: 'prevHash mismatch' };
    const recomputed = crypto.createHash('sha256').update(canonicalize(r.toObject())).digest('hex');
    if (recomputed !== r.hash) return { ok: false, brokenAt: r._id, reason: 'hash mismatch' };
    prev = r.hash;
  }
  return { ok: true, verified: rows.length };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
