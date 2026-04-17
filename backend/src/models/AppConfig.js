const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  appName: { type: String, default: 'QueueLess' },
  tagline: { type: String, default: 'Public Service, Fast Forward' },
  logo: { type: String },
  favicon: { type: String },
  defaultLanguage: { type: String, enum: ['en', 'ne'], default: 'en' },
  supportedLanguages: [{ type: String, enum: ['en', 'ne'] }],
  theme: {
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#1e40af' },
    accentColor: { type: String, default: '#f59e0b' },
    darkMode: { type: Boolean, default: false },
  },
  contact: {
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    website: { type: String },
  },
  features: {
    guestBooking: { type: Boolean, default: true },
    feedbackEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    multiLanguage: { type: Boolean, default: false },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', appConfigSchema);
