const Issue = require('../models/Issue');
const Appointment = require('../models/Appointment');

/**
 * Status cascade — when something happens to one side of a linked
 * appointment ⇄ issue pair, surface it to the other side automatically.
 *
 * On appointment {cancelled, completed, checked_in}: append a system note
 * (history + comment) to every linked Issue so the case worker sees it.
 *
 * On issue {resolved, closed, reopened}: append a note to the appointment's
 * `internalNotes` so the staff handling the appointment sees the resolution
 * context.
 *
 * All side-effects are best-effort and never throw — failure to cascade
 * shouldn't break the originating mutation.
 */
exports.cascadeAppointmentStatus = async (appointmentId, newStatus, actorUser) => {
  try {
    const apt = await Appointment.findById(appointmentId);
    if (!apt || !Array.isArray(apt.linkedIssues) || apt.linkedIssues.length === 0) return;

    const eventByStatus = {
      cancelled: 'linked_appointment_cancelled',
      completed: 'linked_appointment_completed',
      checked_in: 'linked_appointment_checked_in',
    };
    const action = eventByStatus[newStatus];
    if (!action) return;

    const note = `Linked appointment ${apt.refCode} → ${newStatus.replace('_', ' ')}`;
    for (const issueId of apt.linkedIssues) {
      const issue = await Issue.findById(issueId);
      if (!issue) continue;
      issue.history.push({
        action,
        reason: note,
        actor: actorUser?._id || null,
        actorName: actorUser?.name || 'System',
      });
      issue.comments.push({
        body: note,
        author: actorUser?._id || null,
        authorName: actorUser?.name || 'System',
        isInternal: true,
      });
      await issue.save();
    }
  } catch (err) {
    /* swallow — best-effort */
  }
};

exports.cascadeIssueStatus = async (issueId, newStatus, actorUser, reason) => {
  try {
    if (!['resolved', 'closed', 'reopened'].includes(newStatus)) return;
    const issue = await Issue.findById(issueId);
    if (!issue || !Array.isArray(issue.linkedAppointments) || issue.linkedAppointments.length === 0) return;

    const tag = newStatus === 'reopened' ? 'reopened' : newStatus;
    const noteLine = `[Ticket ${issue.refCode}] ${tag.toUpperCase()}${reason ? ` — ${reason}` : ''}`;
    const stamp = ` (${new Date().toISOString().slice(0, 16).replace('T', ' ')} by ${actorUser?.name || 'System'})`;
    const fullNote = noteLine + stamp;

    for (const aptId of issue.linkedAppointments) {
      const apt = await Appointment.findById(aptId);
      if (!apt) continue;
      apt.internalNotes = apt.internalNotes ? `${apt.internalNotes}\n${fullNote}` : fullNote;
      await apt.save();
    }
  } catch (err) {
    /* swallow — best-effort */
  }
};

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
