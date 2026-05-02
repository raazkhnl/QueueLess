/**
 * Payment record. Provider-agnostic: the same shape covers eSewa, Khalti,
 * IME Pay, ConnectIPS, cash, and bank transfer. Provider-specific data lives
 * in `providerRef` and `providerPayload`.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const paymentSchema = new mongoose.Schema({
  refCode: { type: String, unique: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', index: true },
  issue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NPR' },
  description: { type: String },

  provider: { type: String, enum: ['esewa', 'khalti', 'imepay', 'connectips', 'cash', 'bank_transfer', 'manual'], required: true },
  providerRef: { type: String, index: true },        // gateway transaction id
  providerPayload: { type: mongoose.Schema.Types.Mixed },

  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], default: 'pending', index: true },
  paidAt: { type: Date },
  failedReason: { type: String },

  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // staff who logged a cash payment
  receiptNumber: { type: String, index: true },                         // gov-style रसीद नं.
  fiscalYearBs: { type: String },
}, { timestamps: true });

paymentSchema.index({ organization: 1, status: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, providerRef: 1 }, { unique: true, sparse: true });

paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.refCode) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.refCode = `PAY-${ts}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
