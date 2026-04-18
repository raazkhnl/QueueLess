/**
 * No-Show Service
 * Cron job that auto-marks appointments as 'no_show' when the appointment
 * time has passed and the citizen hasn't checked in.
 * Runs every 30 minutes.
 */
const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { triggerWebhooks } = require('./webhookService');
const logger = require('../config/logger');

const NO_SHOW_GRACE_MINUTES = parseInt(process.env.NO_SHOW_GRACE_MINUTES) || 30;

const startNoShowCron = () => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      logger.info('Running no-show check...');

      const now = new Date();
      const graceTime = new Date(now.getTime() - NO_SHOW_GRACE_MINUTES * 60 * 1000);

      // Find confirmed appointments whose slot has passed + grace period
      const overdueAppointments = await Appointment.find({
        status: 'confirmed',
        date: { $lte: graceTime },
      }).populate('organization', '_id');

      // Also check by matching date + time more precisely
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayConfirmed = await Appointment.find({
        status: 'confirmed',
        date: { $gte: today, $lte: todayEnd },
      }).populate('organization', '_id');

      const parseTime = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // Combine: past-date confirmed + today's overdue
      const toMark = [
        ...overdueAppointments,
        ...todayConfirmed.filter(a => {
          const endMin = parseTime(a.endTime);
          return (endMin + NO_SHOW_GRACE_MINUTES) <= nowMinutes;
        }),
      ];

      // Deduplicate by ID
      const seen = new Set();
      const unique = toMark.filter(a => {
        if (seen.has(a._id.toString())) return false;
        seen.add(a._id.toString());
        return true;
      });

      let marked = 0;
      for (const apt of unique) {
        try {
          apt.status = 'no_show';
          await apt.save();
          marked++;
          triggerWebhooks(apt.organization?._id || apt.organization, 'appointment.no_show', apt).catch(() => {});
        } catch (err) {
          logger.error(`Failed to mark no-show for ${apt.refCode}: ${err.message}`);
        }
      }

      if (marked > 0) {
        logger.info(`Auto-marked ${marked} appointments as no-show`);
      }
    } catch (err) {
      logger.error(`No-show cron error: ${err.message}`);
    }
  });

  logger.info(`No-show cron job started (runs every 30min, grace period: ${NO_SHOW_GRACE_MINUTES}min)`);
};

module.exports = { startNoShowCron };
