const db = require('../../db');

const findByDocId = async (docId, filters = {}) => {
  let whereClauses = ['el.doc_id = $1'];
  let params = [parseInt(docId, 10)];
  let paramIdx = 2;

  if (filters.search) {
    whereClauses.push(`(i.name ILIKE $${paramIdx} OR i.code ILIKE $${paramIdx})`);
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  if (filters.group_id) {
    whereClauses.push(`c.group_id = $${paramIdx}`);
    params.push(parseInt(filters.group_id, 10));
    paramIdx++;
  }

  if (filters.coa_id) {
    whereClauses.push(`c.id = $${paramIdx}`);
    params.push(parseInt(filters.coa_id, 10));
    paramIdx++;
  }

  if (filters.only_filled === '1' || filters.only_filled === true || filters.only_filled === 'true') {
    whereClauses.push('el.qty > 0');
  }

  const whereStr = `WHERE ${whereClauses.join(' AND ')}`;

  const countRes = await db.query(
    `SELECT COUNT(*) FROM expense_lines el
     JOIN items i ON i.id = el.item_id
     JOIN coas c ON c.id = i.coa_id
     LEFT JOIN coa_groups cg ON cg.id = c.group_id
     ${whereStr}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const perPage = Math.max(1, parseInt(filters.per_page || 100, 10));
  const offset = (page - 1) * perPage;

  const dataQuery = `
    SELECT 
      el.id AS line_id,
      el.id,
      el.doc_id,
      el.item_id,
      i.code AS item_code,
      i.name AS item_name,
      i.uom,
      c.id AS coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      c.group_id,
      COALESCE(cg.name, 'Lainnya') AS group_name,
      el.price_snapshot AS price,
      0 AS real_qty,
      0 AS real_amount,
      el.qty,
      el.amount,
      el.version,
      el.note,
      el.created_at,
      el.updated_at
    FROM expense_lines el
    JOIN items i ON i.id = el.item_id
    JOIN coas c ON c.id = i.coa_id
    LEFT JOIN coa_groups cg ON cg.id = c.group_id
    ${whereStr}
    ORDER BY c.code ASC, i.name ASC, el.id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(perPage, offset);

  const dataRes = await db.query(dataQuery, params);

  return {
    data: dataRes.rows.map((r) => ({
      ...r,
      price: parseInt(r.price, 10),
      amount: parseInt(r.amount, 10),
      qty: parseInt(r.qty, 10),
      version: parseInt(r.version, 10),
    })),
    meta: {
      page,
      per_page: perPage,
      total,
    },
  };
};

const findById = async (lineId, client = db) => {
  const query = `
    SELECT 
      el.*,
      b.unit_id,
      b.period_id,
      b.status AS doc_status,
      u.company_id,
      i.name AS item_name,
      i.code AS item_code
    FROM expense_lines el
    JOIN budget_docs b ON b.id = el.doc_id
    JOIN units u ON u.id = b.unit_id
    JOIN items i ON i.id = el.item_id
    WHERE el.id = $1
  `;
  const res = await client.query(query, [parseInt(lineId, 10)]);
  return res.rows[0] || null;
};

const findByDocAndItemId = async (docId, itemId, client = db) => {
  const res = await client.query(
    'SELECT * FROM expense_lines WHERE doc_id = $1 AND item_id = $2',
    [parseInt(docId, 10), parseInt(itemId, 10)]
  );
  return res.rows[0] || null;
};

const getItemMasterPrice = async (itemId, companyId, clientOrPeriod = db, maybeClient = db) => {
  const client =
    clientOrPeriod && typeof clientOrPeriod.query === 'function' ? clientOrPeriod : maybeClient;
  const res = await client.query(
    `SELECT price FROM item_prices 
     WHERE item_id = $1 AND company_id = $2`,
    [parseInt(itemId, 10), parseInt(companyId, 10)]
  );
  if (res.rows.length === 0) return null;
  return parseInt(res.rows[0].price, 10);
};

const insertLine = async (lineData, client = db) => {
  const {
    doc_id,
    item_id,
    qty,
    price_snapshot,
    amount,
    note = null,
    version = 1,
    created_by = null,
  } = lineData;

  const res = await client.query(
    `INSERT INTO expense_lines (doc_id, item_id, qty, price_snapshot, amount, note, version, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [doc_id, item_id, qty, price_snapshot, amount, note, version, created_by]
  );
  return res.rows[0];
};

const updateLine = async (lineId, updateData, client = db) => {
  const {
    qty,
    price_snapshot,
    amount,
    note = null,
    version,
  } = updateData;

  const res = await client.query(
    `UPDATE expense_lines
     SET qty = $1,
         price_snapshot = $2,
         amount = $3,
         note = $4,
         version = $5,
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [qty, price_snapshot, amount, note, version, parseInt(lineId, 10)]
  );
  return res.rows[0];
};

const deleteById = async (lineId, client = db) => {
  const res = await client.query(
    'DELETE FROM expense_lines WHERE id = $1 RETURNING *',
    [parseInt(lineId, 10)]
  );
  return res.rows[0] || null;
};

module.exports = {
  findByDocId,
  findById,
  findByDocAndItemId,
  getItemMasterPrice,
  insertLine,
  updateLine,
  deleteById,
};

