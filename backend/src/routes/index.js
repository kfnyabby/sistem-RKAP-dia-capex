const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const healthRoutes = require('./health.routes');
const masterRoutes = require('./master.routes');
const requireAuth = require('../middleware/requireAuth');
const requireUnitAccess = require('../middleware/requireUnitAccess');
const budgetDocRepository = require('../repositories/budgetDoc.repository');

const router = express.Router();

// Modul Health Check (starter - tanpa auth)
router.use('/', healthRoutes);

// Modul Auth & Users
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Modul Master Data (Fase 2)
router.use('/', masterRoutes);

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

// Endpoint pembacaan dokumen anggaran dengan filter unit pengguna (data isolation)
router.get('/budget-docs/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await budgetDocRepository.findById(req.params.id, req.user);
    if (!doc) {
      return res.status(403).json({
        message: 'Akses ditolak: Anda tidak memiliki akses ke dokumen unit ini',
      });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
