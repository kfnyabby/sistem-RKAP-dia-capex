const db = require('../../db');

/**
 * Mencari alias unit berdasarkan nama alias dan id perusahaan.
 */
const findAlias = async (companyId, aliasName, client = db) => {
  const sql = `
    SELECT ua.*, u.code AS unit_code, u.name AS unit_name
    FROM unit_aliases ua
    JOIN units u ON ua.unit_id = u.id
    WHERE ua.company_id = $1 AND LOWER(TRIM(ua.alias_name)) = LOWER(TRIM($2));
  `;
  const res = await client.query(sql, [companyId, aliasName]);
  return res.rows[0] || null;
};

/**
 * Mengambil semua alias unit untuk perusahaan tertentu (atau semua jika companyId null).
 */
const findAllAliases = async (companyId = null, client = db) => {
  let sql = `
    SELECT 
      ua.id,
      ua.company_id,
      c.code AS company_code,
      ua.alias_name,
      ua.unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      ua.created_at,
      ua.updated_at
    FROM unit_aliases ua
    JOIN companies c ON ua.company_id = c.id
    JOIN units u ON ua.unit_id = u.id
  `;
  const params = [];
  if (companyId) {
    sql += ' WHERE ua.company_id = $1';
    params.push(companyId);
  }
  sql += ' ORDER BY ua.alias_name ASC;';

  const res = await client.query(sql, params);
  return res.rows;
};

/**
 * Mengembalikan Map objek untuk lookup cepat: key: lowercase(alias_name) => unit_id
 */
const getAliasMap = async (companyId, client = db) => {
  const aliases = await findAllAliases(companyId, client);
  const map = new Map();
  for (const a of aliases) {
    map.set(a.alias_name.trim().toLowerCase(), a.unit_id);
  }
  return map;
};

/**
 * Menyimpan atau memperbarui alias unit (upsert).
 */
const upsertAlias = async (companyId, aliasName, unitId, userId = null, client = db) => {
  const sql = `
    INSERT INTO unit_aliases (company_id, alias_name, unit_id, created_by, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (company_id, alias_name)
    DO UPDATE SET 
      unit_id = EXCLUDED.unit_id,
      updated_at = NOW()
    RETURNING *;
  `;
  const res = await client.query(sql, [companyId, aliasName.trim(), unitId, userId]);
  return res.rows[0];
};

module.exports = {
  findAlias,
  findAllAliases,
  getAliasMap,
  upsertAlias,
};
