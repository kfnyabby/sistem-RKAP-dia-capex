const express = require('express');
const submissionAccessController = require('../controllers/submissionAccess.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// Cek akses efektif dokumen (semua user yang login)
router.get('/budget-docs/:id/access', submissionAccessController.getDocAccess);

// Pengaturan deadline & buka/tutup oleh Akuntansi
router.put(
  '/periods/:id/deadlines',
  requireRole(['akuntansi']),
  submissionAccessController.updateDeadlines
);

router.post(
  '/periods/:id/toggle-submission',
  requireRole(['akuntansi']),
  submissionAccessController.toggleSubmission
);

router.get(
  '/periods/:id/unit-access',
  requireRole(['akuntansi', 'manager']),
  submissionAccessController.getUnitAccess
);

router.post(
  '/submission-access',
  requireRole(['akuntansi']),
  submissionAccessController.overrideUnit
);

router.post(
  '/submission-access/bulk',
  requireRole(['akuntansi']),
  submissionAccessController.bulkOverride
);

module.exports = router;
