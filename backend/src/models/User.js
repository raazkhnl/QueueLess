const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, minlength: 6 },
  role: {
    type: String,
    enum: ['super_admin', 'org_admin', 'branch_manager', 'staff', 'citizen'],
    default: 'citizen'
  },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  // National identity — used for closed-loop integration with gov portals,
  // dedupe, fee-waiver eligibility, and PDF receipts.
  citizenshipNumber: { type: String, trim: true, index: true, sparse: true },
  citizenshipIssuedDistrict: { type: String, trim: true },
  nationalId: { type: String, trim: true, index: true, sparse: true },
  panNumber: { type: String, trim: true, uppercase: true, index: true, sparse: true },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  preferredLanguage: { type: String, enum: ['en', 'ne'], default: 'en' },
  address: {
    province: { type: String },
    district: { type: String },
    municipality: { type: String },
    ward: { type: String },
    tole: { type: String },
  },

  currentUnit: { type: String, description: "String indicating SubUnit code/name context" },
  // Officer rank — drives approval-chain routing in Issue workflow.
  // Higher rankLevel = more senior. Free-text label for Nepal civil-service grades.
  rank: { type: String },
  rankLevel: { type: Number, default: 0, min: 0, max: 20 },
  reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  delegations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  specializations: [{ type: String }],
  expertise: { type: String },
  bio: { type: String, maxlength: 500 },
  maxDailyAppointments: { type: Number, default: 20 },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  passwordChangedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  avatar: { type: String },
  lastLogin: { type: Date },
  refreshToken: { type: String },
}, { timestamps: true });

// Password policy: min 6 chars, at least 1 uppercase, 1 number
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  if (this.password.length < 6) return next(new Error('Password must be at least 6 characters'));
  if (!/[A-Z]/.test(this.password)) return next(new Error('Password must contain at least one uppercase letter'));
  if (!/[0-9]/.test(this.password)) return next(new Error('Password must contain at least one number'));
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
