/**
 * Payment service — provider-agnostic.
 *
 * Real gateway integration (eSewa / Khalti / IME Pay / ConnectIPS) requires
 * merchant credentials issued by each gateway. This module implements the
 * full *internal* flow:
 *   1. createIntent() returns a redirect URL (when a provider is configured)
 *      or a success placeholder (in dev / cash mode).
 *   2. handleCallback() verifies the payload (HMAC if a secret is configured),
 *      transitions Payment.status, updates the linked Appointment.isPaid.
 *   3. recordCashPayment() lets a staff user log an over-the-counter payment.
 *
 * Plug in real gateway APIs by filling in the provider-specific verify()
 * blocks below.
 */
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const Counter = require('../models/Counter');
const { adToBs } = require('../utils/nepaliDate');

function fiscalYearBs(d = new Date()) {
  const bs = adToBs(d);
  const startYear = bs.month >= 4 ? bs.year : bs.year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

async function nextReceiptNumber(orgCode = 'ORG') {
  const fy = fiscalYearBs();
  const seq = await Counter.next(`payment:${orgCode}:${fy}`);
  return { receiptNumber: `${orgCode}/${fy}/${String(seq).padStart(5, '0')}`, fiscalYearBs: fy };
}

// ─── Intent creation ─────────────────────────────────
async function createIntent({ amount, currency = 'NPR', description, provider, organization, appointment, issue, citizen, recordedBy }) {
  if (!amount || amount < 0) { const e = new Error('Amount must be >= 0'); e.status = 400; throw e; }
  if (!organization) { const e = new Error('organization required'); e.status = 400; throw e; }

  const payment = await Payment.create({
    organization, branch: undefined, appointment, issue, citizen,
    amount, currency, description, provider, status: 'pending',
    recordedBy,
  });

  // Build a redirect URL the frontend can follow. Each gateway has its own
  // checkout host; we expose a unified signature plus the internal refCode.
  const base = process.env.PAYMENT_RETURN_URL || (process.env.FRONTEND_URL || '').split(',')[0] || '';
  const ret = `${base}/payment/return?ref=${encodeURIComponent(payment.refCode)}`;
  const redirectUrl = (() => {
    switch (provider) {
      case 'esewa':       return `${process.env.ESEWA_CHECKOUT_URL || 'https://uat.esewa.com.np/epay/main'}?amt=${amount}&pid=${payment.refCode}&su=${encodeURIComponent(ret)}&fu=${encodeURIComponent(ret)}`;
      case 'khalti':      return `${process.env.KHALTI_CHECKOUT_URL || 'https://khalti.com/api/v2/epayment/initiate/'}?amount=${amount * 100}&purchase_order_id=${payment.refCode}&return_url=${encodeURIComponent(ret)}`;
      case 'imepay':      return `${process.env.IMEPAY_CHECKOUT_URL || 'https://payment.imepay.com.np'}?ref=${payment.refCode}&amount=${amount}&return=${encodeURIComponent(ret)}`;
      case 'connectips':  return `${process.env.CONNECTIPS_CHECKOUT_URL || 'https://login.connectips.com/'}?txnId=${payment.refCode}&amount=${amount}&return=${encodeURIComponent(ret)}`;
      default:            return ret;  // cash / manual / bank_transfer — frontend just shows confirmation
    }
  })();

  return { payment, redirectUrl };
}

// ─── Callback / webhook verification ─────────────────
function verifySignature(provider, payload, signature) {
  const secret = (() => {
    switch (provider) {
      case 'esewa':      return process.env.ESEWA_SECRET;
      case 'khalti':     return process.env.KHALTI_SECRET;
      case 'imepay':     return process.env.IMEPAY_SECRET;
      case 'connectips': return process.env.CONNECTIPS_SECRET;
      default:           return null;
    }
  })();
  if (!secret) return true;  // no secret configured → trust the body (dev mode)
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
}

async function handleCallback({ provider, payload, signature }) {
  if (!verifySignature(provider, payload, signature)) {
    const e = new Error('Invalid signature'); e.status = 401; throw e;
  }
  const refCode = payload.refCode || payload.purchase_order_id || payload.pid || payload.txnId;
  if (!refCode) { const e = new Error('Missing payment refCode'); e.status = 400; throw e; }
  const payment = await Payment.findOne({ refCode });
  if (!payment) { const e = new Error('Payment not found'); e.status = 404; throw e; }

  const success = String(payload.status || payload.event || '').toLowerCase().match(/^(success|completed|paid|approved)$/);
  payment.providerRef = payload.providerRef || payload.transaction_uuid || payload.refId || payload.txnRef || payment.providerRef;
  payment.providerPayload = payload;

  if (success) {
    payment.status = 'paid';
    payment.paidAt = new Date();
    if (!payment.receiptNumber) {
      const r = await nextReceiptNumber('PAY');
      payment.receiptNumber = r.receiptNumber;
      payment.fiscalYearBs = r.fiscalYearBs;
    }
    if (payment.appointment) {
      await Appointment.findByIdAndUpdate(payment.appointment, { isPaid: true });
    }
  } else {
    payment.status = 'failed';
    payment.failedReason = payload.failureReason || payload.message || 'Gateway reported failure';
  }
  await payment.save();
  return payment;
}

// ─── Cash / counter payment ──────────────────────────
async function recordCashPayment({ amount, currency = 'NPR', appointment, issue, organization, recordedBy, description }) {
  const r = await nextReceiptNumber('CASH');
  return Payment.create({
    organization, appointment, issue, recordedBy,
    amount, currency, description, provider: 'cash',
    status: 'paid', paidAt: new Date(),
    receiptNumber: r.receiptNumber, fiscalYearBs: r.fiscalYearBs,
  });
}

module.exports = { createIntent, handleCallback, recordCashPayment, nextReceiptNumber };
