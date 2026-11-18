const db = require('../../db');

const findAll = async (companyId = null) => {
  const query = `
    SELECT 
      p.id AS period_id,
      p.id,
      p.company_id,
      c.code AS company_code,
      c.name AS company_name,
      p.year,
      p.status,
      p.fill_deadline,
      p.review_deadline,
      p.lock_date,
      p.submission_state,
      p.auto_close,
      p.created_at,
      p.updated_at
    FROM periods p
    LEFT JOIN companies c ON c.id = p.company_id
    WHERE ($1::int IS NULL OR p.company_id = $1)
    ORDER BY p.year DESC, p.id DESC
  `;
  const res = await db.query(query, [companyId ? parseInt(companyId, 10) : null]);
  return res.rows;
};

const findById = async (id) => {
  const periodId = parseInt(id, 10);
  if (isNaN(periodId)) return null;

  const query = `
    SELECT 
      p.id AS period_id,
      p.id,
      p.company_id,
      c.code AS company_code,
      c.name AS company_name,
      p.year,
      p.status,
      p.fill_deadline,
      p.review_deadline,
      p.lock_date,
      p.submission_state,
      p.auto_close,
      p.created_at,
      p.updated_at
    FROM periods p
    LEFT JOIN companies c ON c.id = p.company_id
    WHERE p.id = $1
  `;
  const res = await db.query(query, [periodId]);
  return res.rows[0] || null;
};

const findByCompanyAndYear = async (companyId, year) => {
  const res = await db.query(
    'SELECT * FROM periods WHERE company_id = $1 AND year = $2',
    [parseInt(companyId, 10), parseInt(year, 10)]
  );
  return res.rows[0] || null;
};

const create = async (periodData, client = db) => {
  const {
    company_id,
    year,
    status = 'PERSIAPAN',
    fill_deadline = null,
    review_deadline = null,
    lock_date = null,
    submission_state = 'BUKA',
    auto_close = true,
    created_by = null,
  } = periodData;

  const res = await client.query(
    `INSERT INTO periods (
       company_id, year, status, fill_deadline, review_deadline, lock_date, 
       submission_state, auto_close, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      company_id,
      year,
      status,
      fill_deadline,
      review_deadline,
      lock_date,
      submission_state,
      auto_close,
      created_by,
    ]
  );
  return res.rows[0];
};

const deleteById = async (id, client = db) => {
  await client.query('DELETE FROM periods WHERE id = $1', [parseInt(id, 10)]);
};

module.exports = {
  findAll,
  findById,
  findByCompanyAndYear,
  create,
  deleteById,
};

