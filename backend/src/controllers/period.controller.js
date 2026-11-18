const periodService = require('../services/period.service');
const { createPeriodSchema } = require('../validators/period.validator');

const getPeriods = async (req, res, next) => {
  try {
    const { company_id } = req.query;
    const periods = await periodService.listPeriods(company_id);
    res.json(periods);
  } catch (err) {
    next(err);
  }
};

const createPeriod = async (req, res, next) => {
  try {
    const validatedData = createPeriodSchema.parse(req.body);
    const result = await periodService.createPeriod(validatedData, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPeriods,
  createPeriod,
};

