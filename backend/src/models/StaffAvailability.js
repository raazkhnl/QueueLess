const mongoose = require('mongoose');

const staffAvailabilitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  // Recurring weekly schedule
  weeklySchedule: [{
    day: { type: Number, min: 0, max: 6 },
    isAvailable: { type: Boolean, default: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    breakStart: { type: String },
    breakEnd: { type: String },
    maxAppointments: { type: Number, default: 10 },
    _id: false,
  }],
  // Date-specific overrides (vacation, sick leave, etc.)
  dateOverrides: [{
    date: { type: Date, required: true },
    isAvailable: { type: Boolean, default: false },
    startTime: { type: String },
    endTime: { type: String },
    reason: { type: String },
    _id: false,
  }],
  // Recurring blockouts (e.g. every Monday 12-1 is meeting time)
  recurringBlockouts: [{
    day: { type: Number, min: 0, max: 6 },
    startTime: { type: String },
    endTime: { type: String },
    reason: { type: String },
    _id: false,
  }],
}, { timestamps: true });

staffAvailabilitySchema.index({ user: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('StaffAvailability', staffAvailabilitySchema);
