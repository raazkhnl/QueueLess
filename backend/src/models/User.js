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
