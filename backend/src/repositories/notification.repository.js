const db = require('../../db');

/**
 * Membuat satu notifikasi in-app
 */
const createNotification = async (data, client = null) => {
  const queryExecutor = client || db;
  const { user_id, title, body, link = null } = data;

  const query = `
    INSERT INTO notifications (user_id, title, body, link, is_read, created_at)
    VALUES ($1, $2, $3, $4, FALSE, NOW())
    RETURNING *
  `;
  const res = await queryExecutor.query(query, [user_id, title, body, link]);
  return res.rows[0];
};

/**
 * Membuat notifikasi massal
 */
const createBulkNotifications = async (notificationsList, client = null) => {
  if (!notificationsList || notificationsList.length === 0) return [];
  const queryExecutor = client || db;

  const values = [];
  const valueStrings = [];
  let paramIdx = 1;

  for (const n of notificationsList) {
    valueStrings.push(
      `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, FALSE, NOW())`
    );
    values.push(n.user_id, n.title, n.body, n.link || null);
    paramIdx += 4;
  }

  const query = `
    INSERT INTO notifications (user_id, title, body, link, is_read, created_at)
    VALUES ${valueStrings.join(', ')}
    RETURNING *
  `;

  const res = await queryExecutor.query(query, values);
  return res.rows;
};

/**
 * Mengambil daftar notifikasi pengguna
 */
const findByUserId = async (userId, options = {}) => {
  const { unread_only = false, limit = 20, offset = 0 } = options;

  let whereClauses = ['user_id = $1'];
  const params = [userId];
  let paramIdx = 2;

  if (unread_only) {
    whereClauses.push('is_read = FALSE');
  }

  const query = `
    SELECT id, user_id, title, body, link, is_read, created_at
    FROM notifications
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(limit, offset);

  const res = await db.query(query, params);
  return res.rows;
};

/**
 * Menghitung notifikasi belum dibaca
 */
const countUnread = async (userId) => {
  const res = await db.query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return parseInt(res.rows[0].count, 10);
};

/**
 * Tandai satu notifikasi sebagai dibaca
 */
const markAsRead = async (notificationId, userId, client = null) => {
  const queryExecutor = client || db;
  const res = await queryExecutor.query(
    `UPDATE notifications SET is_read = TRUE, updated_at = NOW() 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notificationId, userId]
  );
  return res.rows[0] || null;
};

/**
 * Tandai seluruh notifikasi pengguna sebagai dibaca
 */
const markAllAsRead = async (userId, client = null) => {
  const queryExecutor = client || db;
  const res = await queryExecutor.query(
    `UPDATE notifications SET is_read = TRUE, updated_at = NOW() 
     WHERE user_id = $1 AND is_read = FALSE 
     RETURNING id`,
    [userId]
  );
  return res.rowCount;
};

/**
 * Mencari pengguna penerima notifikasi berdasarkan unit dan peran
 */
const findTargetUserIds = async ({ unitId = null, roles = [] }) => {
  let query = '';
  const params = [];

  if (unitId && roles.length > 0) {
    query = `
      SELECT DISTINCT u.id 
      FROM users u
      LEFT JOIN user_unit_access uua ON uua.user_id = u.id
      WHERE u.is_active = TRUE 
        AND u.role = ANY($1::text[])
        AND (uua.unit_id = $2 OR u.role = 'akuntansi')
    `;
    params.push(roles, unitId);
  } else if (roles.length > 0) {
    query = `SELECT id FROM users WHERE is_active = TRUE AND role = ANY($1::text[])`;
    params.push(roles);
  } else if (unitId) {
    query = `
      SELECT DISTINCT u.id 
      FROM users u
      JOIN user_unit_access uua ON uua.user_id = u.id
      WHERE u.is_active = TRUE AND uua.unit_id = $1
    `;
    params.push(unitId);
  }

  if (!query) return [];
  const res = await db.query(query, params);
  return res.rows.map((r) => r.id);
};

const notifyRole = async (role, notificationData, client = null) => {
  const userIds = await findTargetUserIds({ roles: [role] });
  if (!userIds || userIds.length === 0) return [];
  const notifs = userIds.map((uid) => ({
    user_id: uid,
    title: notificationData.title,
    body: notificationData.body,
    link: notificationData.link || null,
  }));
  return await createBulkNotifications(notifs, client);
};

module.exports = {
  createNotification,
  createBulkNotifications,
  findByUserId,
  countUnread,
  markAsRead,
  markAllAsRead,
  findTargetUserIds,
  notifyRole,
};
