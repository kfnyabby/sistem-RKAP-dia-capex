const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const healthRoutes = require('./health.routes');
const requireAuth = require('../middleware/requireAuth');
const requireUnitAccess = require('../middleware/requireUnitAccess');

const router = express.Router();

// Modul Auth & Users
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Modul Health Check (starter)
router.use('/', healthRoutes);

// Endpoint uji otorisasi unit (untuk verifikasi requireUnitAccess)
router.get('/test-unit-access/:unit_id', requireAuth, requireUnitAccess, (req, res) => {
  res.json({
    success: true,
    message: 'Akses unit diberikan',
    unit_id: req.params.unit_id,
  });
});

module.exports = router;
