require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1); // Trust reverse proxies (e.g. Nginx, Docker) for accurate rate limiting IPs.

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Requested-With'],
}));

// Request ID middleware — generates a unique ID per request for tracing
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

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

// Health check — includes MongoDB connectivity status
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const isHealthy = dbState === 1;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    version: '2.1.0',
    database: dbStates[dbState] || 'unknown',
    uptime: Math.floor(process.uptime()),
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')));
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;

const start = async () => {
  await connectDB();

  // Start reminder cron
  try {
    const { startReminderCron } = require('./services/reminderService');
    startReminderCron();
  } catch (err) {
    logger.warn('Reminder cron failed to start: ' + err.message);
  }

  // Start no-show cron
  try {
    const { startNoShowCron } = require('./services/noShowService');
    startNoShowCron();
  } catch (err) {
    logger.warn('No-show cron failed to start: ' + err.message);
  }

  server = app.listen(PORT, () => {
    logger.info(`QueueLess API v2.1 running on port ${PORT} (${process.env.NODE_ENV})`);
    logger.info(`API Docs: http://localhost:${PORT}/api/docs`);
  });
};

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      } catch (err) {
        logger.error('Error closing MongoDB: ' + err.message);
      }
      process.exit(0);
    });
    // Force shutdown after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
module.exports = app;
