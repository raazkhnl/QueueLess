const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  phone: { type: String },
  type: { type: String, enum: ['booking_confirmed', 'booking_cancelled', 'booking_reminder', 'booking_rescheduled', 'status_update', 'otp', 'welcome', 'custom'], required: true },
  channel: { type: String, enum: ['email', 'sms', 'push'], default: 'email' },
  subject: { type: String },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  sentAt: { type: Date },
  error: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
