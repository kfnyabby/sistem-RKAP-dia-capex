const db = require('../../db');

const create = async (logData, client = db) => {
  const {
    type,
    filename = null,
    total_read = 0,
    matched_existing = 0,
    new_items = 0,
    coa_changed = 0,
    hpp_zero = 0,
    missing_coa = 0,
    unknown_coa = 0,
    raw_summary = {},
    created_by = null,
  } = logData;

  const sql = `
    INSERT INTO import_logs (
      type, filename, total_read, matched_existing, new_items,
      coa_changed, hpp_zero, missing_coa, unknown_coa, raw_summary, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  const res = await client.query(sql, [
    type,
    filename,
    total_read,
    matched_existing,
    new_items,
    coa_changed,
    hpp_zero,
    missing_coa,
    unknown_coa,
    JSON.stringify(raw_summary),
    created_by,
  ]);
  return res.rows[0];
};

const getLatest = async (type, client = db) => {
  const sql = `
    SELECT il.*, u.name as user_name
    FROM import_logs il
    LEFT JOIN users u ON il.created_by = u.id
    WHERE il.type = $1
    ORDER BY il.id DESC
    LIMIT 1
  `;
  const res = await client.query(sql, [type]);
  return res.rows[0] || null;
};

module.exports = {
  create,
  getLatest,
};

