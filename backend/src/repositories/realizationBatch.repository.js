const db = require('../../db');

const createBatch = async (data, client = db) => {
  const {
    company_id,
    file_name,
    file_path = null,
    period = null,
    mode = 'replace_month',
    uploaded_by = null,
    status = 'PROCESSING',
    created_by = null,
  } = data;

  const sql = `
    INSERT INTO import_batches (
      company_id,
      kind,
      file_name,
      file_path,
      period,
      mode,
      uploaded_by,
      status,
      created_by,
      progress_percent,
      rows_total,
      rows_used,
      rows_error,
      rows_read,
      rows_expense,
      rows_investment,
      rows_skipped,
      rows_without_unit,
      read_seconds,
      created_at,
      updated_at
    ) VALUES (
      $1, 'realisasi', $2, $3, $4, $5, $6, $7, $8,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
    )
    RETURNING *;
  `;

  const res = await client.query(sql, [
    company_id,
    file_name,
    file_path,
    period,
    mode,
    uploaded_by,
    status,
    created_by,
  ]);

  return res.rows[0];
};

const updateBatchProgress = async (id, updates, client = db) => {
  const fields = [];
  const params = [id];
  let paramIdx = 2;

  const allowedFields = [
    'period',
    'status',
    'progress_percent',
    'rows_total',
    'rows_used',
    'rows_error',
    'rows_read',
    'rows_expense',
    'rows_investment',
    'rows_skipped',
    'rows_without_unit',
    'read_seconds',
    'error_message',
    'raw_summary',
    'file_path',
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'raw_summary' && updates[field] !== null && typeof updates[field] === 'object') {
        fields.push(`${field} = $${paramIdx}`);
        params.push(JSON.stringify(updates[field]));
      } else {
        fields.push(`${field} = $${paramIdx}`);
        params.push(updates[field]);
      }
      paramIdx++;
    }
  }

  if (fields.length === 0) {
    return findById(id, client);
  }

  fields.push('updated_at = NOW()');

  const sql = `
    UPDATE import_batches
    SET ${fields.join(', ')}
    WHERE id = $1
    RETURNING *;
  `;

  const res = await client.query(sql, params);
  return res.rows[0] || null;
};

const findById = async (id, client = db) => {
  const sql = `
    SELECT 
      b.*,
      c.code AS company_code,
      c.name AS company_name,
      u.name AS uploader_name
    FROM import_batches b
    JOIN companies c ON b.company_id = c.id
    LEFT JOIN users u ON b.uploaded_by = u.id
    WHERE b.id = $1 AND b.kind = 'realisasi';
  `;

  const res = await client.query(sql, [id]);
  return res.rows[0] || null;
};

const findAll = async (params = {}, client = db) => {
  const {
    company_id,
    company_code,
    status,
    period,
    page = 1,
    per_page = 20,
  } = params;

  const conditions = ["b.kind = 'realisasi'"];
  const queryParams = [];
  let paramIdx = 1;

  if (company_id) {
    conditions.push(`b.company_id = $${paramIdx}`);
    queryParams.push(parseInt(company_id, 10));
    paramIdx++;
  }

  if (company_code) {
    conditions.push(`c.code = $${paramIdx}`);
    queryParams.push(company_code.trim().toUpperCase());
    paramIdx++;
  }

  if (status) {
    conditions.push(`b.status = $${paramIdx}`);
    queryParams.push(status);
    paramIdx++;
  }

  if (period) {
    conditions.push(`b.period = $${paramIdx}`);
    queryParams.push(period);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countSql = `
    SELECT COUNT(*) AS total
    FROM import_batches b
    JOIN companies c ON b.company_id = c.id
    WHERE ${whereClause};
  `;
  const countRes = await client.query(countSql, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  const limit = Math.max(1, parseInt(per_page, 10) || 20);
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

  const dataSql = `
    SELECT 
      b.*,
      c.code AS company_code,
      c.name AS company_name,
      u.name AS uploader_name
    FROM import_batches b
    JOIN companies c ON b.company_id = c.id
    LEFT JOIN users u ON b.uploaded_by = u.id
    WHERE ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  queryParams.push(limit, offset);
  const dataRes = await client.query(dataSql, queryParams);

  return {
    data: dataRes.rows,
    meta: {
      page: Math.max(1, parseInt(page, 10) || 1),
      per_page: limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
};

const updateStatus = async (id, status, client = db) => {
  const sql = `
    UPDATE import_batches
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const res = await client.query(sql, [id, status]);
  return res.rows[0] || null;
};

const deleteBatch = async (id, client = db) => {
  const res = await client.query('DELETE FROM import_batches WHERE id = $1 RETURNING id', [id]);
  return res.rowCount > 0;
};

const getUnmappedUnits = async (batchId, client = db) => {
  const sql = `
    SELECT 
      jl.raw_unit, 
      COUNT(*)::int AS rows_count,
      SUM(jl.debit - jl.credit)::bigint AS net_amount
    FROM journal_lines jl
    WHERE jl.batch_id = $1 
      AND jl.unit_id IS NULL 
      AND jl.raw_unit IS NOT NULL 
      AND TRIM(jl.raw_unit) != ''
    GROUP BY jl.raw_unit
    ORDER BY rows_count DESC, jl.raw_unit ASC;
  `;
  const res = await client.query(sql, [batchId]);
  return res.rows;
};

module.exports = {
  createBatch,
  updateBatchProgress,
  findById,
  findAll,
  updateStatus,
  deleteBatch,
  getUnmappedUnits,
};
