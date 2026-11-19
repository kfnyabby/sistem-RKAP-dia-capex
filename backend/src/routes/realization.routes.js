const express = require('express');
const realizationController = require('../controllers/realization.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Seluruh rute realisasi memerlukan autentikasi login
router.use(requireAuth);

// 1. Endpoint Import & Pengelolaan Batch (Khusus Akuntansi)
router.post(
  '/realization-imports',
  requireRole(['akuntansi']),
  realizationController.uploadMiddleware,
  realizationController.createImport
);

router.get(
  '/realization-imports',
  requireRole(['akuntansi']),
  realizationController.listImports
);

router.get(
  '/realization-imports/:id',
  requireRole(['akuntansi']),
  realizationController.getImportDetail
);

router.get(
  '/realization-imports/:id/unmapped-units',
  requireRole(['akuntansi']),
  realizationController.getUnmappedUnits
);

router.get(
  '/realization-imports/:id/errors',
  requireRole(['akuntansi']),
  realizationController.getErrors
);

router.put(
  '/unit-aliases',
  requireRole(['akuntansi']),
  realizationController.updateUnitAlias
);

router.post(
  '/realization-imports/:id/confirm',
  requireRole(['akuntansi']),
  realizationController.confirmImport
);

router.delete(
  '/realization-imports/:id',
  requireRole(['akuntansi']),
  realizationController.rollbackImport
);

// 2. Endpoint Realisasi Anggaran (Dapat diakses Akuntansi, Manager, dan PIC; filter unit di repository)
router.get(
  '/realizations',
  realizationController.getRealizations
);

module.exports = router;
