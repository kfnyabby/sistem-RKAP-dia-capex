const db = require('../../db');

/**
 * Mencari aturan override akses unit untuk periode, unit, dan docType tertentu
 */
const findByUnitAndPeriod = async (periodId, unitId, docType = 'SEMUA', client = null) => {
  const queryExecutor = client || db;
  const query = `
    SELECT * FROM submission_access
    WHERE period_id = $1 AND unit_id = $2 AND (doc_type = $3 OR doc_type = 'SEMUA')
    ORDER BY CASE WHEN doc_type = $3 THEN 1 ELSE 2 END
    LIMIT 1
  `;
  const res = await queryExecutor.query(query, [periodId, unitId, docType]);
  return res.rows[0] || null;
};

/**
 * Upsert aturan submission_access untuk unit dan jenis anggaran
 */
const upsert = async (accessData, client = null) => {
  const queryExecutor = client || db;
  const {
    period_id,
    unit_id,
    doc_type = 'SEMUA',
    state = 'BUKA',
    deadline_override = null,
    source = 'MANUAL',
    reason = null,
    changed_by = null,
  } = accessData;

  const query = `
    INSERT INTO submission_access (
      period_id, unit_id, doc_type, state, deadline_override, source, reason, changed_by, changed_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    ON CONFLICT (period_id, unit_id, doc_type)
    DO UPDATE SET
      state = EXCLUDED.state,
      deadline_override = EXCLUDED.deadline_override,
      source = EXCLUDED.source,
      reason = EXCLUDED.reason,
      changed_by = EXCLUDED.changed_by,
      changed_at = NOW(),
      updated_at = NOW()
    RETURNING *
  `;

  const values = [
    period_id,
    unit_id,
    doc_type,
    state,
    deadline_override,
    source,
    reason,
    changed_by,
  ];

  const res = await queryExecutor.query(query, values);
  return res.rows[0];
};

/**
 * Ambil daftar papan akses unit untuk suatu periode (Akuntansi)
 */
const getUnitAccessListByPeriod = async (periodId) => {
  const query = `
    SELECT 
      u.id AS unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      u.company_id,
      c.code AS company_code,
      c.name AS company_name,
      p.id AS period_id,
      p.year AS period_year,
      p.status AS period_status,
      p.submission_state AS period_submission_state,
      p.fill_deadline AS period_fill_deadline,
      p.review_deadline AS period_review_deadline,
      p.lock_date AS period_lock_date,
      sa.id AS access_id,
      sa.doc_type,
      sa.state AS override_state,
      sa.deadline_override,
      sa.source AS override_source,
      sa.reason AS override_reason,
      sa.changed_at,
      u_actor.name AS changed_by_name
    FROM units u
    JOIN companies c ON c.id = u.company_id
    CROSS JOIN periods p
    LEFT JOIN submission_access sa ON sa.period_id = p.id AND sa.unit_id = u.id AND sa.doc_type = 'SEMUA'
    LEFT JOIN users u_actor ON u_actor.id = sa.changed_by
    WHERE p.id = $1 AND u.is_active = true
    ORDER BY c.code ASC, u.code ASC, u.name ASC
  `;
  const res = await db.query(query, [periodId]);
  return res.rows;
};

/**
 * Mengambil detail data periode
 */
const findPeriodById = async (periodId, client = null) => {
  const queryExecutor = client || db;
  const res = await queryExecutor.query(
    `SELECT * FROM periods WHERE id = $1`,
    [periodId]
  );
  return res.rows[0] || null;
};

/**
 * Update submission_state pada periode (BUKA / TUTUP)
 */
const updatePeriodSubmission = async (periodId, submissionState, client = null) => {
  const queryExecutor = client || db;
  const res = await queryExecutor.query(
    `UPDATE periods SET submission_state = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [submissionState, periodId]
  );
  return res.rows[0];
};

/**
 * Update deadline pada periode
 */
const updatePeriodDeadlines = async (periodId, deadlines, client = null) => {
  const queryExecutor = client || db;
  const { fill_deadline, review_deadline, lock_date, auto_close, status } = deadlines;

  const sets = ['updated_at = NOW()'];
  const values = [];
  let idx = 1;

  if (fill_deadline !== undefined) {
    sets.push(`fill_deadline = $${idx++}`);
    values.push(fill_deadline);
  }
  if (review_deadline !== undefined) {
    sets.push(`review_deadline = $${idx++}`);
    values.push(review_deadline);
  }
  if (lock_date !== undefined) {
    sets.push(`lock_date = $${idx++}`);
    values.push(lock_date);
  }
  if (auto_close !== undefined) {
    sets.push(`auto_close = $${idx++}`);
    values.push(auto_close);
  }
  if (status !== undefined) {
    sets.push(`status = $${idx++}`);
    values.push(status);
  }

  values.push(periodId);
  const query = `
    UPDATE periods 
    SET ${sets.join(', ')} 
    WHERE id = $${idx} 
    RETURNING *
  `;
  const res = await queryExecutor.query(query, values);
  return res.rows[0];
};

module.exports = {
  findByUnitAndPeriod,
  upsert,
  getUnitAccessListByPeriod,
  findPeriodById,
  updatePeriodSubmission,
  updatePeriodDeadlines,
};
