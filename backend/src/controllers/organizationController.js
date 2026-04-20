const Organization = require('../models/Organization');

exports.create = async (req, res, next) => {
  try {
    const org = await Organization.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ organization: org });
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, active } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { keywords: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';

    // Non-super_admin can only see their org
    if (req.user && req.user.role !== 'super_admin' && req.user.organization) {
      query._id = req.user.organization;
    }

    const orgs = await Organization.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Organization.countDocuments(query);

    res.json({ organizations: orgs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// Public listing of active organizations
exports.getPublicList = async (req, res, next) => {
  try {
    const orgs = await Organization.find({ isActive: true })
      .select('name nameNp slug description logo category branding')
      .sort({ name: 1 })
      .lean();
    res.json({ organizations: orgs });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ organization: org });
  } catch (error) { next(error); }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const org = await Organization.findOne({ slug: req.params.slug, isActive: true });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ organization: org });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const org = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ organization: org });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    await Organization.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Organization deactivated' });
  } catch (error) { next(error); }
};
