const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard/summary', dashboardController.getSummary);
router.get('/dashboard/progress', dashboardController.getProgress);
router.get('/dashboard/budget-vs-realization', dashboardController.getBudgetVsRealization);

module.exports = router;
