/**
 * Scoped API tokens for tenant integrations.
 *
 * Tokens are minted by an org admin (or super-admin) and stored hashed (sha-256).
 * The middleware in middleware/apiToken.js validates the bearer-style header
 * `X-API-Key: <token>`, looks up by hash, increments lastUsedAt, and attaches
 * a synthetic `req.apiToken` plus `req.user` (the token's organization context).
 *
 * Per-token scopes: array of strings like 'appointments:read', 'issues:write'.
 * Per-token rate limiting is keyed on the token id in middleware/rateLimit.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const apiTokenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  prefix: { type: String, required: true, index: true },        // first 8 chars, shown for ID
  hash: { type: String, required: true, unique: true },          // sha-256 of full token
  scopes: [{ type: String }],
  rateLimitPerMinute: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
  lastUsedAt: { type: Date },
  expiresAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

apiTokenSchema.statics.mint = async function mint({ name, organization, scopes = [], expiresAt, createdBy, rateLimitPerMinute }) {
  // Format: ql_<env>_<24-byte-base64url>
  const env = (process.env.NODE_ENV || 'dev').slice(0, 4);
  const raw = crypto.randomBytes(24).toString('base64url');
  const token = `ql_${env}_${raw}`;
  const prefix = token.slice(0, 12);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const doc = await this.create({ name, organization, prefix, hash, scopes, expiresAt, createdBy, rateLimitPerMinute });
  return { doc, token };
};

apiTokenSchema.statics.verify = async function verify(plainToken) {
  if (!plainToken) return null;
  const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const doc = await this.findOne({ hash, isActive: true });
  if (!doc) return null;
  if (doc.expiresAt && doc.expiresAt < new Date()) return null;
  doc.lastUsedAt = new Date();
  doc.save().catch(() => {});
  return doc;
};

module.exports = mongoose.model('ApiToken', apiTokenSchema);
