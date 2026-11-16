const db = require('../../db');

const findAll = async (client = db) => {
  const sql = `
    SELECT
      ic.id,
      ic.name,
      ic.useful_life_months,
      ic.depreciation_coa_id,
      c.code AS coa_code,
      c.name AS coa_name
    FROM investment_categories ic
    LEFT JOIN coas c ON ic.depreciation_coa_id = c.id
    ORDER BY ic.id ASC
  `;
  const res = await client.query(sql);
  return res.rows;
};

const findById = async (id, client = db) => {
  const catId = parseInt(id, 10);
  if (isNaN(catId)) return null;

  const sql = `
    SELECT
      ic.id,
      ic.name,
      ic.useful_life_months,
      ic.depreciation_coa_id,
      c.code AS coa_code,
      c.name AS coa_name
    FROM investment_categories ic
    LEFT JOIN coas c ON ic.depreciation_coa_id = c.id
    WHERE ic.id = $1
  `;
  const res = await client.query(sql, [catId]);
  return res.rows[0] || null;
};

const findByName = async (name, client = db) => {
  if (!name) return null;
  const res = await client.query(
    'SELECT * FROM investment_categories WHERE UPPER(name) = UPPER($1)',
    [name.trim()]
  );
  return res.rows[0] || null;
};

const update = async (id, { useful_life_months, depreciation_coa_id }, client = db) => {
  const catId = parseInt(id, 10);
  const sql = `
    UPDATE investment_categories
    SET
      useful_life_months = COALESCE($2, useful_life_months),
      depreciation_coa_id = $3
    WHERE id = $1
    RETURNING *
  `;
  const res = await client.query(sql, [catId, useful_life_months, depreciation_coa_id || null]);
  return res.rows[0] || null;
};

const upsert = async ({ name, useful_life_months, depreciation_coa_id = null }, client = db) => {
  const sql = `
    INSERT INTO investment_categories (name, useful_life_months, depreciation_coa_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET
      useful_life_months = EXCLUDED.useful_life_months,
      depreciation_coa_id = COALESCE(EXCLUDED.depreciation_coa_id, investment_categories.depreciation_coa_id)
    RETURNING *
  `;
  const res = await client.query(sql, [name.trim(), useful_life_months, depreciation_coa_id]);
  return res.rows[0];
};

module.exports = {
  findAll,
  findById,
  findByName,
  update,
  upsert,
};

