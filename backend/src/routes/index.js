const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const healthRoutes = require('./health.routes');
const masterRoutes = require('./master.routes');
const periodRoutes = require('./period.routes');
const budgetRoutes = require('./budget.routes');
const newItemRequestRoutes = require('./newItemRequest.routes');
const investmentRoutes = require('./investment.routes');
const realizationRoutes = require('./realization.routes');
const workflowRoutes = require('./workflow.routes');
const submissionAccessRoutes = require('./submissionAccess.routes');
const notificationRoutes = require('./notification.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportRoutes = require('./report.routes');
const auditLogRoutes = require('./auditLog.routes');
const settingRoutes = require('./setting.routes');
const docsRoutes = require('./docs.routes');
const requireAuth = require('../middleware/requireAuth');
const requireUnitAccess = require('../middleware/requireUnitAccess');

const router = express.Router();

// Modul Health Check & OpenAPI Docs (publik - tanpa auth)
router.use('/', healthRoutes);
router.use('/docs', docsRoutes);

// Modul Auth & Users
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Modul Master Data (Fase 2)
router.use('/', masterRoutes);

// Modul Periode, Workflow Approval, & Submission Access (Fase 5)
router.use('/', periodRoutes);
router.use('/', workflowRoutes);
router.use('/', submissionAccessRoutes);
router.use('/', notificationRoutes);

// Modul Dokumen Anggaran & Entry (Fase 3, 3b & 4)
router.use('/', budgetRoutes);
router.use('/', newItemRequestRoutes);
router.use('/', investmentRoutes);

// Modul Realisasi Jurnal Buku Besar (Fase 6)
router.use('/', realizationRoutes);

// Modul Dashboard & Laporan (Fase 7)
router.use('/', dashboardRoutes);
router.use('/', reportRoutes);

// Modul Audit Logs & Pengaturan Sistem (Fase 8)
router.use('/audit-logs', auditLogRoutes);
router.use('/settings', settingRoutes);

// Endpoint uji otorisasi unit (untuk verifikasi requireUnitAccess)
router.get('/test-unit-access/:unit_id', requireAuth, requireUnitAccess, (req, res) => {
  res.json({
    success: true,
    message: 'Akses unit diberikan',
    unit_id: req.params.unit_id,
  });
});

// Endpoint uji fail-closed requireUnitAccess saat parameter unit tidak ditentukan
router.get('/test-unit-access-failclosed', requireAuth, requireUnitAccess, (req, res) => {
  res.json({
    success: true,
    message: 'Akses diberikan',
  });
});

module.exports = router;
