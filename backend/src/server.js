require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// HTTP request logging via Winston
app.use(morgan('short', { stream: logger.stream }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API Docs
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'QueueLess API Documentation',
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/appointment-types', require('./routes/appointmentTypes'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/app-config', require('./routes/appConfig'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/notification-templates', require('./routes/notificationTemplates'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/staff-availability', require('./routes/staffAvailability'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV, version: '2.0.0' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')));
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const start = async () => {
  await connectDB();

  // Start reminder cron
  try {
    const { startReminderCron } = require('./services/reminderService');
    startReminderCron();
  } catch (err) {
    logger.warn('Reminder cron failed to start: ' + err.message);
  }

  app.listen(PORT, () => {
    logger.info(`QueueLess API v2.0 running on port ${PORT} (${process.env.NODE_ENV})`);
    logger.info(`API Docs: http://localhost:${PORT}/api/docs`);
  });
};
start();
module.exports = app;
