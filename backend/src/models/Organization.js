const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  nameNp: { type: String, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  logo: { type: String },
  website: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  addressNp: { type: String },
  category: { type: String, enum: ['government', 'healthcare', 'education', 'finance', 'salon', 'legal', 'other'], default: 'other' },
  branding: {
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#1e40af' },
    accentColor: { type: String, default: '#f59e0b' },
    fontFamily: { type: String, default: 'Inter' },
  },
  settings: {
    allowGuestBooking: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    maxAdvanceBookingDays: { type: Number, default: 30 },
    minAdvanceBookingHours: { type: Number, default: 1 },
    cancellationPolicyHours: { type: Number, default: 24 },
    timezone: { type: String, default: 'Asia/Kathmandu' },
    currency: { type: String, default: 'NPR' },
    smsEnabled: { type: Boolean, default: false },
    emailEnabled: { type: Boolean, default: true },
    reminderHoursBefore: { type: Number, default: 24 },
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  keywords: { type: [String], index: true },
}, { timestamps: true });

organizationSchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);
