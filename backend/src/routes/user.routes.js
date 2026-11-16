const express = require('express');
const userController = require('../controllers/user.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Seluruh endpoint manajemen pengguna memerlukan role Akuntansi (Super Admin)
router.use(requireAuth, requireRole(['akuntansi']));

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.updateStatus);
router.put('/:id/units', userController.updateUnits);

module.exports = router;

