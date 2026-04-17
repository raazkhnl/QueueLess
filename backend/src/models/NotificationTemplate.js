const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  type: { type: String, required: true, enum: [
    'booking_confirmed', 'booking_cancelled', 'booking_reminder',
    'booking_rescheduled', 'otp', 'welcome', 'feedback_request'
  ]},
  channel: { type: String, enum: ['email', 'sms'], default: 'email' },
  subject: { type: String, required: true },
  bodyTemplate: { type: String, required: true },
  // Template variables: {{name}}, {{refCode}}, {{date}}, {{time}}, {{service}}, {{branch}}, {{token}}, {{orgName}}
  isActive: { type: Boolean, default: true },
  language: { type: String, enum: ['en', 'ne'], default: 'en' },
}, { timestamps: true });

notificationTemplateSchema.index({ organization: 1, type: 1, channel: 1, language: 1 });

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
