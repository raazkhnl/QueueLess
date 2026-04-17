const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestEmail: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  staffRating: { type: Number, min: 1, max: 5 },
  waitTimeRating: { type: Number, min: 1, max: 5 },
  serviceRating: { type: Number, min: 1, max: 5 },
  isPublic: { type: Boolean, default: true },
  adminReply: { type: String },
  adminRepliedAt: { type: Date },
  adminRepliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

feedbackSchema.index({ appointment: 1 }, { unique: true });
feedbackSchema.index({ organization: 1, createdAt: -1 });
feedbackSchema.index({ branch: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
