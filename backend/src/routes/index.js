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

// Helper unwrap ESM/CJS interop pada Vercel/esbuild
const unwrap = (m) => {
  if (!m) return m;
  let curr = m;
  while (curr && typeof curr === 'object' && (curr.default || curr.router)) {
    curr = curr.default || curr.router;
  }
  return typeof curr === 'function' ? curr : (curr && typeof curr.handle === 'function' ? curr.handle.bind(curr) : curr);
};

const router = express.Router();

// Modul Health Check & OpenAPI Docs (publik - tanpa auth)
router.use('/', unwrap(healthRoutes));
router.use('/docs', unwrap(docsRoutes));

// Modul Auth & Users
router.use('/auth', unwrap(authRoutes));
router.use('/users', unwrap(userRoutes));

// Modul Master Data (Fase 2)
router.use('/', unwrap(masterRoutes));

// Modul Periode, Workflow Approval, & Submission Access (Fase 5)
router.use('/', unwrap(periodRoutes));
router.use('/', unwrap(workflowRoutes));
router.use('/', unwrap(submissionAccessRoutes));
router.use('/', unwrap(notificationRoutes));

// Modul Dokumen Anggaran & Entry (Fase 3, 3b & 4)
router.use('/', unwrap(budgetRoutes));
router.use('/', unwrap(newItemRequestRoutes));
router.use('/', unwrap(investmentRoutes));

// Modul Realisasi Jurnal Buku Besar (Fase 6)
router.use('/', unwrap(realizationRoutes));

// Modul Dashboard & Laporan (Fase 7)
router.use('/', unwrap(dashboardRoutes));
router.use('/', unwrap(reportRoutes));

// Modul Audit Logs & Pengaturan Sistem (Fase 8)
router.use('/audit-logs', unwrap(auditLogRoutes));
router.use('/settings', unwrap(settingRoutes));

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
module.exports.default = router;
module.exports.router = router;
