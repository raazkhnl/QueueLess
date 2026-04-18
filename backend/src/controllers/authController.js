const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../services/emailService');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register with email + password
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, phone, password, role: 'citizen' });
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
};

// Login with email + password
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

// Request OTP (email-based for now)
exports.requestOTP = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone required' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = await User.create({ name: email.split('@')[0], email, otp, otpExpiry, role: 'citizen' });
      } else {
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();
      }

      // Send OTP email
      const template = emailTemplates.otpEmail({ otp });
      await sendEmail({ to: email, subject: template.subject, html: template.html });
    } else if (phone) {
      user = await User.findOne({ phone });
      if (!user) {
        user = await User.create({ name: 'User', phone, otp, otpExpiry, role: 'citizen' });
      } else {
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();
      }
      // SMS would go here for Nepal gateway
      console.log(`SMS OTP for ${phone}: ${otp}`);
    }

    res.json({ message: 'OTP sent successfully', ...(process.env.NODE_ENV === 'development' && { otp }) });
  } catch (error) {
    next(error);
  }
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, phone, otp } = req.body;
    const query = email ? { email } : { phone };

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP expired' });

    user.otp = undefined;
    user.otpExpiry = undefined;
    if (email) user.isEmailVerified = true;
    if (phone) user.isPhoneVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

// Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    await user.save();
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Change password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    
    if (user.password && !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Forgot password — sends OTP to email
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not (security)
      return res.json({ message: 'If an account exists with this email, a reset code has been sent' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const template = emailTemplates.passwordReset({ name: user.name, otp });
    await sendEmail({ to: email, subject: template.subject, html: template.html });

    res.json({
      message: 'If an account exists with this email, a reset code has been sent',
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    next(error);
  }
};

// Reset password using OTP
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = generateToken(user);
    res.json({ message: 'Password reset successfully', token, user });
  } catch (error) {
    next(error);
  }
};
