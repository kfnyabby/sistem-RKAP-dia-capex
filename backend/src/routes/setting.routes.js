const express = require('express');
const settingController = require('../controllers/setting.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// GET /api/settings (Khusus Akuntansi)
router.get('/', requireAuth, requireRole('akuntansi'), settingController.getSettings);

// PUT /api/settings (Khusus Akuntansi)
router.put('/', requireAuth, requireRole('akuntansi'), settingController.updateSettings);

module.exports = router;
