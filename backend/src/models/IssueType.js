const mongoose = require('mongoose');

const issueTypeSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, trim: true },
  nameNp: { type: String, trim: true },
  slug: { type: String, lowercase: true, trim: true, index: true },
  description: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  slaHours: { type: Number, default: 48 },
  estimatedSLA: { type: Number },
  requiresAppointment: { type: Boolean, default: false },
  defaultBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  defaultUnit: { type: String },
  assignableTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  routingRules: { type: mongoose.Schema.Types.Mixed },
  requiredFields: [{ type: String }],
  customFields: [{
    name: String,
    label: String,
    type: { type: String, enum: ['text', 'number', 'date', 'boolean', 'textarea'] },
    required: Boolean
  }],
  attachmentConfig: {
    allowUploads: { type: Boolean, default: true },
    maxFiles: { type: Number, default: 5 },
    maxSizeMB: { type: Number, default: 5 }
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

issueTypeSchema.index({ organization: 1, isActive: 1 });

issueTypeSchema.pre('save', function(next) {
  if (this.isModified('estimatedSLA') && this.estimatedSLA && !this.isModified('slaHours')) {
    this.slaHours = this.estimatedSLA;
  }
  if (!this.estimatedSLA && this.slaHours) this.estimatedSLA = this.slaHours;
  if (!this.slug && this.name) {
    this.slug = String(this.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  }
  next();
});

module.exports = mongoose.model('IssueType', issueTypeSchema);
