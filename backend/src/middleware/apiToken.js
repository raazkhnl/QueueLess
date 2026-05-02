/**
 * Per-tenant API-key middleware.
 *
 * Recognises requests bearing an `X-API-Key` header and resolves them to a
 * synthetic user identity scoped to the token's organization. Requests that
 * already carry a JWT pass through untouched.
 *
 * Per-token rate limiting is enforced inline using a tiny in-process token
 * bucket. For production with multiple processes, swap in a Redis-backed
 * counter — the bucket interface stays the same.
 */
const ApiToken = require('../models/ApiToken');

const buckets = new Map(); // tokenId → { count, resetAt }

function checkRateLimit(token) {
  const now = Date.now();
  const limit = token.rateLimitPerMinute || 60;
  const key = String(token._id);
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + 60_000 };
    buckets.set(key, b);
  }
  b.count += 1;
  return b.count <= limit;
}

async function apiTokenAuth(req, res, next) {
  if (req.user) return next();   // JWT already populated
  const key = req.headers['x-api-key'] || req.headers['X-API-Key'];
  if (!key) return next();
  try {
    const token = await ApiToken.verify(String(key));
    if (!token) return res.status(401).json({ message: 'Invalid or expired API key' });
    if (!checkRateLimit(token)) {
      return res.status(429).json({ message: 'API rate limit exceeded for this token' });
    }
    req.apiToken = token;
    req.user = {
      _id: `apitoken:${token._id}`,
      role: 'org_admin',
      organization: token.organization,
      isApiToken: true,
      scopes: token.scopes,
    };
  } catch (err) { /* fall through anonymously */ }
  next();
}

function requireScope(...scopes) {
  return (req, res, next) => {
    if (!req.apiToken) return next();   // not an API-key request — leave to other auth
    const granted = req.apiToken.scopes || [];
    if (granted.includes('*')) return next();
    const ok = scopes.some((s) => granted.includes(s));
    if (!ok) return res.status(403).json({ message: `API token lacks scope: ${scopes.join(' or ')}` });
    next();
  };
}

module.exports = { apiTokenAuth, requireScope };
