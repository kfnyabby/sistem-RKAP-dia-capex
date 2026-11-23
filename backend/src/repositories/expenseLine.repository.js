const db = require('../../db');
const userRepository = require('./user.repository');

const getAccessibleUnitIds = async (user) => {
  if (!user) return [];
  if (user.role === 'akuntansi') {
    return null; // Akuntansi dapat mengakses seluruh unit
  }
  const units = await userRepository.getUserUnits(user.id);
  return units.map((u) => u.unit_id);
};

const parseUnitIds = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);
  }
  if (typeof input === 'number' && !isNaN(input) && input > 0) {
    return [input];
  }
  return [];
};

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

const findAllCrossUnit = async (filters = {}, user, client = db) => {
  const accessibleUnitIds = await getAccessibleUnitIds(user);
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return {
      data: [],
      meta: { page: 1, per_page: 50, total: 0, total_pages: 0 },
      totals: { total_rkap: 0, total_realization: 0, total_units: 0, total_lines: 0 },
    };
  }

  const conditions = ["bd.type = 'BIAYA'"];
  const params = [];
  let paramIdx = 1;

  // 1. Scoping Akses Unit
  if (accessibleUnitIds !== null) {
    conditions.push(`bd.unit_id = ANY($${paramIdx}::int[])`);
    params.push(accessibleUnitIds);
    paramIdx++;
  }

  // 2. Filter unit_id spesifik (bisa banyak: array atau comma-separated)
  const requestedUnitIds = parseUnitIds(filters.unit_id);
  if (requestedUnitIds.length > 0) {
    if (accessibleUnitIds !== null) {
      const allowedUnitIds = requestedUnitIds.filter((id) => accessibleUnitIds.includes(id));
      if (allowedUnitIds.length === 0) {
        return {
          data: [],
          meta: { page: 1, per_page: 50, total: 0, total_pages: 0 },
          totals: { total_rkap: 0, total_realization: 0, total_units: 0, total_lines: 0 },
        };
      }
      conditions.push(`bd.unit_id = ANY($${paramIdx}::int[])`);
      params.push(allowedUnitIds);
      paramIdx++;
    } else {
      conditions.push(`bd.unit_id = ANY($${paramIdx}::int[])`);
      params.push(requestedUnitIds);
      paramIdx++;
    }
  }

  // 3. Filter period_id
  if (filters.period_id) {
    conditions.push(`bd.period_id = $${paramIdx}`);
    params.push(parseInt(filters.period_id, 10));
    paramIdx++;
  }

  // 4. Filter company_id / company_code
  if (filters.company_id) {
    conditions.push(`u.company_id = $${paramIdx}`);
    params.push(parseInt(filters.company_id, 10));
    paramIdx++;
  }
  if (filters.company_code) {
    conditions.push(`cmp.code = $${paramIdx}`);
    params.push(filters.company_code.trim().toUpperCase());
    paramIdx++;
  }

  // 5. Filter doc_status
  if (filters.doc_status && filters.doc_status !== 'ALL') {
    conditions.push(`bd.status = $${paramIdx}`);
    params.push(filters.doc_status);
    paramIdx++;
  }

  // 6. Filter coa_group_id
  if (filters.coa_group_id) {
    conditions.push(`c.group_id = $${paramIdx}`);
    params.push(parseInt(filters.coa_group_id, 10));
    paramIdx++;
  }

  // 7. Filter coa_id
  if (filters.coa_id) {
    conditions.push(`i.coa_id = $${paramIdx}`);
    params.push(parseInt(filters.coa_id, 10));
    paramIdx++;
  }

  // 8. Filter search (nama barang, kode barang, nama unit, kode unit, nama COA, kode COA)
  if (filters.search && filters.search.trim()) {
    conditions.push(
      `(i.name ILIKE $${paramIdx} OR i.code ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx} OR u.code ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx} OR c.code ILIKE $${paramIdx})`
    );
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  // Filter bulan realisasi
  const mFrom = filters.month_from ? String(filters.month_from).padStart(2, '0') : '01';
  const mTo = filters.month_to ? String(filters.month_to).padStart(2, '0') : '12';

  const mFromParamIdx = paramIdx;
  params.push(mFrom);
  paramIdx++;

  const mToParamIdx = paramIdx;
  params.push(mTo);
  paramIdx++;

  const whereClause = conditions.join(' AND ');

  const fromJoinClause = `
    FROM expense_lines el
    JOIN budget_docs bd ON bd.id = el.doc_id
    JOIN units u ON u.id = bd.unit_id
    JOIN periods p ON p.id = bd.period_id
    JOIN items i ON i.id = el.item_id
    JOIN coas c ON c.id = i.coa_id
    LEFT JOIN coa_groups cg ON cg.id = c.group_id
    LEFT JOIN companies cmp ON cmp.id = u.company_id
    LEFT JOIN LATERAL (
      SELECT SUM(jl.debit - jl.credit)::bigint AS item_realization
      FROM journal_lines jl
      WHERE jl.status = 'CONFIRMED'
        AND jl.unit_id = bd.unit_id
        AND jl.item_id = el.item_id
        AND EXTRACT(YEAR FROM jl.trx_date) = p.year
        AND TO_CHAR(jl.trx_date, 'MM') BETWEEN $${mFromParamIdx} AND $${mToParamIdx}
    ) real_sub ON true
    WHERE ${whereClause}
  `;

  // Query Totals & Counts
  const totalsQuery = `
    SELECT 
      COUNT(el.id)::int AS total_lines,
      COUNT(DISTINCT bd.unit_id)::int AS total_units,
      COALESCE(SUM(el.amount), 0)::bigint AS total_rkap,
      COALESCE(SUM(real_sub.item_realization), 0)::bigint AS total_realization
    ${fromJoinClause}
  `;

  const totalsRes = await client.query(totalsQuery, params);
  const totalRow = totalsRes.rows[0] || {
    total_lines: 0,
    total_units: 0,
    total_rkap: 0,
    total_realization: 0,
  };

  const totalLines = parseInt(totalRow.total_lines, 10);
  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const perPage = Math.max(1, parseInt(filters.per_page || 50, 10));
  const totalPages = Math.ceil(totalLines / perPage) || 0;
  const offset = (page - 1) * perPage;

  // Data Query
  const dataQuery = `
    SELECT 
      el.id,
      el.doc_id,
      bd.status AS doc_status,
      u.id AS unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      cmp.code AS company_code,
      i.id AS item_id,
      i.code AS item_code,
      i.name AS item_name,
      i.uom,
      el.price_snapshot AS price,
      el.qty,
      el.amount,
      c.id AS coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      cg.id AS coa_group_id,
      cg.name AS coa_group_name,
      real_sub.item_realization AS realization,
      el.note,
      el.version,
      el.created_at,
      el.updated_at
    ${fromJoinClause}
    ORDER BY u.code ASC, c.code ASC, i.name ASC, el.id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const queryParams = [...params, perPage, offset];
  const dataRes = await client.query(dataQuery, queryParams);

  return {
    data: dataRes.rows.map((r) => {
      const amountNum = r.amount != null ? Number(r.amount) : 0;
      const realNum = r.realization != null ? Number(r.realization) : null;
      let pct = null;
      if (realNum !== null && amountNum > 0) {
        pct = Math.round((realNum / amountNum) * 100);
      }
      return {
        id: r.id,
        doc_id: r.doc_id,
        doc_status: r.doc_status,
        unit: {
          id: r.unit_id,
          code: r.unit_code,
          name: r.unit_name,
          company_code: r.company_code,
        },
        item: {
          id: r.item_id,
          code: r.item_code,
          name: r.item_name,
        },
        uom: r.uom || '—',
        price: r.price != null ? Number(r.price) : 0,
        qty: Number(r.qty) || 0,
        amount: amountNum,
        coa: {
          id: r.coa_id,
          code: r.coa_code,
          name: r.coa_name,
          type: r.coa_group_name || 'Biaya',
          group_id: r.coa_group_id,
        },
        realization: realNum,
        realization_percentage: pct,
        note: r.note,
        version: r.version,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    }),
    meta: {
      page,
      per_page: perPage,
      total: totalLines,
      total_pages: totalPages,
    },
    totals: {
      total_rkap: Number(totalRow.total_rkap),
      total_realization: Number(totalRow.total_realization),
      total_units: parseInt(totalRow.total_units, 10),
      total_lines: totalLines,
    },
  };
};

module.exports = {
  findByDocId,
  findById,
  findByDocAndItemId,
  getItemMasterPrice,
  insertLine,
  updateLine,
  deleteById,
  findAllCrossUnit,
};

