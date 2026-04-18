const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  webhook: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true },
  event: { type: String, required: true },
  url: { type: String, required: true },
  requestBody: { type: String },
  responseStatus: { type: Number },
  responseBody: { type: String, maxlength: 2000 },
  error: { type: String },
  duration: { type: Number }, // ms
  success: { type: Boolean, default: false },
  deliveredAt: { type: Date, default: Date.now },
}, { timestamps: true });

webhookLogSchema.index({ webhook: 1, createdAt: -1 });
webhookLogSchema.index({ event: 1, createdAt: -1 });
// Auto-expire logs after 30 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
