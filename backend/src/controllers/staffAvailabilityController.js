const StaffAvailability = require('../models/StaffAvailability');
const User = require('../models/User');
const { logAction } = require('../utils/auditLog');

const defaultWeekly = [0,1,2,3,4,5,6].map(d => ({
  day: d, isAvailable: d !== 6 && d !== 0, startTime: '09:00', endTime: '17:00', maxAppointments: 10,
}));

exports.getByStaff = async (req, res, next) => {
  try {
    let avail = await StaffAvailability.findOne({ user: req.params.userId })
      .populate('user', 'name email specializations expertise')
      .populate('branch', 'name');
    if (!avail) {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      avail = { user: user.toJSON(), weeklySchedule: defaultWeekly, dateOverrides: [], recurringBlockouts: [] };
    }
    res.json({ availability: avail });
  } catch (error) { next(error); }
};

exports.upsert = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { branch, weeklySchedule, dateOverrides, recurringBlockouts } = req.body;
    
    const avail = await StaffAvailability.findOneAndUpdate(
      { user: userId },
      { user: userId, branch, weeklySchedule, dateOverrides, recurringBlockouts },
      { upsert: true, new: true, runValidators: true }
    );
    logAction(req, { action: 'update', resource: 'user', resourceId: userId, details: 'Updated staff availability' });
    res.json({ availability: avail });
  } catch (error) { next(error); }
};

exports.addDateOverride = async (req, res, next) => {
  try {
    const avail = await StaffAvailability.findOne({ user: req.params.userId });
    if (!avail) return res.status(404).json({ message: 'Create availability first' });
    avail.dateOverrides.push(req.body);
    await avail.save();
    res.json({ availability: avail });
  } catch (error) { next(error); }
};

exports.removeDateOverride = async (req, res, next) => {
  try {
    const avail = await StaffAvailability.findOne({ user: req.params.userId });
    if (!avail) return res.status(404).json({ message: 'Not found' });
    avail.dateOverrides = avail.dateOverrides.filter(
      d => new Date(d.date).toISOString().split('T')[0] !== req.params.date
    );
    await avail.save();
    res.json({ availability: avail });
  } catch (error) { next(error); }
};

// Get all staff availability for a branch (for scheduling view)
exports.getByBranch = async (req, res, next) => {
  try {
    const availabilities = await StaffAvailability.find({ branch: req.params.branchId })
      .populate('user', 'name email specializations expertise');
    res.json({ availabilities });
  } catch (error) { next(error); }
};
