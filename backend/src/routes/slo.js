/**
 * Service-Level Objective dashboard endpoint.
 * Returns a single JSON payload with the metrics that an ops engineer wants
 * at a glance: DB connectivity, queue depth, webhook delivery health, retry
 * queue lag, SLA breaches in the last 24h.
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Issue = require('../models/Issue');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);

    const dbState = mongoose.connection.readyState;
    const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    let retryQueue = { queued: 0, in_progress: 0, failed: 0 };
    try {
      const Job = mongoose.models.RetryJob;
      if (Job) {
        const counts = await Job.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
        for (const c of counts) retryQueue[c._id] = c.n;
      }
    } catch {}

    const [aptToday, escalated24h, openIssues] = await Promise.all([
      Appointment.countDocuments({ createdAt: { $gte: dayAgo } }),
      Issue.countDocuments({ status: 'escalated', updatedAt: { $gte: dayAgo } }),
      Issue.countDocuments({ status: { $in: ['open', 'in_progress', 'forwarded', 'reopened'] } }),
    ]);

    let webhookHealth = null;
    try {
      const WebhookLog = mongoose.models.WebhookLog || require('../models/WebhookLog');
      const recent = await WebhookLog.aggregate([
        { $match: { createdAt: { $gte: dayAgo } } },
        { $group: { _id: '$success', n: { $sum: 1 } } },
      ]);
      const total = recent.reduce((a, b) => a + b.n, 0);
      const ok = recent.find((r) => r._id === true)?.n || 0;
      webhookHealth = { total, ok, successRate: total === 0 ? null : Math.round((ok / total) * 100) };
    } catch {}

    res.json({
      generatedAt: now.toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      database: { state: dbStates[dbState] || 'unknown' },
      retryQueue,
      webhookHealth,
      domain: { appointmentsLast24h: aptToday, ticketsEscalatedLast24h: escalated24h, openTickets: openIssues },
    });
  } catch (err) { next(err); }
});

module.exports = router;
