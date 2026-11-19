const db = require('../../db');

/**
 * Buat notifikasi tunggal untuk satu pengguna.
 */
const createNotification = async (
  { user_id, title, body, link = null, created_by = null },
  client = db
) => {
  const res = await client.query(
    `INSERT INTO notifications (user_id, title, body, link, is_read, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, FALSE, $5, NOW(), NOW())
     RETURNING *`,
    [user_id, title, body, link, created_by]
  );
  return res.rows[0];
};

/**
 * Buat notifikasi massal untuk seluruh pengguna aktif yang memiliki role tertentu.
 */
const notifyRole = async (
  role,
  { title, body, link = null, created_by = null },
  client = db
) => {
  const usersRes = await client.query(
    'SELECT id FROM users WHERE role = $1 AND is_active = TRUE',
    [role]
  );

  const notifications = [];
  for (const user of usersRes.rows) {
    const row = await createNotification(
      {
        user_id: user.id,
        title,
        body,
        link,
        created_by,
      },
      client
    );
    notifications.push(row);
  }
  return notifications;
};

module.exports = {
  createNotification,
  notifyRole,
};
