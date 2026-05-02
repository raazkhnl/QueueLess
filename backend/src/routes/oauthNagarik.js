/**
 * Nagarik App OAuth scaffold.
 *
 * Nagarik App is the GoN single-sign-on for citizens. The actual OAuth client
 * registration with the Department of National ID and Civil Registration is
 * required to obtain a CLIENT_ID + CLIENT_SECRET; until those are issued, this
 * route operates in dry-run mode and returns the redirect URL the frontend
 * should send the user to.
 *
 * Once env vars are set:
 *   NAGARIK_CLIENT_ID, NAGARIK_CLIENT_SECRET, NAGARIK_AUTH_URL, NAGARIK_TOKEN_URL,
 *   NAGARIK_USERINFO_URL, NAGARIK_REDIRECT_URI
 * the same routes will switch to live OAuth without a code change.
 */
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');

// In-memory state store — for production, persist to Redis. State is short-lived (5min).
const stateStore = new Map();
const setState = (key, val) => { stateStore.set(key, { val, exp: Date.now() + 5 * 60 * 1000 }); };
const getState = (key) => {
  const e = stateStore.get(key); if (!e) return null;
  if (e.exp < Date.now()) { stateStore.delete(key); return null; }
  stateStore.delete(key);
  return e.val;
};

router.get('/login', (req, res) => {
  const clientId = process.env.NAGARIK_CLIENT_ID;
  const authUrl = process.env.NAGARIK_AUTH_URL;
  const redirectUri = process.env.NAGARIK_REDIRECT_URI;

  const state = crypto.randomBytes(16).toString('hex');
  setState(state, { redirect: req.query.redirect || '/' });

  if (!clientId || !authUrl || !redirectUri) {
    return res.json({
      mode: 'unconfigured',
      message: 'Nagarik App OAuth env vars not set. Set NAGARIK_CLIENT_ID, NAGARIK_AUTH_URL, NAGARIK_REDIRECT_URI.',
      state,
    });
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile citizenship',
    state,
  });
  res.redirect(`${authUrl}?${params.toString()}`);
});

router.get('/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const stored = getState(String(state));
    if (!stored) return res.status(400).json({ message: 'Invalid or expired state' });

    const clientId = process.env.NAGARIK_CLIENT_ID;
    const clientSecret = process.env.NAGARIK_CLIENT_SECRET;
    const tokenUrl = process.env.NAGARIK_TOKEN_URL;
    const userinfoUrl = process.env.NAGARIK_USERINFO_URL;
    const redirectUri = process.env.NAGARIK_REDIRECT_URI;

    if (!clientId || !clientSecret || !tokenUrl || !userinfoUrl || !redirectUri) {
      return res.status(503).json({ message: 'Nagarik OAuth not fully configured', received: { code, state } });
    }

    // Exchange code → access_token
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code, redirect_uri: redirectUri,
        client_id: clientId, client_secret: clientSecret,
      }),
    });
    if (!tokenRes.ok) return res.status(502).json({ message: 'Token exchange failed' });
    const tokens = await tokenRes.json();

    // Fetch profile
    const userRes = await fetch(userinfoUrl, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!userRes.ok) return res.status(502).json({ message: 'Userinfo fetch failed' });
    const profile = await userRes.json();

    // Upsert local user keyed on citizenship number
    const citizenshipNumber = profile.citizenship || profile.citizenship_number || profile.sub;
    if (!citizenshipNumber) return res.status(400).json({ message: 'Profile missing citizenship identifier' });

    let user = await User.findOne({ citizenshipNumber });
    if (!user) {
      user = await User.create({
        name: profile.name || profile.full_name || 'Citizen',
        email: profile.email,
        phone: profile.phone || profile.mobile,
        role: 'citizen',
        citizenshipNumber,
        citizenshipIssuedDistrict: profile.citizenship_district,
        nationalId: profile.national_id,
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender,
        isEmailVerified: !!profile.email_verified,
      });
    }

    const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    const frontend = (process.env.FRONTEND_URL || '').split(',')[0] || '';
    res.redirect(`${frontend}/login?token=${encodeURIComponent(jwtToken)}&via=nagarik`);
  } catch (err) { next(err); }
});

module.exports = router;
