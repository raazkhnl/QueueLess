/**
 * Hybrid linking + status cascade smoke tests.
 *
 * Verifies that:
 *   1. linkEntities adds the bidirectional ObjectIds on both sides.
 *   2. cascadeAppointmentStatus pushes a history+comment to every linked issue
 *      when the appointment transitions to cancelled / completed / checked_in.
 *   3. cascadeIssueStatus appends to internalNotes on every linked appointment
 *      when the issue resolves / closes / reopens.
 */
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

const Issue = require('../src/models/Issue');
const IssueType = require('../src/models/IssueType');
const Appointment = require('../src/models/Appointment');
const hybrid = require('../src/services/hybridLinkService');

async function makeApt() {
  return Appointment.create({
    organization: new mongoose.Types.ObjectId(),
    branch: new mongoose.Types.ObjectId(),
    branchCode: 'TST',
    appointmentType: new mongoose.Types.ObjectId(),
    date: new Date(), startTime: '10:00', endTime: '10:30', duration: 30,
  });
}
async function makeIssue() {
  const orgId = new mongoose.Types.ObjectId();
  const it = await IssueType.create({ name: 'Hybrid', slug: 'hybrid', organization: orgId, slaHours: 24, isActive: true });
  return Issue.create({
    organization: orgId, issueType: it._id,
    description: 'Linked test', guestName: 'g', guestEmail: 'g@x.com',
    history: [{ action: 'created', toStatus: 'open', actorName: 'g' }],
  });
}

describe('hybridLinkService.linkEntities', () => {
  it('adds bidirectional ObjectId references', async () => {
    const apt = await makeApt();
    const issue = await makeIssue();
    const actor = new mongoose.Types.ObjectId();

    await hybrid.linkEntities(issue._id, apt._id, actor);

    const freshIssue = await Issue.findById(issue._id);
    const freshApt = await Appointment.findById(apt._id);
    expect(freshIssue.linkedAppointments.map(String)).toContain(String(apt._id));
    expect(freshApt.linkedIssues.map(String)).toContain(String(issue._id));
    expect(freshIssue.history.find((h) => h.action === 'linked_to_appointment')).toBeTruthy();
  });

  it('is idempotent — repeated calls do not duplicate the link', async () => {
    const apt = await makeApt();
    const issue = await makeIssue();
    const actor = new mongoose.Types.ObjectId();
    await hybrid.linkEntities(issue._id, apt._id, actor);
    await hybrid.linkEntities(issue._id, apt._id, actor);
    const freshIssue = await Issue.findById(issue._id);
    expect(freshIssue.linkedAppointments.length).toBe(1);
  });
});

describe('cascadeAppointmentStatus', () => {
  it('cancels → posts a history event + internal comment on linked issue', async () => {
    const apt = await makeApt();
    const issue = await makeIssue();
    await hybrid.linkEntities(issue._id, apt._id, new mongoose.Types.ObjectId());

    await hybrid.cascadeAppointmentStatus(apt._id, 'cancelled', { _id: new mongoose.Types.ObjectId(), name: 'Staff' });
    const fresh = await Issue.findById(issue._id);
    expect(fresh.history.find((h) => h.action === 'linked_appointment_cancelled')).toBeTruthy();
    const comment = fresh.comments.find((c) => c.body.includes(apt.refCode) && c.isInternal);
    expect(comment).toBeTruthy();
  });

  it('does not post for unsupported statuses', async () => {
    const apt = await makeApt();
    const issue = await makeIssue();
    await hybrid.linkEntities(issue._id, apt._id, new mongoose.Types.ObjectId());
    const beforeCount = (await Issue.findById(issue._id)).history.length;
    await hybrid.cascadeAppointmentStatus(apt._id, 'rescheduled', { _id: new mongoose.Types.ObjectId(), name: 'Staff' });
    const afterCount = (await Issue.findById(issue._id)).history.length;
    expect(afterCount).toBe(beforeCount);
  });
});

describe('cascadeIssueStatus', () => {
  it('resolved → appends to linked appointment internalNotes', async () => {
    const apt = await makeApt();
    const issue = await makeIssue();
    await hybrid.linkEntities(issue._id, apt._id, new mongoose.Types.ObjectId());

    await hybrid.cascadeIssueStatus(issue._id, 'resolved', { _id: new mongoose.Types.ObjectId(), name: 'Officer' }, 'Refunded.');
    const fresh = await Appointment.findById(apt._id);
    expect(fresh.internalNotes).toMatch(new RegExp(issue.refCode));
    expect(fresh.internalNotes).toMatch(/RESOLVED/);
    expect(fresh.internalNotes).toMatch(/Officer/);
  });

  it('does nothing when the issue has no linked appointments', async () => {
    const issue = await makeIssue();
    await expect(
      hybrid.cascadeIssueStatus(issue._id, 'resolved', null, '')
    ).resolves.not.toThrow();
  });
});

describe('issueService.updateStatus integration with cascade', () => {
  it('writing resolved on an issue propagates to linked appointment notes', async () => {
    const issueService = require('../src/services/issueService');
    const apt = await makeApt();
    const issue = await makeIssue();
    await hybrid.linkEntities(issue._id, apt._id, new mongoose.Types.ObjectId());

    await issueService.updateStatus(issue._id, 'resolved', { _id: new mongoose.Types.ObjectId(), name: 'Q' }, 'fixed');
    // Cascade is fire-and-forget; give the microtask a tick
    await new Promise((r) => setTimeout(r, 50));
    const fresh = await Appointment.findById(apt._id);
    expect(fresh.internalNotes || '').toMatch(/RESOLVED/);
  });
});
