const Webhook = require('../models/Webhook');
const { logAction } = require('../utils/auditLog');

exports.create = async (req, res, next) => {
  try {
    const wh = await Webhook.create({ ...req.body, organization: req.body.organization || req.user.organization });
    logAction(req, { action: 'create', resource: 'settings', resourceId: wh._id, details: `Webhook created: ${wh.name}` });
    res.status(201).json({ webhook: wh });
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'org_admin') query.organization = req.user.organization;
    const webhooks = await Webhook.find(query).populate('organization', 'name').sort({ createdAt: -1 });
    res.json({ webhooks });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const wh = await Webhook.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!wh) return res.status(404).json({ message: 'Webhook not found' });
    res.json({ webhook: wh });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await Webhook.findByIdAndDelete(req.params.id);
    res.json({ message: 'Webhook deleted' });
  } catch (error) { next(error); }
};

exports.test = async (req, res, next) => {
  try {
    const wh = await Webhook.findById(req.params.id);
    if (!wh) return res.status(404).json({ message: 'Webhook not found' });
    // Send test payload
    const { triggerWebhooks } = require('../services/webhookService');
    await triggerWebhooks(wh.organization, 'test', { message: 'Test webhook from QueueLess', timestamp: new Date() });
    res.json({ message: 'Test webhook sent' });
  } catch (error) { next(error); }
};
