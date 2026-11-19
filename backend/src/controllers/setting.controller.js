const settingService = require('../services/setting.service');

const getSettings = async (req, res, next) => {
  try {
    const result = await settingService.getSettings();
    res.json({
      success: true,
      data: result.settings,
      items: result.items,
    });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const result = await settingService.updateSettings(req.body, req.user);
    res.json({
      success: true,
      message: result.message,
      data: result.updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
