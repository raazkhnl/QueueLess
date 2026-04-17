const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderType: { type: String, enum: ['citizen', 'staff', 'admin', 'system'], default: 'citizen' },
  senderName: { type: String }, // for guest messages
  content: { type: String, required: true, maxlength: 2000 },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ appointment: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
