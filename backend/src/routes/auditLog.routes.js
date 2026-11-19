const express = require('express');
const auditLogController = require('../controllers/auditLog.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// GET /api/audit-logs (Akuntansi semua, Manager sebatas cakupan, PIC ditolak 403)
router.get('/', requireAuth, requireRole(['akuntansi', 'manager']), auditLogController.getAuditLogs);

module.exports = router;
