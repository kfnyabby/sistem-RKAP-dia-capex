const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const healthRoutes = require('./health.routes');
const masterRoutes = require('./master.routes');
const periodRoutes = require('./period.routes');
const budgetRoutes = require('./budget.routes');
const newItemRequestRoutes = require('./newItemRequest.routes');
const realizationRoutes = require('./realization.routes');
const requireAuth = require('../middleware/requireAuth');
const requireUnitAccess = require('../middleware/requireUnitAccess');

const router = express.Router();

// Modul Health Check (starter - tanpa auth)
router.use('/', healthRoutes);

// Modul Auth & Users
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Modul Master Data (Fase 2)
router.use('/', masterRoutes);

// Modul Periode & Dokumen Anggaran (Fase 3 & 3b)
router.use('/', periodRoutes);
router.use('/', budgetRoutes);
router.use('/', newItemRequestRoutes);

// Modul Realisasi Jurnal Buku Besar (Fase 6)
router.use('/', realizationRoutes);

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
