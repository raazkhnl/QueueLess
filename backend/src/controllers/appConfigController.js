const AppConfig = require('../models/AppConfig');
const { logAction } = require('../utils/auditLog');

exports.get = async (req, res, next) => {
  try {
    let config = await AppConfig.findOne({ key: 'global' });
    if (!config) {
      config = await AppConfig.create({ key: 'global', supportedLanguages: ['en', 'ne'] });
    }
    res.json({ config });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const config = await AppConfig.findOneAndUpdate(
      { key: 'global' },
      { ...req.body, updatedBy: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );
    logAction(req, { action: 'settings_update', resource: 'settings', details: 'Updated app config' });
    res.json({ config });
  } catch (error) { next(error); }
};
