/**
 * Public token-display endpoints for in-office waiting-room screens.
 * Returns *only* the data needed by the big-screen UI: now-serving, next, recent
 * — no PII beyond first-name + last-name initial.
 */
const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const Appointment = require('../models/Appointment');

const maskName = (full = '') => {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'Guest';
  const first = parts[0];
  const lastInit = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() + '.' : '';
  return `${first} ${lastInit}`.trim();
};

// GET /api/display/branch/:code → live queue snapshot
router.get('/branch/:code', async (req, res, next) => {
  try {
    const branch = await Branch.findOne({ code: String(req.params.code).toUpperCase() })
      .populate('organization', 'name nameNp branding');
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);

    const todays = await Appointment.find({
      branch: branch._id,
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'checked_in', 'in_progress', 'completed'] },
    })
      .populate('appointmentType', 'name nameNp roomNo roomNoNp color')
      .populate('assignedStaff', 'name')
      .sort({ tokenNumber: 1 })
      .lean();

    const nowServing = todays.filter((a) => a.status === 'in_progress');
    const next = todays.filter((a) => a.status === 'checked_in').slice(0, 5);
    const recentlyCompleted = todays.filter((a) => a.status === 'completed').slice(-5);

    const project = (a) => ({
      tokenNumber: a.tokenNumber,
      refCode: a.refCode,
      fileNumber: a.fileNumber,
      service: a.appointmentType?.name,
      serviceNp: a.appointmentType?.nameNp,
      roomNo: a.roomNo || a.appointmentType?.roomNo,
      roomNoNp: a.roomNoNp || a.appointmentType?.roomNoNp,
      color: a.appointmentType?.color,
      counter: a.assignedStaff?.name,
      maskedName: maskName(a.guestName || ''),
      startTime: a.startTime,
      status: a.status,
    });

    res.json({
      branch: { name: branch.name, nameNp: branch.nameNp, code: branch.code, organization: branch.organization },
      generatedAt: new Date().toISOString(),
      nowServing: nowServing.map(project),
      next: next.map(project),
      recentlyCompleted: recentlyCompleted.map(project),
      totals: {
        scheduled: todays.length,
        served: todays.filter((a) => a.status === 'completed').length,
        waiting: todays.filter((a) => ['confirmed', 'checked_in'].includes(a.status)).length,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
