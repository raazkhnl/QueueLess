const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const attachmentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  url: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const commentSchema = new mongoose.Schema({
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String },
  isInternal: { type: Boolean, default: false },
  attachments: [attachmentSchema],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const historySchema = new mongoose.Schema({
  action: { type: String, required: true },
  fromStatus: String,
  toStatus: String,
  fromAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  stuckTimeSeconds: Number,
  reason: String,
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const ISSUE_STATUSES = ['open', 'in_progress', 'forwarded', 'escalated', 'awaiting_user', 'resolved', 'closed', 'reopened'];
const TERMINAL_STATUSES = ['resolved', 'closed'];

const issueSchema = new mongoose.Schema({
  refCode: { type: String, unique: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  issueType: { type: mongoose.Schema.Types.ObjectId, ref: 'IssueType', required: true },

  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestName: { type: String, trim: true },
  guestEmail: { type: String, trim: true, lowercase: true },
  guestPhone: { type: String, trim: true },

  subject: { type: String, trim: true },
  description: { type: String, required: true },
  remarks: { type: String },
  sourceChannel: { type: String, enum: ['portal', 'email', 'phone', 'in_person', 'external'], default: 'portal' },
  source: { type: String },

  status: { type: String, enum: ISSUE_STATUSES, default: 'open', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },

  currentAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  currentUnit: { type: String },

  slaStartTime: { type: Date, default: Date.now },
  slaDueDate: { type: Date },
  expectedResolutionTime: { type: Date },

  linkedAppointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
  linkedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],

  attachments: [attachmentSchema],
  comments: [commentSchema],
  history: [historySchema],

  // Multi-step approval chain (Junior → Senior → Office Chief).
  // Each step is approved or rejected by an officer at the configured rank.
  approvalChain: [{
    step: { type: Number, required: true },
    requiredRankLevel: { type: Number, default: 0 },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decision: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    note: { type: String },
    decidedAt: { type: Date },
  }],
  currentApprovalStep: { type: Number, default: 0 },

  resolutionNote: { type: String },
  resolvedAt: { type: Date },
  closedAt: { type: Date },
  reopenCount: { type: Number, default: 0 },

  // External integration (closed-loop with originating portals)
  externalSubmissionNo: { type: String, index: true },
  sourceSystem: { type: String },
  externalMetadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

issueSchema.index({ organization: 1, status: 1, createdAt: -1 });
issueSchema.index({ currentAssignee: 1, status: 1 });
issueSchema.index({ citizen: 1, createdAt: -1 });
issueSchema.index({ guestEmail: 1 });

issueSchema.pre('save', function(next) {
  if (this.isNew && !this.refCode) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
    this.refCode = `TKT-${ts}-${rand}`;
  }
  if (this.isNew && !this.slaDueDate && this.expectedResolutionTime) {
    this.slaDueDate = this.expectedResolutionTime;
  }
  if (this.isNew && this.slaDueDate && !this.expectedResolutionTime) {
    this.expectedResolutionTime = this.slaDueDate;
  }
  next();
});

issueSchema.statics.STATUSES = ISSUE_STATUSES;
issueSchema.statics.TERMINAL_STATUSES = TERMINAL_STATUSES;

module.exports = mongoose.model('Issue', issueSchema);
