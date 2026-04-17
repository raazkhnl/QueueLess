/**
 * AppointmentType Model
 * Defines a bookable service with duration, price, mode, and custom fields.
 * Supports per-service custom operating hours that override branch defaults.
 */
const mongoose = require('mongoose');

const customFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['text','number','email','phone','select','textarea','date','file'], default: 'text' },
  required: { type: Boolean, default: false },
  options: [String],
  placeholder: { type: String },
}, { _id: true });

// Custom hours per service (overrides branch hours for this service)
const serviceHoursSchema = new mongoose.Schema({
  day: { type: Number, required: true, min: 0, max: 6 },
  isOpen: { type: Boolean, default: true },
  openTime: { type: String, default: '09:00' },
  closeTime: { type: String, default: '17:00' },
  breakStart: { type: String },
  breakEnd: { type: String },
}, { _id: false });

const appointmentTypeSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  name: { type: String, required: true, trim: true },
  slug: { type: String },
  description: { type: String },
  duration: { type: Number, required: true, default: 30 },
  bufferTime: { type: Number, default: 5 },
  price: { type: Number, default: 0 },
  mode: { type: String, enum: ['in_person', 'virtual', 'both'], default: 'in_person' },
  color: { type: String, default: '#2563eb' },
  icon: { type: String, default: 'calendar' },
  customFields: [customFieldSchema],
  maxBookingsPerSlot: { type: Number, default: 1 },
  requiresApproval: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false }, // Temporary suspension
  suspendReason: { type: String },
  sortOrder: { type: Number, default: 0 },
  // Custom operating hours (if empty, uses branch hours)
  useCustomHours: { type: Boolean, default: false },
  customHours: [serviceHoursSchema],
}, { timestamps: true });

appointmentTypeSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('AppointmentType', appointmentTypeSchema);
