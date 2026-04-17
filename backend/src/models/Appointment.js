/**
 * Appointment Model
 * Core booking record linking citizen→branch→service with scheduling.
 * refCode format: QL-{BRANCH_CODE}-{8CHAR} for easy identification.
 * Token number auto-increments per branch per day.
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const appointmentSchema = new mongoose.Schema({
  refCode: { type: String, unique: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  branchCode: { type: String }, // stored for refCode generation
  appointmentType: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentType', required: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestName: { type: String },
  guestEmail: { type: String },
  guestPhone: { type: String },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'pending'
  },
  mode: { type: String, enum: ['in_person', 'virtual'], default: 'in_person' },
  meetingLink: { type: String },
  customFieldValues: { type: Map, of: mongoose.Schema.Types.Mixed },
  price: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  tokenNumber: { type: Number },
  queuePosition: { type: Number },
  notes: { type: String },
  internalNotes: { type: String },
  cancellationReason: { type: String },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isGuest: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false },
  checkedInAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  roomNo: { type: String },
  roomNoNp: { type: String },
}, { timestamps: true });

appointmentSchema.index({ organization: 1, branch: 1, date: 1 });
appointmentSchema.index({ citizen: 1, date: 1 });
appointmentSchema.index({ assignedStaff: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// Generate refCode with branch code and token number
appointmentSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate ref code: QL-{BRANCHCODE}-{RANDOM}
    const bc = this.branchCode || 'XX';
    const ts = Date.now().toString(36).slice(-4).toUpperCase();
    const rand = uuidv4().slice(0, 6).toUpperCase();
    this.refCode = `QL-${bc}-${ts}${rand}`;
    
    // Auto-increment token per branch per day
    if (!this.tokenNumber) {
      const startOfDay = new Date(this.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(this.date);
      endOfDay.setHours(23, 59, 59, 999);
      const count = await mongoose.model('Appointment').countDocuments({
        branch: this.branch,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['cancelled'] }
      });
      this.tokenNumber = count + 1;
    }
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
