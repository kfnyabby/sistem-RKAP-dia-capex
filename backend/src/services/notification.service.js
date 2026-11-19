const notificationRepository = require('../repositories/notification.repository');

const getUserNotifications = async (userId, options = {}) => {
  const limit = Math.max(1, parseInt(options.limit || 20, 10));
  const offset = Math.max(0, parseInt(options.offset || 0, 10));
  const unreadOnly = options.unread_only === 'true' || options.unread_only === true;

  const [items, unreadCount] = await Promise.all([
    notificationRepository.findByUserId(userId, { unread_only: unreadOnly, limit, offset }),
    notificationRepository.countUnread(userId),
  ]);

  return {
    data: items,
    unread_count: unreadCount,
    meta: { limit, offset },
  };
};

const markNotificationRead = async (notificationId, userId) => {
  const updated = await notificationRepository.markAsRead(notificationId, userId);
  if (!updated) {
    const err = new Error('Notifikasi tidak ditemukan');
    err.status = 404;
    throw err;
  }
  const unreadCount = await notificationRepository.countUnread(userId);
  return {
    success: true,
    data: updated,
    unread_count: unreadCount,
  };
};

const markAllNotificationsRead = async (userId) => {
  const count = await notificationRepository.markAllAsRead(userId);
  return {
    success: true,
    marked_count: count,
    unread_count: 0,
  };
};

module.exports = {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
