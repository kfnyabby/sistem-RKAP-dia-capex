const express = require('express');
const reportController = require('../controllers/report.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/reports/expense-by-coa', reportController.getExpenseByCoa);
router.get('/reports/investment-summary', reportController.getInvestmentSummary);
router.get('/reports/consolidated', reportController.getConsolidated);
router.get('/reports/matrix', reportController.getMatrix);
router.get('/reports/export', reportController.exportReport);

module.exports = router;
