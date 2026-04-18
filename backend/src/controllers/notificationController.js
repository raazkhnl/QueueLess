const Notification = require('../models/Notification');
const { sendEmail, emailTemplates } = require('../services/emailService');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, channel, status } = req.query;
    const query = {};
    if (type) query.type = type;
    if (channel) query.channel = channel;
    if (status) query.status = status;

    const notifications = await Notification.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Notification.countDocuments(query);

    res.json({ notifications, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// Send a custom notification (admin)
exports.sendCustom = async (req, res, next) => {
  try {
    const { email, phone, subject, message, channel = 'email' } = req.body;
    if (!email && !phone) return res.status(400).json({ message: 'Email or phone required' });

    const notification = await Notification.create({
      email, phone, type: 'custom', channel, subject, message,
    });

    if (channel === 'email' && email) {
      const result = await sendEmail({
        to: email, subject: subject || 'QueueLess Notification',
        html: `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;"><p>${message}</p><p style="color:#94a3b8;font-size:12px;margin-top:20px;">— QueueLess Team</p></div>`,
      });
      notification.status = result.success ? 'sent' : 'failed';
      notification.sentAt = result.success ? new Date() : undefined;
      notification.error = result.error;
      await notification.save();
    }

    res.json({ notification });
  } catch (error) { next(error); }
};

// Get notification stats
exports.getStats = async (req, res, next) => {
  try {
    const stats = await Notification.aggregate([
      { $group: {
        _id: { type: '$type', status: '$status' },
        count: { $sum: 1 }
      }},
    ]);
    const total = await Notification.countDocuments();
    const sent = await Notification.countDocuments({ status: 'sent' });
    const failed = await Notification.countDocuments({ status: 'failed' });

    res.json({ total, sent, failed, breakdown: stats });
  } catch (error) { next(error); }
};
