const Issue = require('../models/Issue');
const Appointment = require('../models/Appointment');

/**
 * Creates a bidirectional link between an Appointment and an Issue.
 */
exports.linkEntities = async (issueId, appointmentId, actorId) => {
  const issue = await Issue.findById(issueId);
  const appointment = await Appointment.findById(appointmentId);

  if (!issue || !appointment) {
    const e = new Error('Entity not found'); e.status = 404; throw e;
  }

  if (!Array.isArray(issue.linkedAppointments)) issue.linkedAppointments = [];
  if (!issue.linkedAppointments.find((id) => String(id) === String(appointmentId))) {
    issue.linkedAppointments.push(appointment._id);
    issue.history.push({
      action: 'linked_to_appointment',
      reason: `Linked to appointment ${appointment.refCode}`,
      actor: actorId
    });
    await issue.save();
  }

  if (!Array.isArray(appointment.linkedIssues)) appointment.linkedIssues = [];
  if (!appointment.linkedIssues.find((id) => String(id) === String(issueId))) {
    appointment.linkedIssues.push(issue._id);
    await appointment.save();
  }

  return { issue, appointment };
};

/**
 * Returns a merged timeline of issue history and appointment lifecycle events.
 * type: 'issue' | 'appointment'
 */
exports.getUnifiedTimeline = async (id, type = 'issue') => {
  let issue = null;
  let appointments = [];

  if (type === 'issue') {
    issue = await Issue.findById(id).populate('linkedAppointments').populate('history.actor', 'name role');
    if (!issue) { const e = new Error('Issue not found'); e.status = 404; throw e; }
    appointments = issue.linkedAppointments || [];
  } else {
    const appt = await Appointment.findById(id).populate('linkedIssues');
    if (!appt) { const e = new Error('Appointment not found'); e.status = 404; throw e; }
    appointments = [appt];
    issue = appt.linkedIssues?.[0] || null;
  }

  const events = [];
  if (issue) {
    for (const h of issue.history || []) {
      events.push({
        source: 'issue', refCode: issue.refCode, action: h.action,
        fromStatus: h.fromStatus, toStatus: h.toStatus, reason: h.reason,
        actor: h.actor, timestamp: h.timestamp
      });
    }
  }
  for (const a of appointments) {
    if (a.createdAt) events.push({ source: 'appointment', refCode: a.refCode, action: 'appointment_created', timestamp: a.createdAt });
    if (a.checkedInAt) events.push({ source: 'appointment', refCode: a.refCode, action: 'appointment_checked_in', timestamp: a.checkedInAt });
    if (a.completedAt) events.push({ source: 'appointment', refCode: a.refCode, action: 'appointment_completed', timestamp: a.completedAt });
    if (a.cancelledAt) events.push({ source: 'appointment', refCode: a.refCode, action: 'appointment_cancelled', timestamp: a.cancelledAt });
  }

  events.sort((x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime());
  return events;
};
