/**
 * AppointmentType Controller
 * CRUD for service types with suspend/activate functionality.
 */
const AppointmentType = require('../models/AppointmentType');
const { logAction } = require('../utils/auditLog');

exports.create = async (req, res, next) => {
  try {
    const apptType = await AppointmentType.create(req.body);
    logAction(req, { action: 'create', resource: 'appointment_type', resourceId: apptType._id, details: `Created service: ${apptType.name}` });
    res.status(201).json({ appointmentType: apptType });
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { organization, branch, active } = req.query;
    const query = {};
    if (organization) query.organization = organization;
    if (active !== undefined) query.isActive = active === 'true';
    if (branch) query.$or = [{ branches: branch }, { branches: { $size: 0 } }];
    if (req.user && req.user.role !== 'super_admin' && req.user.organization) {
      query.organization = req.user.organization;
    }
    const types = await AppointmentType.find(query).populate('branches', 'name code').sort({ sortOrder: 1, name: 1 });
    res.json({ appointmentTypes: types });
  } catch (error) { next(error); }
};

exports.getPublicByOrg = async (req, res, next) => {
  try {
    const { branch } = req.query;
    const query = { organization: req.params.orgId, isActive: true, isSuspended: { $ne: true } };
    if (branch) query.$or = [{ branches: branch }, { branches: { $size: 0 } }];
    const types = await AppointmentType.find(query)
      .select('name nameNp slug description duration bufferTime price mode color icon customFields maxBookingsPerSlot requiresApproval sortOrder isSuspended roomNo roomNoNp')
      .sort({ sortOrder: 1, name: 1 });
    res.json({ appointmentTypes: types });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const t = await AppointmentType.findById(req.params.id).populate('branches', 'name code');
    if (!t) return res.status(404).json({ message: 'Appointment type not found' });
    res.json({ appointmentType: t });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const t = await AppointmentType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!t) return res.status(404).json({ message: 'Appointment type not found' });
    logAction(req, { action: 'update', resource: 'appointment_type', resourceId: t._id, details: `Updated: ${t.name}` });
    res.json({ appointmentType: t });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await AppointmentType.findByIdAndUpdate(req.params.id, { isActive: false });
    logAction(req, { action: 'delete', resource: 'appointment_type', resourceId: req.params.id });
    res.json({ message: 'Appointment type deactivated' });
  } catch (error) { next(error); }
};

// Suspend / Activate service
exports.toggleSuspend = async (req, res, next) => {
  try {
    const { suspend, reason } = req.body;
    const t = await AppointmentType.findByIdAndUpdate(req.params.id, {
      isSuspended: suspend,
      suspendReason: suspend ? (reason || 'Temporarily suspended') : '',
    }, { new: true });
    if (!t) return res.status(404).json({ message: 'Not found' });
    logAction(req, { action: 'update', resource: 'appointment_type', resourceId: t._id, details: suspend ? `Suspended: ${t.name}` : `Activated: ${t.name}` });
    res.json({ appointmentType: t, message: suspend ? 'Service suspended' : 'Service activated' });
  } catch (error) { next(error); }
};
