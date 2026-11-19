const dashboardService = require('../services/dashboard.service');

const getSummary = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const getProgress = async (req, res, next) => {
  try {
    const data = await dashboardService.getProgress(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const getBudgetVsRealization = async (req, res, next) => {
  try {
    const data = await dashboardService.getBudgetVsRealization(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getProgress,
  getBudgetVsRealization,
};
