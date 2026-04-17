const Joi = require('joi');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });
    if (error) {
      const errors = error.details.map(d => d.message.replace(/"/g, ''));
      return res.status(400).json({ message: 'Validation error', errors });
    }
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
  }),
  createOrg: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    slug: Joi.string().max(100).allow('', null),
    category: Joi.string().valid('government','healthcare','education','finance','salon','legal','other'),
    email: Joi.string().email().allow('', null),
  }),
  createBranch: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    code: Joi.string().min(2).max(20).required(),
    address: Joi.string().min(3).max(500).required(),
    organization: Joi.string().hex().length(24).required(),
  }),
  createUser: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('super_admin','org_admin','branch_manager','staff','citizen'),
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
};

module.exports = { validate, schemas };
