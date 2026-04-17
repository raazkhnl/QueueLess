const NotificationTemplate = require('../models/NotificationTemplate');

exports.getAll = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'org_admin') query.organization = req.user.organization;
    if (req.query.organization) query.organization = req.query.organization;
    if (req.query.type) query.type = req.query.type;
    const templates = await NotificationTemplate.find(query).populate('organization', 'name').sort({ type: 1 });
    res.json({ templates });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.create({ ...req.body, organization: req.body.organization || req.user.organization });
    res.status(201).json({ template });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ template });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await NotificationTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (error) { next(error); }
};

// Get default templates (for seeding)
exports.getDefaults = async (req, res, next) => {
  try {
    const defaults = [
      { type: 'booking_confirmed', channel: 'email', subject: 'Booking Confirmed - {{refCode}}', bodyTemplate: 'Hello {{name}}, your appointment for {{service}} at {{branch}} on {{date}} at {{time}} is confirmed. Token: #{{token}}. Ref: {{refCode}}' },
      { type: 'booking_cancelled', channel: 'email', subject: 'Booking Cancelled - {{refCode}}', bodyTemplate: 'Hello {{name}}, your appointment {{refCode}} for {{service}} on {{date}} has been cancelled.' },
      { type: 'booking_reminder', channel: 'email', subject: 'Reminder: Appointment Tomorrow - {{refCode}}', bodyTemplate: 'Hello {{name}}, reminder for your appointment tomorrow for {{service}} at {{branch}} at {{time}}. Token: #{{token}}.' },
      { type: 'booking_rescheduled', channel: 'email', subject: 'Appointment Rescheduled - {{refCode}}', bodyTemplate: 'Hello {{name}}, your appointment {{refCode}} has been rescheduled to {{date}} at {{time}}.' },
      { type: 'feedback_request', channel: 'email', subject: 'How was your experience? - {{orgName}}', bodyTemplate: 'Hello {{name}}, thank you for visiting {{branch}}. Please take a moment to rate your experience.' },
    ];
    res.json({ defaults });
  } catch (error) { next(error); }
};
