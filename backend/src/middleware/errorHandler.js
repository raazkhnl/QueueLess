const logger = require('../config/logger');

const ERROR_CODES = {
  VALIDATION_ERROR: { code: 'E_VALIDATION', status: 400 },
  DUPLICATE_KEY: { code: 'E_DUPLICATE', status: 409 },
  NOT_FOUND: { code: 'E_NOT_FOUND', status: 404 },
  UNAUTHORIZED: { code: 'E_UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'E_FORBIDDEN', status: 403 },
  SLOT_UNAVAILABLE: { code: 'E_SLOT_UNAVAILABLE', status: 409 },
  RATE_LIMIT: { code: 'E_RATE_LIMIT', status: 429 },
  INTERNAL: { code: 'E_INTERNAL', status: 500 },
};

const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message}`, { 
    stack: err.stack, 
    url: req.originalUrl, 
    method: req.method,
    user: req.user?._id,
  });

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      code: ERROR_CODES.VALIDATION_ERROR.code, 
      message: 'Validation error', 
      errors: messages 
    });
  }

  // Mongoose duplicate
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ 
      code: ERROR_CODES.DUPLICATE_KEY.code, 
      message: `Duplicate value for ${field}`,
      field 
    });
  }

  // Mongoose cast
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      code: ERROR_CODES.VALIDATION_ERROR.code, 
      message: `Invalid ${err.path}: ${err.value}` 
    });
  }

  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ code: ERROR_CODES.UNAUTHORIZED.code, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ code: ERROR_CODES.UNAUTHORIZED.code, message: 'Token expired' });
  }

  // Multer
  if (err.name === 'MulterError') {
    return res.status(400).json({ code: ERROR_CODES.VALIDATION_ERROR.code, message: err.message });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    code: statusCode >= 500 ? ERROR_CODES.INTERNAL.code : 'E_ERROR',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
module.exports.ERROR_CODES = ERROR_CODES;
