const express = require('express');
const authController = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/csrf', authController.getCsrf);
router.post('/login', loginRateLimiter, authController.login);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.put('/password', requireAuth, authController.updatePassword);

module.exports = router;

