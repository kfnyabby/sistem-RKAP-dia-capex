const reportService = require('../services/report.service');
const reportExportService = require('../services/reportExport.service');

const getExpenseByCoa = async (req, res, next) => {
  try {
    const data = await reportService.getExpenseByCoa(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const getInvestmentSummary = async (req, res, next) => {
  try {
    const data = await reportService.getInvestmentSummary(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const getConsolidated = async (req, res, next) => {
  try {
    const data = await reportService.getConsolidated(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const getMatrix = async (req, res, next) => {
  try {
    const data = await reportService.getMatrix(req.query, req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const exportReport = async (req, res, next) => {
  try {
    const { buffer, filename } = await reportExportService.generateReportExport(req.query, req.user);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getExpenseByCoa,
  getInvestmentSummary,
  getConsolidated,
  getMatrix,
  exportReport,
};
