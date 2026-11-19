const notificationService = require('../services/notification.service');

const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const result = await notificationService.markNotificationRead(notifId, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsRead(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
};
