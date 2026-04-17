const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Organization = require('../models/Organization');
const { sendEmail, emailTemplates } = require('./emailService');
const logger = require('../config/logger');

const startReminderCron = () => {
  // Run every hour to check for appointments needing reminders
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running appointment reminder check...');

      const orgs = await Organization.find({ isActive: true, 'settings.emailEnabled': true });

      for (const org of orgs) {
        const reminderHours = org.settings.reminderHoursBefore || 24;
        const reminderTime = new Date();
        reminderTime.setHours(reminderTime.getHours() + reminderHours);

        const reminderWindowStart = new Date(reminderTime);
        reminderWindowStart.setMinutes(reminderWindowStart.getMinutes() - 30);
        const reminderWindowEnd = new Date(reminderTime);
        reminderWindowEnd.setMinutes(reminderWindowEnd.getMinutes() + 30);

        const appointments = await Appointment.find({
          organization: org._id,
          date: { $gte: reminderWindowStart, $lte: reminderWindowEnd },
          status: { $in: ['confirmed', 'pending'] },
          reminderSent: false,
        }).populate('branch', 'name')
          .populate('appointmentType', 'name')
          .populate('citizen', 'name email');

        let sentCount = 0;
        for (const apt of appointments) {
          const email = apt.citizen?.email || apt.guestEmail;
          if (!email) continue;

          try {
            const template = emailTemplates.bookingReminder({
              name: apt.citizen?.name || apt.guestName || 'User',
              refCode: apt.refCode,
              serviceName: apt.appointmentType?.name || '',
              branchName: apt.branch?.name || '',
              date: new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              startTime: apt.startTime,
              endTime: apt.endTime,
              tokenNumber: apt.tokenNumber,
            });
            await sendEmail({ to: email, subject: template.subject, html: template.html });
            apt.reminderSent = true;
            await apt.save();
            sentCount++;
          } catch (err) {
            logger.error(`Reminder email failed for ${apt.refCode}: ${err.message}`);
          }
        }

        if (sentCount > 0) logger.info(`Sent ${sentCount} reminders for ${org.name}`);
      }
    } catch (err) {
      logger.error(`Reminder cron error: ${err.message}`);
    }
  });

  logger.info('Reminder cron job started (runs every hour)');
};

module.exports = { startReminderCron };
