const db = require('../../db');
const userRepository = require('./user.repository');

const getAccessibleUnitIds = async (user) => {
  if (!user) return [];
  if (user.role === 'akuntansi') {
    return null; // Akuntansi dapat mengakses semua unit
  }
  const units = await userRepository.getUserUnits(user.id);
  return units.map((u) => u.unit_id);
};

const findAll = async (filters = {}, user) => {
  const accessibleUnitIds = await getAccessibleUnitIds(user);

  let whereClauses = [];
  let params = [];
  let paramIdx = 1;

  // Filter unit akses
  if (accessibleUnitIds !== null) {
    if (accessibleUnitIds.length === 0) {
      return { data: [], meta: { page: 1, per_page: 25, total: 0 } };
    }
    whereClauses.push(`b.unit_id = ANY($${paramIdx}::int[])`);
    params.push(accessibleUnitIds);
    paramIdx++;
  }

  // Filter period_id
  if (filters.period_id) {
    whereClauses.push(`b.period_id = $${paramIdx}`);
    params.push(parseInt(filters.period_id, 10));
    paramIdx++;
  }

  // Filter unit_id spesifik
  if (filters.unit_id) {
    const targetUnitId = parseInt(filters.unit_id, 10);
    if (accessibleUnitIds !== null && !accessibleUnitIds.includes(targetUnitId)) {
      return { data: [], meta: { page: 1, per_page: 25, total: 0 } };
    }
    whereClauses.push(`b.unit_id = $${paramIdx}`);
    params.push(targetUnitId);
    paramIdx++;
  }

  // Filter type
  if (filters.type) {
    whereClauses.push(`b.type = $${paramIdx}`);
    params.push(filters.type);
    paramIdx++;
  }

  // Filter status
  if (filters.status) {
    whereClauses.push(`b.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Hitung total
  const countRes = await db.query(
    `SELECT COUNT(*) FROM budget_docs b ${whereStr}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const perPage = Math.max(1, parseInt(filters.per_page || 25, 10));
  const offset = (page - 1) * perPage;

  const dataQuery = `
    SELECT 
      b.id AS doc_id,
      b.id,
      b.period_id,
      p.year AS period_year,
      b.unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      u.company_id,
      c.code AS company_code,
      c.name AS company_name,
      b.type,
      b.status,
      b.total_amount,
      b.version,
      b.submitted_by,
      b.submitted_at,
      b.created_at,
      b.updated_at
    FROM budget_docs b
    JOIN units u ON u.id = b.unit_id
    JOIN companies c ON c.id = u.company_id
    JOIN periods p ON p.id = b.period_id
    ${whereStr}
    ORDER BY b.updated_at DESC, b.id DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(perPage, offset);

  const dataRes = await db.query(dataQuery, params);

  return {
    data: dataRes.rows,
    meta: {
      page,
      per_page: perPage,
      total,
    },
  };
};

const findById = async (id, user) => {
  const docId = parseInt(id, 10);
  if (isNaN(docId)) return null;

  const query = `
    SELECT 
      b.id AS doc_id,
      b.id,
      b.period_id,
      p.year AS period_year,
      p.status AS period_status,
      p.fill_deadline,
      p.review_deadline,
      p.lock_date,
      p.submission_state,
      b.unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      u.company_id,
      c.code AS company_code,
      c.name AS company_name,
      b.type,
      b.status,
      b.total_amount,
      b.version,
      b.submitted_by,
      b.submitted_at,
      b.created_at,
      b.updated_at
    FROM budget_docs b
    JOIN units u ON u.id = b.unit_id
    JOIN companies c ON c.id = u.company_id
    JOIN periods p ON p.id = b.period_id
    WHERE b.id = $1
  `;

  if (user && user.role === 'akuntansi') {
    const res = await db.query(query, [docId]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      total_amount: parseInt(row.total_amount, 10),
    };
  }

  const unitIds = await getAccessibleUnitIds(user);
  if (!unitIds || unitIds.length === 0) {
    return null;
  }

  const guardedQuery = `
    SELECT 
      b.id AS doc_id,
      b.id,
      b.period_id,
      p.year AS period_year,
      p.status AS period_status,
      p.fill_deadline,
      p.review_deadline,
      p.lock_date,
      p.submission_state,
      b.unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      u.company_id,
      c.code AS company_code,
      c.name AS company_name,
      b.type,
      b.status,
      b.total_amount,
      b.version,
      b.submitted_by,
      b.submitted_at,
      b.created_at,
      b.updated_at
    FROM budget_docs b
    JOIN units u ON u.id = b.unit_id
    JOIN companies c ON c.id = u.company_id
    JOIN periods p ON p.id = b.period_id
    WHERE b.id = $1 AND b.unit_id = ANY($2::int[])
  `;
  const res = await db.query(guardedQuery, [docId, unitIds]);
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    total_amount: parseInt(row.total_amount, 10),
  };
};

const findByUnitPeriodType = async (periodId, unitId, type) => {
  const res = await db.query(
    'SELECT * FROM budget_docs WHERE period_id = $1 AND unit_id = $2 AND type = $3',
    [parseInt(periodId, 10), parseInt(unitId, 10), type]
  );
  return res.rows[0] || null;
};

const getTotalsByCoa = async (docId) => {
  const query = `
    SELECT 
      c.id AS coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      COALESCE(cg.name, 'Lainnya') AS group_name,
      SUM(el.amount)::bigint AS amount
    FROM expense_lines el
    JOIN items i ON i.id = el.item_id
    JOIN coas c ON c.id = i.coa_id
    LEFT JOIN coa_groups cg ON cg.id = c.group_id
    WHERE el.doc_id = $1
    GROUP BY c.id, c.code, c.name, cg.name
    ORDER BY c.code ASC
  `;
  const res = await db.query(query, [parseInt(docId, 10)]);
  return res.rows.map((r) => ({
    ...r,
    amount: parseInt(r.amount, 10),
  }));
};

const create = async (docData, client = db) => {
  const {
    period_id,
    unit_id,
    type,
    status = 'DRAFT',
    total_amount = 0,
    version = 1,
    created_by = null,
  } = docData;

  const res = await client.query(
    `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, version, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [period_id, unit_id, type, status, total_amount, version, created_by]
  );
  return res.rows[0];
};

const recalculateTotal = async (docId, client = db) => {
  const res = await client.query(
    `UPDATE budget_docs
     SET total_amount = COALESCE(
       CASE 
         WHEN type = 'INVESTASI' THEN (SELECT SUM(amount) FROM investment_lines WHERE doc_id = $1)
         ELSE (SELECT SUM(amount) FROM expense_lines WHERE doc_id = $1)
       END, 0),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [parseInt(docId, 10)]
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    total_amount: parseInt(row.total_amount, 10),
  };
};

const getInvestmentSummary = async (docId, client = db) => {
  const parsedDocId = parseInt(docId, 10);

  // 1. Total investasi & total penyusutan
  const totalsRes = await client.query(
    `SELECT 
       COALESCE(SUM(amount), 0) AS total_amount,
       COALESCE(SUM(depreciation_amount), 0) AS total_depreciation,
       COUNT(id) AS total_items
     FROM investment_lines
     WHERE doc_id = $1`,
    [parsedDocId]
  );
  const totals = totalsRes.rows[0];

  // 2. Ringkasan per Kategori
  const catRes = await client.query(
    `SELECT 
       ic.id AS category_id,
       ic.name AS category_name,
       COALESCE(SUM(il.amount), 0) AS amount,
       COALESCE(SUM(il.depreciation_amount), 0) AS depreciation_amount,
       COUNT(il.id) AS item_count
     FROM investment_lines il
     JOIN investment_categories ic ON ic.id = il.category_id
     WHERE il.doc_id = $1
     GROUP BY ic.id, ic.name
     ORDER BY ic.name ASC`,
    [parsedDocId]
  );

  // 3. Ringkasan per Prioritas
  const prioRes = await client.query(
    `SELECT 
       p.id AS priority_id,
       p.name AS priority_name,
       COALESCE(SUM(il.amount), 0) AS amount,
       COUNT(il.id) AS item_count
     FROM investment_lines il
     JOIN priorities p ON p.id = il.priority_id
     WHERE il.doc_id = $1
     GROUP BY p.id, p.name
     ORDER BY p.id ASC`,
    [parsedDocId]
  );

  // 4. Ringkasan per Bulan Rencana
  const monthRes = await client.query(
    `SELECT 
       il.plan_month,
       COALESCE(SUM(il.amount), 0) AS amount,
       COUNT(il.id) AS item_count
     FROM investment_lines il
     WHERE il.doc_id = $1
     GROUP BY il.plan_month
     ORDER BY il.plan_month ASC`,
    [parsedDocId]
  );

  return {
    total_amount: parseInt(totals.total_amount, 10),
    total_depreciation: parseInt(totals.total_depreciation, 10),
    total_items: parseInt(totals.total_items, 10),
    by_category: catRes.rows.map((r) => ({
      ...r,
      amount: parseInt(r.amount, 10),
      depreciation_amount: parseInt(r.depreciation_amount, 10),
      item_count: parseInt(r.item_count, 10),
    })),
    by_priority: prioRes.rows.map((r) => ({
      ...r,
      amount: parseInt(r.amount, 10),
      item_count: parseInt(r.item_count, 10),
    })),
    by_month: monthRes.rows.map((r) => ({
      ...r,
      amount: parseInt(r.amount, 10),
      item_count: parseInt(r.item_count, 10),
    })),
  };
};

const deleteById = async (id, client = db) => {
  await client.query('DELETE FROM budget_docs WHERE id = $1', [parseInt(id, 10)]);
};

const findRawById = async (id, client = null) => {
  const queryExecutor = client || db;
  const docId = parseInt(id, 10);
  if (isNaN(docId)) return null;

  const query = `
    SELECT 
      b.*,
      b.id AS doc_id,
      p.year AS period_year,
      p.status AS period_status,
      p.fill_deadline,
      p.review_deadline,
      p.lock_date,
      p.submission_state,
      u.code AS unit_code,
      u.name AS unit_name,
      u.company_id,
      c.code AS company_code,
      c.name AS company_name
    FROM budget_docs b
    JOIN units u ON u.id = b.unit_id
    JOIN companies c ON c.id = u.company_id
    JOIN periods p ON p.id = b.period_id
    WHERE b.id = $1
  `;
  const res = await queryExecutor.query(query, [docId]);
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    total_amount: parseInt(row.total_amount, 10),
  };
};

const updateStatus = async (docId, newStatus, submittedBy = null, client = null) => {
  const queryExecutor = client || db;
  let query;
  let params;

  if (newStatus === 'DIAJUKAN') {
    query = `
      UPDATE budget_docs 
      SET status = $1, submitted_by = $2, submitted_at = NOW(), updated_at = NOW()
      WHERE id = $3 
      RETURNING *
    `;
    params = [newStatus, submittedBy, docId];
  } else {
    query = `
      UPDATE budget_docs 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    params = [newStatus, docId];
  }

  const res = await queryExecutor.query(query, params);
  return res.rows[0];
};

const finalizeBulk = async (docIds, client = null) => {
  if (!docIds || docIds.length === 0) return [];
  const queryExecutor = client || db;

  const query = `
    UPDATE budget_docs
    SET status = 'FINAL', updated_at = NOW()
    WHERE id = ANY($1::int[]) AND status = 'DISETUJUI'
    RETURNING id, unit_id, period_id, type, status
  `;
  const res = await queryExecutor.query(query, [docIds]);
  return res.rows;
};

module.exports = {
  getAccessibleUnitIds,
  findAll,
  findById,
  findRawById,
  findByUnitPeriodType,
  getTotalsByCoa,
  getInvestmentSummary,
  create,
  recalculateTotal,
  deleteById,
  updateStatus,
  finalizeBulk,
};
