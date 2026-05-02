/**
 * Atomic monotonic counter — used for gov-style दर्ता / file numbers and any
 * other case where a deterministic, sequential, per-scope id is needed.
 *
 * Key format convention: "<resource>:<scope>" — e.g. "appointment:IRD-10:2082-83".
 * findOneAndUpdate with $inc + upsert is atomic in MongoDB so it's safe under
 * concurrency without an extra lock.
 */
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true });

counterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
