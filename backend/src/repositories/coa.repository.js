const db = require('../../db');

const findAll = async (params = {}) => {
  const { q, category, group_id, is_active, page = 1, per_page = 50 } = params;

  const conditions = [];
  const queryParams = [];
  let paramIdx = 1;

  if (q && q.trim()) {
    conditions.push(`(c.code ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
    queryParams.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (category && category.trim()) {
    conditions.push(`c.category = $${paramIdx}`);
    queryParams.push(category.trim());
    paramIdx++;
  }

  if (group_id) {
    conditions.push(`c.group_id = $${paramIdx}`);
    queryParams.push(parseInt(group_id, 10));
    paramIdx++;
  }

  if (is_active !== undefined && is_active !== null && is_active !== '') {
    conditions.push(`c.is_active = $${paramIdx}`);
    queryParams.push(is_active === 'true' || is_active === true);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM coas c ${whereClause}`,
    queryParams
  );
  const total = parseInt(countRes.rows[0].total, 10);

  const limit = Math.max(1, parseInt(per_page, 10) || 50);
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

  const dataSql = `
    SELECT
      c.id,
      c.code,
      c.name,
      c.category,
      c.group_id,
      cg.code AS group_code,
      cg.name AS group_name,
      c.is_active,
      c.created_at,
      c.updated_at
    FROM coas c
    LEFT JOIN coa_groups cg ON c.group_id = cg.id
    ${whereClause}
    ORDER BY c.code ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const listRes = await db.query(dataSql, [...queryParams, limit, offset]);

  return {
    data: listRes.rows,
    meta: {
      page: parseInt(page, 10) || 1,
      per_page: limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const findById = async (id) => {
  const coaId = parseInt(id, 10);
  if (isNaN(coaId)) return null;

  const res = await db.query(
    `SELECT c.*, cg.code as group_code, cg.name as group_name
     FROM coas c
     LEFT JOIN coa_groups cg ON c.group_id = cg.id
     WHERE c.id = $1`,
    [coaId]
  );
  return res.rows[0] || null;
};

const findByCode = async (code, client = db) => {
  if (!code) return null;
  const res = await client.query('SELECT * FROM coas WHERE code = $1', [code.trim()]);
  return res.rows[0] || null;
};

const findGroupByCode = async (code, client = db) => {
  if (!code) return null;
  const res = await client.query('SELECT * FROM coa_groups WHERE code = $1', [code.trim()]);
  return res.rows[0] || null;
};

const upsertGroup = async ({ code, name }, client = db) => {
  const sql = `
    INSERT INTO coa_groups (code, name)
    VALUES ($1, $2)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING *
  `;
  const res = await client.query(sql, [code.trim(), name.trim()]);
  return res.rows[0];
};

const upsertCoa = async ({ code, name, category = 'biaya', group_id = null }, client = db) => {
  const sql = `
    INSERT INTO coas (code, name, category, group_id, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      group_id = COALESCE(EXCLUDED.group_id, coas.group_id),
      updated_at = NOW()
    RETURNING *
  `;
  const res = await client.query(sql, [code.trim(), name.trim(), category, group_id]);
  return res.rows[0];
};

const findGroupsWithCounts = async (client = db) => {
  const sql = `
    SELECT
      cg.id,
      cg.code,
      cg.name,
      COUNT(c.id)::int AS coa_count
    FROM coa_groups cg
    LEFT JOIN coas c ON cg.id = c.group_id
    GROUP BY cg.id, cg.code, cg.name
    ORDER BY cg.code ASC
  `;
  const res = await client.query(sql);
  return res.rows;
};

const countReferences = async (id, client = db) => {
  const sql = `
    SELECT
      (SELECT COUNT(*)::int FROM items WHERE coa_id = $1 OR inventory_coa_id = $1) AS items,
      (SELECT COUNT(*)::int FROM investment_lines WHERE coa_id = $1) AS investment_lines,
      (SELECT COUNT(*)::int FROM investment_categories WHERE depreciation_coa_id = $1) AS categories,
      (SELECT COUNT(*)::int FROM journal_lines WHERE coa_id = $1) AS journal_lines,
      (SELECT COUNT(*)::int FROM new_item_requests WHERE assigned_coa_id = $1) AS new_item_requests
  `;
  const res = await client.query(sql, [id]);
  const row = res.rows[0] || { items: 0, investment_lines: 0, categories: 0, journal_lines: 0, new_item_requests: 0 };
  const total = row.items + row.investment_lines + row.categories + row.journal_lines + row.new_item_requests;
  return { ...row, total };
};

const deleteCoa = async (id, client = db) => {
  const res = await client.query('DELETE FROM coas WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] || null;
};

module.exports = {
  findAll,
  findById,
  findByCode,
  findGroupByCode,
  upsertGroup,
  upsertCoa,
  findGroupsWithCounts,
  countReferences,
  deleteCoa,
};

