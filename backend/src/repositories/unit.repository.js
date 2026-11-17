const db = require('../../db');

const findAll = async (params = {}, client = db) => {
  const { company_id, q, is_active, needs_review } = params;
  const conditions = [];
  const queryParams = [];
  let paramIdx = 1;

  if (company_id) {
    conditions.push(`u.company_id = $${paramIdx}`);
    queryParams.push(parseInt(company_id, 10));
    paramIdx++;
  }

  if (q && q.trim()) {
    conditions.push(
      `(u.code ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx} OR u.source_key ILIKE $${paramIdx})`
    );
    queryParams.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (is_active !== undefined && is_active !== null && is_active !== '') {
    conditions.push(`u.is_active = $${paramIdx}`);
    queryParams.push(is_active === 'true' || is_active === true);
    paramIdx++;
  }

  if (needs_review !== undefined && needs_review !== null && needs_review !== '') {
    conditions.push(`u.needs_review = $${paramIdx}`);
    queryParams.push(needs_review === 'true' || needs_review === true);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      u.id,
      u.source_key,
      u.code,
      u.name,
      u.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      u.group_id,
      og.name AS group_name,
      u.classification,
      u.revenue_coa_id,
      COALESCE(c.code, u.revenue_coa_code) AS revenue_coa_code,
      COALESCE(c.name, u.revenue_coa_name) AS revenue_coa_name,
      u.needs_review,
      u.review_notes,
      u.order_no,
      u.is_active
    FROM units u
    JOIN companies comp ON u.company_id = comp.id
    LEFT JOIN org_groups og ON u.group_id = og.id
    LEFT JOIN coas c ON u.revenue_coa_id = c.id
    ${whereClause}
    ORDER BY u.company_id ASC, COALESCE(u.order_no, 9999) ASC, u.code ASC NULLS LAST, u.name ASC
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
      u.source_key,
      u.code,
      u.name,
      u.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      u.group_id,
      og.name AS group_name,
      u.classification,
      u.revenue_coa_id,
      COALESCE(c.code, u.revenue_coa_code) AS revenue_coa_code,
      COALESCE(c.name, u.revenue_coa_name) AS revenue_coa_name,
      u.needs_review,
      u.review_notes,
      u.order_no,
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

const findBySourceKey = async (company_id, source_key, client = db) => {
  if (!company_id || !source_key) return null;
  const sql = `
    SELECT * FROM units 
    WHERE company_id = $1 AND source_key = $2
  `;
  const res = await client.query(sql, [company_id, source_key]);
  return res.rows[0] || null;
};

const findOrCreateOrgGroup = async (
  company_id,
  groupName,
  type = 'instalasi',
  parent_id = null,
  client = db
) => {
  if (!groupName || !groupName.trim()) return null;
  const cleanName = groupName.trim();

  // Cari yang sudah ada
  const checkSql = `
    SELECT id FROM org_groups 
    WHERE company_id = $1 AND LOWER(name) = LOWER($2)
  `;
  const checkRes = await client.query(checkSql, [company_id, cleanName]);
  if (checkRes.rows.length > 0) {
    return checkRes.rows[0].id;
  }

  // Buat baru
  const insertSql = `
    INSERT INTO org_groups (company_id, name, type, parent_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const insertRes = await client.query(insertSql, [company_id, cleanName, type, parent_id]);
  return insertRes.rows[0].id;
};

const create = async (data, client = db) => {
  const {
    company_id,
    group_id = null,
    source_key = null,
    code = null,
    name,
    classification = null,
    revenue_coa_id = null,
    revenue_coa_code = null,
    revenue_coa_name = null,
    needs_review = false,
    review_notes = null,
    order_no = 0,
    is_active = true,
  } = data;

  const sql = `
    INSERT INTO units (
      company_id, group_id, source_key, code, name, classification, 
      revenue_coa_id, revenue_coa_code, revenue_coa_name, 
      needs_review, review_notes, order_no, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  const res = await client.query(sql, [
    company_id,
    group_id,
    source_key ? source_key.trim() : null,
    code && code.trim() ? code.trim() : null,
    name.trim(),
    classification,
    revenue_coa_id,
    revenue_coa_code,
    revenue_coa_name,
    Boolean(needs_review),
    review_notes,
    order_no || 0,
    is_active,
  ]);
  return res.rows[0];
};

const update = async (id, data, client = db) => {
  const unitId = parseInt(id, 10);
  const {
    company_id,
    group_id,
    source_key,
    code,
    name,
    classification,
    revenue_coa_id,
    revenue_coa_code,
    revenue_coa_name,
    needs_review,
    review_notes,
    order_no,
    is_active,
  } = data;

  const sql = `
    UPDATE units
    SET
      company_id = COALESCE($2, company_id),
      group_id = COALESCE($3, group_id),
      source_key = COALESCE($4, source_key),
      code = $5,
      name = COALESCE($6, name),
      classification = COALESCE($7, classification),
      revenue_coa_id = $8,
      revenue_coa_code = COALESCE($9, revenue_coa_code),
      revenue_coa_name = COALESCE($10, revenue_coa_name),
      needs_review = COALESCE($11, needs_review),
      review_notes = COALESCE($12, review_notes),
      order_no = COALESCE($13, order_no),
      is_active = COALESCE($14, is_active),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const res = await client.query(sql, [
    unitId,
    company_id,
    group_id,
    source_key ? source_key.trim() : null,
    code && code.trim() ? code.trim() : null,
    name ? name.trim() : null,
    classification,
    revenue_coa_id,
    revenue_coa_code,
    revenue_coa_name,
    needs_review,
    review_notes,
    order_no,
    is_active,
  ]);
  return res.rows[0] || null;
};

const upsertBySourceKey = async (data, client = db) => {
  const {
    company_id,
    source_key,
    code = null,
    name,
    group_id = null,
    classification = null,
    revenue_coa_id = null,
    revenue_coa_code = null,
    revenue_coa_name = null,
    needs_review = false,
    review_notes = null,
    order_no = 0,
    is_active = true,
  } = data;

  // 1. Cari berdasarkan source_key
  let existing = await findBySourceKey(company_id, source_key, client);

  // 2. Jika tidak ada lewat source_key, cari berdasarkan (company_id, code) untuk mencegah constraint error
  if (!existing && code && code.trim()) {
    const codeCheckSql = `SELECT * FROM units WHERE company_id = $1 AND code = $2`;
    const codeCheckRes = await client.query(codeCheckSql, [company_id, code.trim()]);
    if (codeCheckRes.rows.length > 0) {
      existing = codeCheckRes.rows[0];
    }
  }

  if (existing) {
    const updated = await update(
      existing.id,
      {
        company_id,
        group_id,
        source_key,
        code,
        name,
        classification,
        revenue_coa_id,
        revenue_coa_code,
        revenue_coa_name,
        needs_review,
        review_notes,
        order_no,
        is_active,
      },
      client
    );
    return { unit: updated, is_new: false };
  } else {
    const created = await create(
      {
        company_id,
        group_id,
        source_key,
        code,
        name,
        classification,
        revenue_coa_id,
        revenue_coa_code,
        revenue_coa_name,
        needs_review,
        review_notes,
        order_no,
        is_active,
      },
      client
    );
    return { unit: created, is_new: true };
  }
};

module.exports = {
  findAll,
  findById,
  findBySourceKey,
  findOrCreateOrgGroup,
  create,
  update,
  upsertBySourceKey,
};
