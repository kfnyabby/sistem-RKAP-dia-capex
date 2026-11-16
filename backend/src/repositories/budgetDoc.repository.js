const db = require('../../db');
const userRepository = require('./user.repository');

const getAccessibleUnitIds = async (user) => {
  if (user.role === 'akuntansi') {
    return null; // Akuntansi dapat mengakses semua unit
  }
  const units = await userRepository.getUserUnits(user.id);
  return units.map((u) => u.unit_id);
};

const findById = async (id, user) => {
  const docId = parseInt(id, 10);
  if (isNaN(docId)) return null;

  if (user.role === 'akuntansi') {
    const res = await db.query('SELECT * FROM budget_docs WHERE id = $1', [docId]);
    return res.rows[0] || null;
  }

  const unitIds = await getAccessibleUnitIds(user);
  if (!unitIds || unitIds.length === 0) {
    return null;
  }

  const res = await db.query(
    'SELECT * FROM budget_docs WHERE id = $1 AND unit_id = ANY($2::int[])',
    [docId, unitIds]
  );
  return res.rows[0] || null;
};

const create = async (docData, client = db) => {
  const {
    period_id,
    unit_id,
    type,
    status = 'DRAFT',
    total_amount = 0,
    created_by = null,
  } = docData;

  const res = await client.query(
    `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [period_id, unit_id, type, status, total_amount, created_by]
  );
  return res.rows[0];
};

const deleteById = async (id, client = db) => {
  await client.query('DELETE FROM budget_docs WHERE id = $1', [id]);
};

module.exports = {
  getAccessibleUnitIds,
  findById,
  create,
  deleteById,
};

