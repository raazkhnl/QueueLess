const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  secret: { type: String },
  events: [{ type: String, enum: [
    'appointment.created', 'appointment.confirmed', 'appointment.cancelled',
    'appointment.completed', 'appointment.rescheduled', 'appointment.checked_in',
    'feedback.created', 'user.created'
  ]}],
  isActive: { type: Boolean, default: true },
  lastTriggered: { type: Date },
  lastStatus: { type: Number },
  failCount: { type: Number, default: 0 },
  headers: { type: Map, of: String },
}, { timestamps: true });

module.exports = mongoose.model('Webhook', webhookSchema);
