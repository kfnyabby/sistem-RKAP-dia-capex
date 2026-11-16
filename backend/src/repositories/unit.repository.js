const db = require('../../db');

const findAll = async (params = {}, client = db) => {
  const { company_id, q, is_active } = params;
  const conditions = [];
  const queryParams = [];
  let paramIdx = 1;

  if (company_id) {
    conditions.push(`u.company_id = $${paramIdx}`);
    queryParams.push(parseInt(company_id, 10));
    paramIdx++;
  }

  if (q && q.trim()) {
    conditions.push(`(u.code ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`);
    queryParams.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (is_active !== undefined && is_active !== null && is_active !== '') {
    conditions.push(`u.is_active = $${paramIdx}`);
    queryParams.push(is_active === 'true' || is_active === true);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      u.id,
      u.code,
      u.name,
      u.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      u.group_id,
      og.name AS group_name,
      u.classification,
      u.revenue_coa_id,
      c.code AS revenue_coa_code,
      c.name AS revenue_coa_name,
      u.is_active
    FROM units u
    JOIN companies comp ON u.company_id = comp.id
    LEFT JOIN org_groups og ON u.group_id = og.id
    LEFT JOIN coas c ON u.revenue_coa_id = c.id
    ${whereClause}
    ORDER BY u.code ASC
  `;

  const res = await client.query(sql, queryParams);
  return res.rows;
};

const findById = async (id, client = db) => {
  const unitId = parseInt(id, 10);
  if (isNaN(unitId)) return null;

  const sql = `
    SELECT
      u.id,
      u.code,
      u.name,
      u.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      u.group_id,
      og.name AS group_name,
      u.classification,
      u.revenue_coa_id,
      c.code AS revenue_coa_code,
      c.name AS revenue_coa_name,
      u.is_active
    FROM units u
    JOIN companies comp ON u.company_id = comp.id
    LEFT JOIN org_groups og ON u.group_id = og.id
    LEFT JOIN coas c ON u.revenue_coa_id = c.id
    WHERE u.id = $1
  `;
  const res = await client.query(sql, [unitId]);
  return res.rows[0] || null;
};

const create = async (data, client = db) => {
  const {
    company_id,
    group_id = null,
    code,
    name,
    classification = null,
    revenue_coa_id = null,
    is_active = true,
  } = data;

  const sql = `
    INSERT INTO units (company_id, group_id, code, name, classification, revenue_coa_id, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const res = await client.query(sql, [
    company_id,
    group_id,
    code.trim(),
    name.trim(),
    classification,
    revenue_coa_id,
    is_active,
  ]);
  return res.rows[0];
};

const update = async (id, data, client = db) => {
  const unitId = parseInt(id, 10);
  const {
    company_id,
    group_id,
    code,
    name,
    classification,
    revenue_coa_id,
    is_active,
  } = data;

  const sql = `
    UPDATE units
    SET
      company_id = COALESCE($2, company_id),
      group_id = COALESCE($3, group_id),
      code = COALESCE($4, code),
      name = COALESCE($5, name),
      classification = COALESCE($6, classification),
      revenue_coa_id = $7,
      is_active = COALESCE($8, is_active),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const res = await client.query(sql, [
    unitId,
    company_id,
    group_id,
    code ? code.trim() : null,
    name ? name.trim() : null,
    classification,
    revenue_coa_id,
    is_active,
  ]);
  return res.rows[0] || null;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
};
