const express = require('express');
const notificationController = require('../controllers/notification.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

router.get('/notifications', notificationController.getNotifications);
router.patch('/notifications/:id/read', notificationController.markRead);
router.post('/notifications/read-all', notificationController.markAllRead);

module.exports = router;
