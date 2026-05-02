const cron = require('node-cron');
const Issue = require('../models/Issue');
const { calculateStuckTimeSeconds } = require('../utils/delayTracker');

const ACTIVE_STATUSES = ['open', 'in_progress', 'forwarded', 'reopened', 'awaiting_user'];

/**
 * Escalation Cron — runs hourly. Promotes any active ticket whose SLA window
 * has passed to status 'escalated' and appends a history event.
 */
const checkAndEscalateIssues = async () => {
  try {
    const now = Date.now();
    const candidates = await Issue.find({ status: { $in: ACTIVE_STATUSES } }).populate('issueType');

    for (const issue of candidates) {
      const slaHours = issue.issueType?.slaHours || issue.issueType?.estimatedSLA || 48;
      const slaDue = issue.slaDueDate ? new Date(issue.slaDueDate).getTime()
        : new Date(issue.slaStartTime || issue.createdAt).getTime() + slaHours * 3600 * 1000;

      if (now > slaDue) {
        const fromStatus = issue.status;
        const stuck = calculateStuckTimeSeconds(issue.slaStartTime || issue.createdAt);
        issue.status = 'escalated';
        issue.history.push({
          action: 'escalated',
          fromStatus,
          toStatus: 'escalated',
          stuckTimeSeconds: stuck,
          reason: 'SLA breached',
          actorName: 'System (SLA Monitor)'
        });
        await issue.save();
      }
    }
  } catch (error) {
    console.error('Error in escalation cron:', error.message);
  }
};

const startEscalationCron = () => {
  cron.schedule('0 * * * *', () => { checkAndEscalateIssues(); });
};

module.exports = { checkAndEscalateIssues, startEscalationCron, ACTIVE_STATUSES };
