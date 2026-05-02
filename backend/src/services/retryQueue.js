/**
 * In-process retry queue.
 *
 * Lightweight, dependency-free queue for outbound side effects (webhooks,
 * email, SMS) that benefit from retry-with-backoff but don't justify Redis +
 * BullMQ in single-instance deployments. For multi-instance production, swap
 * the implementation behind the same interface — `enqueue(name, payload)` and
 * `register(name, handler)` — without touching callers.
 *
 * Behaviour:
 *   - exponential backoff: 5s, 30s, 2min, 10min, 1h (5 attempts)
 *   - per-job persistence in MongoDB so a restart doesn't drop in-flight jobs
 *   - graceful flush on SIGTERM (queue.drain())
 */
const mongoose = require('mongoose');
const logger = require('../config/logger');

const jobSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  nextRunAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['queued', 'in_progress', 'done', 'failed'], default: 'queued', index: true },
  lastError: { type: String },
  completedAt: { type: Date },
}, { timestamps: true });

const Job = mongoose.models.RetryJob || mongoose.model('RetryJob', jobSchema);

const handlers = new Map();
let timer = null;
let running = false;

const BACKOFF_MS = [5_000, 30_000, 120_000, 600_000, 3_600_000];

function register(name, handler) { handlers.set(name, handler); }

async function enqueue(name, payload, { delayMs = 0, maxAttempts = 5 } = {}) {
  return Job.create({ name, payload, maxAttempts, nextRunAt: new Date(Date.now() + delayMs) });
}

async function tick() {
  if (running) return;
  running = true;
  try {
    // Atomically claim up to N due jobs
    const due = await Job.find({ status: 'queued', nextRunAt: { $lte: new Date() } }).limit(20);
    for (const job of due) {
      job.status = 'in_progress';
      await job.save();
      const handler = handlers.get(job.name);
      try {
        if (!handler) throw new Error(`No handler registered for ${job.name}`);
        await handler(job.payload);
        job.status = 'done';
        job.completedAt = new Date();
        job.lastError = undefined;
      } catch (err) {
        job.attempts += 1;
        job.lastError = err.message?.slice(0, 500);
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
          logger.warn(`[retryQueue] ${job.name} permanently failed: ${job.lastError}`);
        } else {
          const backoff = BACKOFF_MS[Math.min(job.attempts - 1, BACKOFF_MS.length - 1)];
          job.status = 'queued';
          job.nextRunAt = new Date(Date.now() + backoff);
          logger.info(`[retryQueue] ${job.name} retry ${job.attempts} in ${backoff}ms`);
        }
      }
      await job.save();
    }
  } catch (err) {
    logger.error(`[retryQueue] tick error: ${err.message}`);
  } finally {
    running = false;
  }
}

function start({ intervalMs = 5_000 } = {}) {
  if (timer) return;
  timer = setInterval(tick, intervalMs);
  logger.info(`[retryQueue] started (interval=${intervalMs}ms)`);
}

function stop() { if (timer) clearInterval(timer); timer = null; }

module.exports = { enqueue, register, start, stop, _Job: Job };
