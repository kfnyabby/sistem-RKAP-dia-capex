const db = require('../../db');

/**
 * Mengambil nilai setting berdasarkan key.
 * Mengembalikan defaultValue bila key tidak ditemukan.
 */
const getSetting = async (key, defaultValue = null, client = db) => {
  const res = await client.query('SELECT value FROM settings WHERE key = $1', [key]);
  if (res.rows.length === 0) {
    return defaultValue;
  }
  return res.rows[0].value;
};

/**
 * Menyimpan atau memperbarui setting (upsert).
 */
const setSetting = async (key, value, description = null, userId = null, client = db) => {
  const res = await client.query(
    `INSERT INTO settings (key, value, description, updated_at, created_by)
     VALUES ($1, $2, $3, NOW(), $4)
     ON CONFLICT (key)
     DO UPDATE SET 
       value = EXCLUDED.value, 
       description = COALESCE(EXCLUDED.description, settings.description), 
       updated_at = NOW()
     RETURNING *`,
    [key, JSON.stringify(value), description, userId]
  );
  return res.rows[0];
};

module.exports = {
  getSetting,
  setSetting,
};
