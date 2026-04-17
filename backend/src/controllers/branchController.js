const Branch = require('../models/Branch');

exports.create = async (req, res, next) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json({ branch });
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { organization, page = 1, limit = 50, search, active } = req.query;
    const query = {};
    if (organization) query.organization = organization;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (active !== undefined) query.isActive = active === 'true';

    // Scope to user's org if not super admin
    if (req.user && req.user.role !== 'super_admin' && req.user.organization) {
      query.organization = req.user.organization;
    }

    const branches = await Branch.find(query)
      .populate('organization', 'name slug')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Branch.countDocuments(query);

    res.json({ branches, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// Public listing for an organization
exports.getPublicByOrg = async (req, res, next) => {
  try {
    const branches = await Branch.find({ organization: req.params.orgId, isActive: true })
      .select('name code address province district city location workingHours holidays phone email maxConcurrentBookings')
      .sort({ name: 1 });
    res.json({ branches });
  } catch (error) { next(error); }
};

// Find nearest branches
exports.findNearest = async (req, res, next) => {
  try {
    const { lng, lat, orgId, maxDistance = 50000 } = req.query;
    if (!lng || !lat) return res.status(400).json({ message: 'lng and lat required' });

    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance),
        }
      }
    };
    if (orgId) query.organization = orgId;

    const branches = await Branch.find(query)
      .populate('organization', 'name slug')
      .limit(10);

    // Calculate distance
    const branchesWithDistance = branches.map(b => {
      const bObj = b.toObject();
      const R = 6371;
      const dLat = (b.location.coordinates[1] - parseFloat(lat)) * Math.PI / 180;
      const dLon = (b.location.coordinates[0] - parseFloat(lng)) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(parseFloat(lat) * Math.PI / 180) * Math.cos(b.location.coordinates[1] * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      bObj.distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return bObj;
    });

    res.json({ branches: branchesWithDistance });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('organization', 'name slug settings');
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.json({ branch });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.json({ branch });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await Branch.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Branch deactivated' });
  } catch (error) { next(error); }
};

// Manage holidays
exports.addHoliday = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    branch.holidays.push(req.body);
    await branch.save();
    res.json({ branch });
  } catch (error) { next(error); }
};

exports.removeHoliday = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    branch.holidays = branch.holidays.filter(h =>
      new Date(h.date).getTime() !== new Date(req.params.holidayDate).getTime()
    );
    await branch.save();
    res.json({ branch });
  } catch (error) { next(error); }
};

// Update working hours
exports.updateWorkingHours = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    branch.workingHours = req.body.workingHours;
    await branch.save();
    res.json({ branch });
  } catch (error) { next(error); }
};
