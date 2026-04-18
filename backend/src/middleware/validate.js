const Joi = require('joi');

// Simple HTML tag stripper for XSS prevention
const stripHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
};

// Recursively sanitize string values in an object
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') return stripHtml(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
};

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
    if (error) {
      const errors = error.details.map(d => d.message.replace(/"/g, ''));
      return res.status(400).json({ message: 'Validation error', errors });
    }
    // Replace with sanitized + validated values
    req[property] = sanitizeObject(value);
    next();
  };
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().pattern(/^[+]?[0-9]{7,15}$/).allow('', null),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  booking: Joi.object({
    organization: Joi.string().hex().length(24).required(),
    branch: Joi.string().hex().length(24).required(),
    appointmentType: Joi.string().hex().length(24).required(),
    date: Joi.string().required(),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    guestName: Joi.string().max(200).allow('', null),
    guestEmail: Joi.string().email().allow('', null),
    guestPhone: Joi.string().allow('', null),
    notes: Joi.string().max(500).allow('', null),
    mode: Joi.string().valid('in_person', 'virtual').allow('', null),
    customFieldValues: Joi.object().pattern(Joi.string(), Joi.any()).allow(null),
    externalSubmissionNo: Joi.string().max(100).allow('', null),
    sourceSystem: Joi.string().max(50).allow('', null),
  }),
  createOrg: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    slug: Joi.string().max(100).allow('', null),
    category: Joi.string().valid('government','healthcare','education','finance','salon','legal','other'),
    email: Joi.string().email().allow('', null),
    description: Joi.string().max(1000).allow('', null),
    phone: Joi.string().max(20).allow('', null),
    address: Joi.string().max(500).allow('', null),
    website: Joi.string().uri().allow('', null),
  }),
  createBranch: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    code: Joi.string().min(2).max(20).required(),
    address: Joi.string().min(3).max(500).required(),
    organization: Joi.string().hex().length(24).required(),
    phone: Joi.string().max(20).allow('', null),
    email: Joi.string().email().allow('', null),
    province: Joi.string().max(100).allow('', null),
    district: Joi.string().max(100).allow('', null),
    city: Joi.string().max(100).allow('', null),
  }),
  createUser: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('super_admin','org_admin','branch_manager','staff','citizen'),
    phone: Joi.string().pattern(/^[+]?[0-9]{7,15}$/).allow('', null),
    organization: Joi.string().hex().length(24).allow(null),
    branch: Joi.string().hex().length(24).allow(null),
  }),
  feedback: Joi.object({
    appointment: Joi.string().hex().length(24).required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().max(1000).allow('', null),
    staffRating: Joi.number().min(1).max(5).allow(null),
    waitTimeRating: Joi.number().min(1).max(5).allow(null),
    serviceRating: Joi.number().min(1).max(5).allow(null),
  }),
  reschedule: Joi.object({
    date: Joi.string().required(),
    startTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    endTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),
  resetPassword: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).max(128).required(),
  }),
};

module.exports = { validate, schemas, stripHtml, sanitizeObject };
