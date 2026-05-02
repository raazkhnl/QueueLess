/**
 * Service-level smoke tests — paymentService, retryQueue, issueService.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const Payment = require('../src/models/Payment');
const Appointment = require('../src/models/Appointment');
const Issue = require('../src/models/Issue');
const IssueType = require('../src/models/IssueType');
const paymentService = require('../src/services/paymentService');
const issueService = require('../src/services/issueService');
const retryQueue = require('../src/services/retryQueue');

describe('paymentService', () => {
  it('createIntent persists a pending payment + returns redirectUrl', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const { payment, redirectUrl } = await paymentService.createIntent({
      amount: 500, provider: 'cash', organization: orgId, description: 'Test fee',
    });
    expect(payment.status).toBe('pending');
    expect(payment.refCode).toMatch(/^PAY-/);
    expect(typeof redirectUrl).toBe('string');
  });

  it('handleCallback transitions to paid when status is success', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const { payment } = await paymentService.createIntent({ amount: 100, provider: 'esewa', organization: orgId });
    const result = await paymentService.handleCallback({
      provider: 'esewa',
      payload: { refCode: payment.refCode, status: 'success', transaction_uuid: 'esewa-xyz' },
      signature: null, // no secret configured = trust body
    });
    expect(result.status).toBe('paid');
    expect(result.providerRef).toBe('esewa-xyz');
    expect(result.receiptNumber).toMatch(/\d{4}-\d{2}\/\d{5}$/);
  });

  it('recordCashPayment creates a paid record with a receipt number', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const p = await paymentService.recordCashPayment({ amount: 50, organization: orgId, recordedBy: userId, description: 'Counter fee' });
    expect(p.status).toBe('paid');
    expect(p.receiptNumber).toBeTruthy();
    expect(p.provider).toBe('cash');
  });
});

describe('retryQueue', () => {
  beforeEach(() => { retryQueue._Job.deleteMany({}); });

  it('enqueues a job and runs the registered handler', async () => {
    let calls = 0;
    retryQueue.register('test:ok', async (payload) => { calls += 1; expect(payload.x).toBe(1); });
    await retryQueue.enqueue('test:ok', { x: 1 });

    // Manually drive the loop tick by importing it directly
    retryQueue.start({ intervalMs: 50 });
    await new Promise((r) => setTimeout(r, 200));
    retryQueue.stop();
    expect(calls).toBe(1);
  });

  it('reschedules a failing job with backoff', async () => {
    retryQueue.register('test:fail', async () => { throw new Error('boom'); });
    const job = await retryQueue.enqueue('test:fail', {}, { maxAttempts: 3 });

    retryQueue.start({ intervalMs: 50 });
    await new Promise((r) => setTimeout(r, 200));
    retryQueue.stop();

    const fresh = await retryQueue._Job.findById(job._id);
    expect(fresh.attempts).toBeGreaterThanOrEqual(1);
    expect(['queued', 'failed']).toContain(fresh.status);
    expect(fresh.lastError).toContain('boom');
  });
});

describe('issueService', () => {
  it('createIssue requires a valid IssueType and description', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const it = await IssueType.create({ name: 'Test', slug: 'test', organization: orgId, slaHours: 24, isActive: true });

    const issue = await issueService.createIssue({
      issueType: it._id, description: 'Something is broken', guestName: 'Guest', guestEmail: 'g@example.com',
    });

    expect(issue.refCode).toMatch(/^TKT-/);
    expect(issue.status).toBe('open');
    expect(issue.slaDueDate).toBeInstanceOf(Date);
    expect(issue.history).toHaveLength(1);
    expect(issue.history[0].action).toBe('created');
  });

  it('updateStatus appends history and respects status transitions', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const it = await IssueType.create({ name: 'T', slug: 't2', organization: orgId, slaHours: 24, isActive: true });
    const issue = await issueService.createIssue({ issueType: it._id, description: 'x', guestName: 'g', guestEmail: 'g@x.com' });

    const actor = { _id: new mongoose.Types.ObjectId(), name: 'Admin', role: 'org_admin' };
    const updated = await issueService.updateStatus(issue._id, 'in_progress', actor, 'picked up');
    expect(updated.status).toBe('in_progress');
    expect(updated.history.length).toBeGreaterThan(1);

    const resolved = await issueService.updateStatus(issue._id, 'resolved', actor, 'fixed');
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
  });

  it('startApprovalChain + decideApprovalStep walks through approvals', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const it = await IssueType.create({ name: 'T', slug: 't3', organization: orgId, slaHours: 24, isActive: true });
    const issue = await issueService.createIssue({ issueType: it._id, description: 'x', guestName: 'g', guestEmail: 'g@x.com' });

    const actorJunior = { _id: new mongoose.Types.ObjectId(), name: 'Junior', role: 'staff', rankLevel: 2 };
    const actorChief = { _id: new mongoose.Types.ObjectId(), name: 'Chief', role: 'branch_manager', rankLevel: 5 };

    await issueService.startApprovalChain(issue._id, [
      { requiredRankLevel: 2 }, { requiredRankLevel: 5 },
    ], actorChief);

    const afterFirst = await issueService.decideApprovalStep(issue._id, { decision: 'approved', note: 'looks good' }, actorJunior);
    expect(afterFirst.currentApprovalStep).toBe(2);

    const afterSecond = await issueService.decideApprovalStep(issue._id, { decision: 'approved', note: 'final ok' }, actorChief);
    expect(afterSecond.status).toBe('resolved');
  });

  it('rejects approval step if actor rank too low', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const it = await IssueType.create({ name: 'T', slug: 't4', organization: orgId, slaHours: 24, isActive: true });
    const issue = await issueService.createIssue({ issueType: it._id, description: 'x', guestName: 'g', guestEmail: 'g@x.com' });
    await issueService.startApprovalChain(issue._id, [{ requiredRankLevel: 8 }], { _id: new mongoose.Types.ObjectId(), name: 'init' });
    const lowRank = { _id: new mongoose.Types.ObjectId(), name: 'Low', rankLevel: 2 };
    await expect(
      issueService.decideApprovalStep(issue._id, { decision: 'approved' }, lowRank)
    ).rejects.toThrow(/rank level 8/);
  });
});
