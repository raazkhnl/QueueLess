/**
 * Model-level smoke tests — refCode generation, file-number generator,
 * audit hash chain integrity, ApiToken mint+verify.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const Appointment = require('../src/models/Appointment');
const AuditLog = require('../src/models/AuditLog');
const ApiToken = require('../src/models/ApiToken');
const Counter = require('../src/models/Counter');

describe('Appointment auto-fields', () => {
  it('generates refCode + tokenNumber + fileNumber on save', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const typeId = new mongoose.Types.ObjectId();

    const apt = await Appointment.create({
      organization: orgId, branch: branchId, branchCode: 'TST',
      appointmentType: typeId,
      date: new Date(), startTime: '10:00', endTime: '10:30', duration: 30,
    });

    expect(apt.refCode).toMatch(/^QL-TST-/);
    expect(apt.tokenNumber).toBe(1);
    expect(apt.fileNumber).toMatch(/^TST\/\d{4}-\d{2}\/\d{4}$/);
    expect(apt.fiscalYearBs).toMatch(/^\d{4}-\d{2}$/);
  });

  it('increments token + file sequence per branch+FY', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const typeId = new mongoose.Types.ObjectId();
    const base = { organization: orgId, branch: branchId, branchCode: 'SEQ',
      appointmentType: typeId, startTime: '10:00', endTime: '10:30', duration: 30 };

    const a = await Appointment.create({ ...base, date: new Date() });
    const b = await Appointment.create({ ...base, date: new Date() });
    expect(b.tokenNumber).toBe(a.tokenNumber + 1);
    const seqA = parseInt(a.fileNumber.split('/').pop(), 10);
    const seqB = parseInt(b.fileNumber.split('/').pop(), 10);
    expect(seqB).toBe(seqA + 1);
  });
});

describe('Counter atomic increment', () => {
  it('increments monotonically', async () => {
    const a = await Counter.next('test-key');
    const b = await Counter.next('test-key');
    const c = await Counter.next('test-key');
    expect([a, b, c]).toEqual([1, 2, 3]);
  });

  it('isolates by key', async () => {
    expect(await Counter.next('k1')).toBe(1);
    expect(await Counter.next('k2')).toBe(1);
    expect(await Counter.next('k1')).toBe(2);
  });
});

describe('AuditLog hash chain', () => {
  it('writes hashes that link each row to the previous', async () => {
    const u = new mongoose.Types.ObjectId();
    const a = await AuditLog.create({ user: u, action: 'login', resource: 'user' });
    const b = await AuditLog.create({ user: u, action: 'update', resource: 'user' });
    const c = await AuditLog.create({ user: u, action: 'logout', resource: 'user' });

    expect(a.prevHash).toBe('');
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(b.prevHash).toBe(a.hash);
    expect(c.prevHash).toBe(b.hash);

    const verify = await AuditLog.verifyChain();
    expect(verify.ok).toBe(true);
    expect(verify.verified).toBe(3);
  });

  it('detects tampering', async () => {
    const u = new mongoose.Types.ObjectId();
    await AuditLog.create({ user: u, action: 'login', resource: 'user' });
    await AuditLog.create({ user: u, action: 'update', resource: 'user', details: 'original' });

    // Tamper without recomputing hash
    await AuditLog.updateOne({ details: 'original' }, { $set: { details: 'tampered' } });

    const verify = await AuditLog.verifyChain();
    expect(verify.ok).toBe(false);
  });
});

describe('ApiToken mint + verify', () => {
  it('mints a token and verifies it', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const { doc, token } = await ApiToken.mint({ name: 'Test', organization: orgId, scopes: ['*'] });
    expect(token).toMatch(/^ql_/);
    expect(doc.prefix).toBe(token.slice(0, 12));

    const verified = await ApiToken.verify(token);
    expect(verified).not.toBeNull();
    expect(String(verified.organization)).toBe(String(orgId));
  });

  it('rejects unknown tokens', async () => {
    expect(await ApiToken.verify('ql_dev_garbage')).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const { token } = await ApiToken.mint({ name: 'Expired', organization: orgId, expiresAt: new Date(Date.now() - 1000) });
    expect(await ApiToken.verify(token)).toBeNull();
  });
});
