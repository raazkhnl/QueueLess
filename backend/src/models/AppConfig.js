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
  // Feature flags. Every public/admin behaviour that can reasonably be turned
  // on/off at platform scope lives here. Org-level overrides remain on
  // Organization.settings.* (per-tenant).
  features: {
    guestBooking: { type: Boolean, default: true },
    feedbackEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    emailEnabled: { type: Boolean, default: true },
    multiLanguage: { type: Boolean, default: true },
    ticketingEnabled: { type: Boolean, default: true },
    hybridLinkingEnabled: { type: Boolean, default: true },
    paymentsEnabled: { type: Boolean, default: false },
    onBehalfBookingEnabled: { type: Boolean, default: true },
    nagarikOAuthEnabled: { type: Boolean, default: false },
    selfServiceTenantOnboarding: { type: Boolean, default: false },
    qrCheckInEnabled: { type: Boolean, default: true },
    rtiPublicDashboard: { type: Boolean, default: true },
    bsCalendar: { type: Boolean, default: true },
    captchaEnabled: { type: Boolean, default: true },
    tokenDisplayBoardEnabled: { type: Boolean, default: true },
  },
  ticketing: {
    enableTicketing: { type: Boolean, default: true },
    enableHybridLinking: { type: Boolean, default: true },
    defaultSLAHours: { type: Number, default: 48 },
    retentionDays: { type: Number, default: 365 },
  },
  payments: {
    defaultProvider: { type: String, enum: ['esewa', 'khalti', 'imepay', 'connectips', 'cash', 'manual'], default: 'cash' },
    enabledProviders: [{ type: String }],
  },
  notifications: {
    smsProvider: { type: String, default: 'console' },
    emailFromName: { type: String, default: 'QueueLess' },
    reminderHoursBefore: { type: Number, default: 24 },
  },
  dataRetention: {
    appointmentDays: { type: Number, default: 1825 },   // 5 years
    issueDays: { type: Number, default: 1825 },
    auditLogDays: { type: Number, default: 3650 },      // 10 years
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', appConfigSchema);
