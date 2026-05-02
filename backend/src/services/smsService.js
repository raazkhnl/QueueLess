/**
 * SMS provider abstraction.
 *
 * Selects a driver from the SMS_PROVIDER env var (or 'console' if unset).
 * Drivers ship with a uniform `send({ to, body })` contract so callers don't
 * need to know which gateway is wired up.
 *
 * Implemented drivers:
 *   - console  (default; logs payload — useful for dev / staging)
 *   - sparrow  (Sparrow SMS — most common gateway in NP for transactional SMS)
 *   - twilio   (Twilio — common globally)
 *
 * To add a driver: implement a `send({ to, body })` function returning the
 * provider response, register it in PROVIDERS below.
 */
const logger = require('../config/logger');

const cleanPhone = (raw) => {
  if (!raw) return null;
  let p = String(raw).replace(/[^0-9+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  // Default to NP country code if 10-digit local number
  if (p.length === 10 && p.startsWith('9')) p = '977' + p;
  return p;
};

// ─── console driver ──────────────────────────────────
const consoleDriver = {
  name: 'console',
  async send({ to, body }) {
    logger.info(`[SMS:console] → ${to}: ${body}`);
    return { ok: true, provider: 'console', messageId: `console-${Date.now()}` };
  }
};

// ─── Sparrow SMS (NP) driver ─────────────────────────
const sparrowDriver = {
  name: 'sparrow',
  async send({ to, body }) {
    const token = process.env.SPARROW_SMS_TOKEN;
    const from = process.env.SPARROW_SMS_FROM || 'TheAlert';
    if (!token) throw new Error('SPARROW_SMS_TOKEN env var not set');

    const params = new URLSearchParams({ token, from, to, text: body });
    const url = `http://api.sparrowsms.com/v2/sms/?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sparrow SMS HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    if (data.response_code && data.response_code !== 200) {
      throw new Error(`Sparrow SMS: ${data.response || 'unknown error'}`);
    }
    return { ok: true, provider: 'sparrow', raw: data };
  }
};

// ─── Twilio driver ───────────────────────────────────
const twilioDriver = {
  name: 'twilio',
  async send({ to, body }) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const tok = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !tok || !from) throw new Error('Twilio env vars not set (SID / AUTH_TOKEN / FROM_NUMBER)');

    const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
    const params = new URLSearchParams({ To: '+' + to, From: from, Body: body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Twilio HTTP ${res.status}: ${txt}`);
    }
    const data = await res.json();
    return { ok: true, provider: 'twilio', messageId: data.sid, raw: data };
  }
};

const PROVIDERS = { console: consoleDriver, sparrow: sparrowDriver, twilio: twilioDriver };

function pickDriver() {
  const name = (process.env.SMS_PROVIDER || 'console').toLowerCase();
  return PROVIDERS[name] || consoleDriver;
}

/**
 * Send an SMS. Returns the provider's normalised response, never throws to the
 * caller — failures are logged and turned into `{ ok: false, error }` so a
 * single SMS hiccup never breaks a booking confirmation flow.
 */
async function sendSMS({ to, body }) {
  const phone = cleanPhone(to);
  if (!phone) return { ok: false, error: 'Invalid phone number' };
  if (!body || !String(body).trim()) return { ok: false, error: 'Empty SMS body' };

  const driver = pickDriver();
  try {
    return await driver.send({ to: phone, body: String(body).slice(0, 480) });
  } catch (err) {
    logger.warn(`[SMS:${driver.name}] failed: ${err.message}`);
    return { ok: false, provider: driver.name, error: err.message };
  }
}

module.exports = { sendSMS, pickDriver, cleanPhone, PROVIDERS };
