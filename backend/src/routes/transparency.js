/**
 * RTI / transparency endpoint.
 *
 * Public, anonymised aggregate stats — no PII. Designed for the citizen-
 * facing /transparency board mandated by Nepal's Right to Information Act.
 */
const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const Appointment = require('../models/Appointment');
const Issue = require('../models/Issue');

router.get('/', async (req, res, next) => {
  try {
    const { organization } = req.query;
    const orgFilter = organization ? { organization } : {};
    const dayAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const [orgs, totalApt, completedApt, cancelledApt, byStatus, ticketsByStatus, ticketsByPriority] = await Promise.all([
      Organization.countDocuments({ isActive: true }),
      Appointment.countDocuments({ ...orgFilter, createdAt: { $gte: dayAgo } }),
      Appointment.countDocuments({ ...orgFilter, status: 'completed', createdAt: { $gte: dayAgo } }),
      Appointment.countDocuments({ ...orgFilter, status: 'cancelled', createdAt: { $gte: dayAgo } }),
      Appointment.aggregate([{ $match: { ...orgFilter, createdAt: { $gte: dayAgo } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Issue.aggregate([{ $match: { ...orgFilter, createdAt: { $gte: dayAgo } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Issue.aggregate([{ $match: { ...orgFilter, createdAt: { $gte: dayAgo } } }, { $group: { _id: '$priority', n: { $sum: 1 } } }]),
    ]);

    // Average resolution time for tickets resolved/closed in window
    const tatAgg = await Issue.aggregate([
      { $match: { ...orgFilter, status: { $in: ['resolved', 'closed'] }, resolvedAt: { $exists: true, $gte: dayAgo } } },
      { $project: { delta: { $subtract: ['$resolvedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$delta' }, n: { $sum: 1 } } },
    ]);
    const avgResolutionHours = tatAgg[0]?.avgMs ? Math.round((tatAgg[0].avgMs / 3600000) * 10) / 10 : null;

    res.json({
      windowDays: 30,
      orgsActive: orgs,
      appointments: {
        total: totalApt, completed: completedApt, cancelled: cancelledApt,
        completionRate: totalApt ? Math.round((completedApt / totalApt) * 100) : null,
        byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.n])),
      },
      tickets: {
        total: ticketsByStatus.reduce((a, b) => a + b.n, 0),
        byStatus: Object.fromEntries(ticketsByStatus.map((b) => [b._id, b.n])),
        byPriority: Object.fromEntries(ticketsByPriority.map((b) => [b._id, b.n])),
        avgResolutionHours,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

module.exports = router;
