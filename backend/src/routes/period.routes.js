const express = require('express');
const periodController = require('../controllers/period.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

router.get('/periods', periodController.getPeriods);
router.post('/periods', requireRole(['akuntansi']), periodController.createPeriod);

module.exports = router;

