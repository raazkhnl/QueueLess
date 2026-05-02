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
  roomNoNp: { type: String },
  externalSubmissionNo: { type: String, index: true },
  sourceSystem: { type: String },
  sourceChannel: { type: String, enum: ['portal', 'in_person', 'phone', 'external'], default: 'portal' },
  linkedIssues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],

  // Government file routing — दर्ता/चलानी number, scoped per branch+fiscal-year and exposed
  // to citizens as the human-friendly tracking handle.
  fileNumber: { type: String, index: true },
  fiscalYearBs: { type: String },
}, { timestamps: true });

appointmentSchema.index({ branchCode: 1 });
appointmentSchema.index({ organization: 1, branch: 1, date: 1 });
appointmentSchema.index({ branch: 1, date: 1 }); // Essential for performant token number generation
appointmentSchema.index({ citizen: 1, date: 1 });
appointmentSchema.index({ assignedStaff: 1, date: 1 });
appointmentSchema.index({ status: 1 });

// Compute the active Nepali fiscal year (Shrawan→Ashadh). E.g. AD 2026-05-01 sits
// in BS 2083-01-18, which falls in fiscal year 2082-83 (started 2082-04-01 BS).
function bsFiscalYearForDate(d) {
  try {
    const np = require('../utils/nepaliDate');
    const bs = np.adToBs(d);
    // BS month 4 = Shrawan = start of FY. Months 1..3 of year Y belong to FY (Y-1)/Y.
    const startYear = bs.month >= 4 ? bs.year : bs.year - 1;
    const endYear = startYear + 1;
    return `${startYear}-${String(endYear).slice(-2)}`;
  } catch {
    const y = new Date(d).getFullYear();
    return `${y}`;
  }
}

// Generate refCode with branch code, token number, and file (दर्ता) number.
appointmentSchema.pre('save', async function(next) {
  if (this.isNew) {
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

    // Generate gov-style दर्ता / file number scoped to branch + fiscal year.
    if (!this.fileNumber) {
      try {
        const fy = bsFiscalYearForDate(this.date || new Date());
        this.fiscalYearBs = fy;
        const Counter = mongoose.model('Counter');
        const seq = await Counter.next(`appointment:${bc}:${fy}`);
        this.fileNumber = `${bc}/${fy}/${String(seq).padStart(4, '0')}`;
      } catch (err) {
        // Counter is best-effort; refCode + tokenNumber are sufficient for booking flow.
      }
    }
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
