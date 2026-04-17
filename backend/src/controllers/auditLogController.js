const AuditLog = require('../models/AuditLog');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, action, resource, user: userId } = req.query;
    const query = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (userId) query.user = userId;

    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await AuditLog.countDocuments(query);

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};
