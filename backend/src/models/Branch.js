const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  day: { type: Number, required: true, min: 0, max: 6 }, // 0=Sun, 6=Sat
  isOpen: { type: Boolean, default: true },
  openTime: { type: String, default: '09:00' },
  closeTime: { type: String, default: '17:00' },
  breakStart: { type: String },
  breakEnd: { type: String },
}, { _id: false });

const holidaySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  name: { type: String, required: true },
  isRecurring: { type: Boolean, default: false },
}, { _id: false });

const dateOverrideSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  isOpen: { type: Boolean, default: false },
  openTime: { type: String },
  closeTime: { type: String },
  reason: { type: String },
}, { _id: false });

const branchSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true },
  description: { type: String },
  address: { type: String, required: true },
  province: { type: String },
  district: { type: String },
  city: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [85.3240, 27.7172] }, // [lng, lat] Kathmandu default
  },
  phone: { type: String },
  email: { type: String },
  workingHours: { type: [workingHoursSchema], default: () => [
    { day: 0, isOpen: true, openTime: '10:00', closeTime: '16:00' },
    { day: 1, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 2, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 3, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 4, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 5, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { day: 6, isOpen: false, openTime: '09:00', closeTime: '13:00' },
  ]},
  holidays: [holidaySchema],
  dateOverrides: [dateOverrideSchema],
  maxConcurrentBookings: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
  managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

branchSchema.index({ location: '2dsphere' });
branchSchema.index({ organization: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
