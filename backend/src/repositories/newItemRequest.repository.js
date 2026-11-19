const db = require('../../db');
const userRepository = require('./user.repository');

const getAccessibleUnitIds = async (user) => {
  if (!user) return [];
  if (user.role === 'akuntansi') {
    return null; // Akses semua unit
  }
  const units = await userRepository.getUserUnits(user.id);
  return units.map((u) => u.unit_id);
};

const findByDocId = async (docId, user, client = db) => {
  const parsedDocId = parseInt(docId, 10);
  if (isNaN(parsedDocId)) return [];

  const accessibleUnitIds = await getAccessibleUnitIds(user);
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return [];
  }

  let whereClauses = ['nir.doc_id = $1'];
  let params = [parsedDocId];

  if (accessibleUnitIds !== null) {
    whereClauses.push('nir.unit_id = ANY($2::int[])');
    params.push(accessibleUnitIds);
  }

  const query = `
    SELECT 
      nir.id,
      nir.doc_id,
      nir.unit_id,
      u.name AS unit_name,
      u.code AS unit_code,
      nir.name,
      nir.spec,
      nir.uom,
      nir.qty,
      nir.est_price,
      nir.amount,
      nir.reason,
      nir.status,
      nir.version,
      nir.manual_handling_note,
      nir.assigned_coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      nir.assigned_by,
      assigner.name AS assigned_by_name,
      nir.item_id,
      i.code AS item_code,
      nir.created_at,
      nir.updated_at,
      nir.created_by,
      creator.name AS created_by_name
    FROM new_item_requests nir
    JOIN units u ON u.id = nir.unit_id
    LEFT JOIN coas c ON c.id = nir.assigned_coa_id
    LEFT JOIN items i ON i.id = nir.item_id
    LEFT JOIN users assigner ON assigner.id = nir.assigned_by
    LEFT JOIN users creator ON creator.id = nir.created_by
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY nir.id ASC
  `;

  const res = await client.query(query, params);
  return res.rows.map((r) => ({
    ...r,
    qty: parseFloat(r.qty),
    est_price: parseInt(r.est_price, 10),
    amount: parseInt(r.amount, 10),
    version: parseInt(r.version, 10),
  }));
};

const findById = async (id, user = null, client = db) => {
  const reqId = parseInt(id, 10);
  if (isNaN(reqId)) return null;

  const accessibleUnitIds = user ? await getAccessibleUnitIds(user) : null;
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return null;
  }

  let whereClauses = ['nir.id = $1'];
  let params = [reqId];

  if (accessibleUnitIds !== null) {
    whereClauses.push('nir.unit_id = ANY($2::int[])');
    params.push(accessibleUnitIds);
  }

  const query = `
    SELECT 
      nir.*,
      bd.status AS doc_status,
      bd.unit_id AS doc_unit_id,
      bd.period_id,
      u.name AS unit_name,
      u.code AS unit_code,
      u.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      c.code AS coa_code,
      c.name AS coa_name,
      i.code AS item_code,
      assigner.name AS assigned_by_name,
      creator.name AS created_by_name
    FROM new_item_requests nir
    JOIN budget_docs bd ON bd.id = nir.doc_id
    JOIN units u ON u.id = nir.unit_id
    JOIN companies comp ON comp.id = u.company_id
    LEFT JOIN coas c ON c.id = nir.assigned_coa_id
    LEFT JOIN items i ON i.id = nir.item_id
    LEFT JOIN users assigner ON assigner.id = nir.assigned_by
    LEFT JOIN users creator ON creator.id = nir.created_by
    WHERE ${whereClauses.join(' AND ')}
  `;

  const res = await client.query(query, params);
  const row = res.rows[0];
  if (!row) return null;

  return {
    ...row,
    qty: parseFloat(row.qty),
    est_price: parseInt(row.est_price, 10),
    amount: parseInt(row.amount, 10),
    version: parseInt(row.version, 10),
  };
};

const create = async (data, client = db) => {
  const {
    doc_id,
    unit_id,
    name,
    spec = null,
    uom,
    qty = 1,
    est_price = 0,
    amount = 0,
    reason = null,
    created_by = null,
  } = data;

  const query = `
    INSERT INTO new_item_requests (
      doc_id, unit_id, name, spec, uom, qty, est_price, amount, reason,
      status, version, created_by, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', 1, $10, NOW(), NOW())
    RETURNING *
  `;

  const res = await client.query(query, [
    parseInt(doc_id, 10),
    parseInt(unit_id, 10),
    name.trim(),
    spec ? spec.trim() : null,
    uom.trim(),
    qty,
    est_price,
    amount,
    reason ? reason.trim() : null,
    created_by,
  ]);

  const row = res.rows[0];
  return {
    ...row,
    qty: parseFloat(row.qty),
    est_price: parseInt(row.est_price, 10),
    amount: parseInt(row.amount, 10),
    version: parseInt(row.version, 10),
  };
};

const update = async (id, data, client = db) => {
  const {
    name,
    spec = null,
    uom,
    qty,
    est_price,
    amount,
    reason = null,
  } = data;

  const query = `
    UPDATE new_item_requests
    SET name = COALESCE($1, name),
        spec = COALESCE($2, spec),
        uom = COALESCE($3, uom),
        qty = COALESCE($4, qty),
        est_price = COALESCE($5, est_price),
        amount = COALESCE($6, amount),
        reason = COALESCE($7, reason),
        version = version + 1,
        updated_at = NOW()
    WHERE id = $8
    RETURNING *
  `;

  const res = await client.query(query, [
    name !== undefined ? name.trim() : null,
    spec !== undefined ? (spec ? spec.trim() : null) : null,
    uom !== undefined ? uom.trim() : null,
    qty !== undefined ? qty : null,
    est_price !== undefined ? est_price : null,
    amount !== undefined ? amount : null,
    reason !== undefined ? (reason ? reason.trim() : null) : null,
    parseInt(id, 10),
  ]);

  const row = res.rows[0];
  if (!row) return null;

  return {
    ...row,
    qty: parseFloat(row.qty),
    est_price: parseInt(row.est_price, 10),
    amount: parseInt(row.amount, 10),
    version: parseInt(row.version, 10),
  };
};

const deleteById = async (id, client = db) => {
  await client.query('DELETE FROM new_item_requests WHERE id = $1', [parseInt(id, 10)]);
};

const sendByDocId = async (docId, requestIds = null, client = db) => {
  let query = `
    UPDATE new_item_requests
    SET status = 'MENUNGGU_COA',
        updated_at = NOW()
    WHERE doc_id = $1 AND status = 'DRAFT'
  `;
  const params = [parseInt(docId, 10)];

  if (Array.isArray(requestIds) && requestIds.length > 0) {
    query += ' AND id = ANY($2::int[])';
    params.push(requestIds.map((id) => parseInt(id, 10)));
  }

  query += ' RETURNING *';

  const res = await client.query(query, params);
  return res.rows.map((row) => ({
    ...row,
    qty: parseFloat(row.qty),
    est_price: parseInt(row.est_price, 10),
    amount: parseInt(row.amount, 10),
    version: parseInt(row.version, 10),
  }));
};

const getQueue = async (filters = {}, client = db) => {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  const status = filters.status || 'MENUNGGU_COA';
  if (status !== 'ALL') {
    conditions.push(`nir.status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }

  if (filters.search && filters.search.trim()) {
    conditions.push(
      `(nir.name ILIKE $${paramIdx} OR nir.spec ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx} OR u.code ILIKE $${paramIdx})`
    );
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  if (filters.unit_id) {
    conditions.push(`nir.unit_id = $${paramIdx}`);
    params.push(parseInt(filters.unit_id, 10));
    paramIdx++;
  }

  if (filters.company_id) {
    conditions.push(`u.company_id = $${paramIdx}`);
    params.push(parseInt(filters.company_id, 10));
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await client.query(
    `SELECT COUNT(*) FROM new_item_requests nir
     JOIN units u ON u.id = nir.unit_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const perPage = Math.max(1, parseInt(filters.per_page || 25, 10));
  const offset = (page - 1) * perPage;

  const dataQuery = `
    SELECT 
      nir.id,
      nir.doc_id,
      nir.unit_id,
      u.name AS unit_name,
      u.code AS unit_code,
      u.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      bd.period_id,
      p.year AS period_year,
      bd.status AS doc_status,
      nir.name,
      nir.spec,
      nir.uom,
      nir.qty,
      nir.est_price,
      nir.amount,
      nir.reason,
      nir.status,
      nir.version,
      nir.manual_handling_note,
      nir.assigned_coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      nir.assigned_by,
      assigner.name AS assigned_by_name,
      nir.item_id,
      i.code AS item_code,
      nir.created_at,
      nir.updated_at,
      nir.created_by,
      creator.name AS created_by_name
    FROM new_item_requests nir
    JOIN budget_docs bd ON bd.id = nir.doc_id
    JOIN periods p ON p.id = bd.period_id
    JOIN units u ON u.id = nir.unit_id
    JOIN companies comp ON comp.id = u.company_id
    LEFT JOIN coas c ON c.id = nir.assigned_coa_id
    LEFT JOIN items i ON i.id = nir.item_id
    LEFT JOIN users assigner ON assigner.id = nir.assigned_by
    LEFT JOIN users creator ON creator.id = nir.created_by
    ${whereClause}
    ORDER BY nir.id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  params.push(perPage, offset);
  const dataRes = await client.query(dataQuery, params);

  return {
    data: dataRes.rows.map((r) => ({
      ...r,
      qty: parseFloat(r.qty),
      est_price: parseInt(r.est_price, 10),
      amount: parseInt(r.amount, 10),
      version: parseInt(r.version, 10),
    })),
    meta: {
      page,
      per_page: perPage,
      total,
    },
  };
};

const updateAssignedCoa = async (
  id,
  { assigned_coa_id, assigned_by, item_id, manual_handling_note = null },
  client = db
) => {
  const query = `
    UPDATE new_item_requests
    SET assigned_coa_id = $1,
        assigned_by = $2,
        item_id = $3,
        manual_handling_note = $4,
        status = 'COA_DITENTUKAN',
        version = version + 1,
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `;

  const res = await client.query(query, [
    parseInt(assigned_coa_id, 10),
    parseInt(assigned_by, 10),
    parseInt(item_id, 10),
    manual_handling_note,
    parseInt(id, 10),
  ]);

  const row = res.rows[0];
  if (!row) return null;

  return {
    ...row,
    qty: parseFloat(row.qty),
    est_price: parseInt(row.est_price, 10),
    amount: parseInt(row.amount, 10),
    version: parseInt(row.version, 10),
  };
};

module.exports = {
  findByDocId,
  findById,
  create,
  update,
  deleteById,
  sendByDocId,
  getQueue,
  updateAssignedCoa,
};
