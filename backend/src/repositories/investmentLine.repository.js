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

const findByDocId = async (docId, filters = {}, user = null, client = db) => {
  const parsedDocId = parseInt(docId, 10);
  if (isNaN(parsedDocId)) return { data: [], meta: { page: 1, per_page: 50, total: 0 } };

  if (user) {
    const accessibleUnitIds = await getAccessibleUnitIds(user);
    if (accessibleUnitIds !== null) {
      if (accessibleUnitIds.length === 0) {
        return { data: [], meta: { page: 1, per_page: 50, total: 0 } };
      }
      // Pastikan docId milik unit yang berwenang
      const docCheck = await client.query(
        'SELECT unit_id FROM budget_docs WHERE id = $1 AND unit_id = ANY($2::int[])',
        [parsedDocId, accessibleUnitIds]
      );
      if (docCheck.rows.length === 0) {
        return { data: [], meta: { page: 1, per_page: 50, total: 0 } };
      }
    }
  }

  const conditions = ['il.doc_id = $1'];
  const params = [parsedDocId];
  let paramIdx = 2;

  if (filters.search && filters.search.trim()) {
    conditions.push(
      `(il.name ILIKE $${paramIdx} OR ic.name ILIKE $${paramIdx} OR p.name ILIKE $${paramIdx})`
    );
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  if (filters.category_id) {
    conditions.push(`il.category_id = $${paramIdx}`);
    params.push(parseInt(filters.category_id, 10));
    paramIdx++;
  }

  if (filters.priority_id) {
    conditions.push(`il.priority_id = $${paramIdx}`);
    params.push(parseInt(filters.priority_id, 10));
    paramIdx++;
  }

  if (filters.plan_month) {
    conditions.push(`il.plan_month = $${paramIdx}`);
    params.push(parseInt(filters.plan_month, 10));
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await client.query(
    `SELECT COUNT(*) FROM investment_lines il
     JOIN investment_categories ic ON ic.id = il.category_id
     LEFT JOIN priorities p ON p.id = il.priority_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const perPage = Math.max(1, parseInt(filters.per_page || 50, 10));
  const offset = (page - 1) * perPage;

  const dataQuery = `
    SELECT 
      il.id,
      il.doc_id,
      il.category_id,
      ic.name AS category_name,
      il.priority_id,
      p.name AS priority_name,
      il.coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      il.name,
      il.qty,
      il.price,
      il.amount,
      il.plan_month,
      il.useful_life_months,
      il.depreciation_amount,
      il.strategic_objective,
      il.kpi,
      il.work_program,
      il.strategic_action,
      il.note,
      il.version,
      il.created_at,
      il.updated_at,
      il.created_by,
      u.name AS created_by_name
    FROM investment_lines il
    JOIN investment_categories ic ON ic.id = il.category_id
    LEFT JOIN priorities p ON p.id = il.priority_id
    LEFT JOIN coas c ON c.id = il.coa_id
    LEFT JOIN users u ON u.id = il.created_by
    ${whereClause}
    ORDER BY il.plan_month ASC, il.id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  params.push(perPage, offset);
  const dataRes = await client.query(dataQuery, params);

  return {
    data: dataRes.rows.map((r) => ({
      ...r,
      qty: parseInt(r.qty, 10),
      price: parseInt(r.price, 10),
      amount: parseInt(r.amount, 10),
      useful_life_months: parseInt(r.useful_life_months, 10),
      depreciation_amount: parseInt(r.depreciation_amount, 10),
      version: parseInt(r.version, 10),
    })),
    meta: {
      page,
      per_page: perPage,
      total,
    },
  };
};

const findById = async (lineId, user = null, client = db) => {
  const parsedLineId = parseInt(lineId, 10);
  if (isNaN(parsedLineId)) return null;

  const query = `
    SELECT 
      il.*,
      bd.unit_id,
      bd.period_id,
      bd.status AS doc_status,
      bd.type AS doc_type,
      un.code AS unit_code,
      un.name AS unit_name,
      un.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      ic.name AS category_name,
      p.name AS priority_name,
      c.code AS coa_code,
      c.name AS coa_name
    FROM investment_lines il
    JOIN budget_docs bd ON bd.id = il.doc_id
    JOIN units un ON un.id = bd.unit_id
    JOIN companies comp ON comp.id = un.company_id
    JOIN investment_categories ic ON ic.id = il.category_id
    LEFT JOIN priorities p ON p.id = il.priority_id
    LEFT JOIN coas c ON c.id = il.coa_id
    WHERE il.id = $1
  `;

  const res = await client.query(query, [parsedLineId]);
  const row = res.rows[0];
  if (!row) return null;

  if (user && user.role !== 'akuntansi') {
    const accessibleUnitIds = await getAccessibleUnitIds(user);
    if (!accessibleUnitIds.includes(row.unit_id)) {
      return null; // Fail-closed: user tidak berhak atas unit dokumen baris ini
    }
  }

  return {
    ...row,
    qty: parseInt(row.qty, 10),
    price: parseInt(row.price, 10),
    amount: parseInt(row.amount, 10),
    useful_life_months: parseInt(row.useful_life_months, 10),
    depreciation_amount: parseInt(row.depreciation_amount, 10),
    version: parseInt(row.version, 10),
  };
};

const create = async (lineData, client = db) => {
  const {
    doc_id,
    category_id,
    priority_id,
    coa_id = null,
    name,
    qty = 1,
    price = 0,
    amount = 0,
    plan_month = 1,
    useful_life_months = 0,
    depreciation_amount = 0,
    strategic_objective = null,
    kpi = null,
    work_program = null,
    strategic_action = null,
    note = null,
    created_by = null,
  } = lineData;

  const query = `
    INSERT INTO investment_lines (
      doc_id, category_id, priority_id, coa_id, name,
      qty, price, amount, plan_month, useful_life_months, depreciation_amount,
      strategic_objective, kpi, work_program, strategic_action, note,
      version, created_by, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 1, $17, NOW(), NOW())
    RETURNING *
  `;

  const res = await client.query(query, [
    parseInt(doc_id, 10),
    parseInt(category_id, 10),
    parseInt(priority_id, 10),
    coa_id ? parseInt(coa_id, 10) : null,
    name.trim(),
    parseInt(qty, 10),
    price,
    amount,
    parseInt(plan_month, 10),
    parseInt(useful_life_months, 10),
    depreciation_amount,
    strategic_objective ? strategic_objective.trim() : null,
    kpi ? kpi.trim() : null,
    work_program ? work_program.trim() : null,
    strategic_action ? strategic_action.trim() : null,
    note ? note.trim() : null,
    created_by,
  ]);

  const row = res.rows[0];
  return {
    ...row,
    qty: parseInt(row.qty, 10),
    price: parseInt(row.price, 10),
    amount: parseInt(row.amount, 10),
    useful_life_months: parseInt(row.useful_life_months, 10),
    depreciation_amount: parseInt(row.depreciation_amount, 10),
    version: parseInt(row.version, 10),
  };
};

const update = async (lineId, updateData, client = db) => {
  const {
    category_id,
    priority_id,
    coa_id,
    name,
    qty,
    price,
    amount,
    plan_month,
    useful_life_months,
    depreciation_amount,
    strategic_objective,
    kpi,
    work_program,
    strategic_action,
    note,
  } = updateData;

  const query = `
    UPDATE investment_lines
    SET category_id = COALESCE($1, category_id),
        priority_id = COALESCE($2, priority_id),
        coa_id = COALESCE($3, coa_id),
        name = COALESCE($4, name),
        qty = COALESCE($5, qty),
        price = COALESCE($6, price),
        amount = COALESCE($7, amount),
        plan_month = COALESCE($8, plan_month),
        useful_life_months = COALESCE($9, useful_life_months),
        depreciation_amount = COALESCE($10, depreciation_amount),
        strategic_objective = $11,
        kpi = $12,
        work_program = $13,
        strategic_action = $14,
        note = $15,
        version = version + 1,
        updated_at = NOW()
    WHERE id = $16
    RETURNING *
  `;

  const res = await client.query(query, [
    category_id ? parseInt(category_id, 10) : null,
    priority_id ? parseInt(priority_id, 10) : null,
    coa_id !== undefined ? (coa_id ? parseInt(coa_id, 10) : null) : null,
    name ? name.trim() : null,
    qty !== undefined ? parseInt(qty, 10) : null,
    price !== undefined ? price : null,
    amount !== undefined ? amount : null,
    plan_month !== undefined ? parseInt(plan_month, 10) : null,
    useful_life_months !== undefined ? parseInt(useful_life_months, 10) : null,
    depreciation_amount !== undefined ? depreciation_amount : null,
    strategic_objective !== undefined ? (strategic_objective ? strategic_objective.trim() : null) : null,
    kpi !== undefined ? (kpi ? kpi.trim() : null) : null,
    work_program !== undefined ? (work_program ? work_program.trim() : null) : null,
    strategic_action !== undefined ? (strategic_action ? strategic_action.trim() : null) : null,
    note !== undefined ? (note ? note.trim() : null) : null,
    parseInt(lineId, 10),
  ]);

  const row = res.rows[0];
  if (!row) return null;

  return {
    ...row,
    qty: parseInt(row.qty, 10),
    price: parseInt(row.price, 10),
    amount: parseInt(row.amount, 10),
    useful_life_months: parseInt(row.useful_life_months, 10),
    depreciation_amount: parseInt(row.depreciation_amount, 10),
    version: parseInt(row.version, 10),
  };
};

const deleteById = async (lineId, client = db) => {
  await client.query('DELETE FROM investment_lines WHERE id = $1', [parseInt(lineId, 10)]);
};

const getSuggestions = async (docId, field, user = null, client = db) => {
  const allowedFields = ['strategic_objective', 'kpi', 'work_program', 'strategic_action'];
  if (!allowedFields.includes(field)) {
    return [];
  }

  const parsedDocId = parseInt(docId, 10);
  if (isNaN(parsedDocId)) return [];

  // Dapatkan unit_id dari dokumen
  const docRes = await client.query('SELECT unit_id FROM budget_docs WHERE id = $1', [parsedDocId]);
  if (docRes.rows.length === 0) return [];
  const targetUnitId = docRes.rows[0].unit_id;

  if (user && user.role !== 'akuntansi') {
    const accessibleUnitIds = await getAccessibleUnitIds(user);
    if (!accessibleUnitIds.includes(targetUnitId)) {
      return [];
    }
  }

  const query = `
    SELECT DISTINCT il.${field} AS suggestion
    FROM investment_lines il
    JOIN budget_docs bd ON bd.id = il.doc_id
    WHERE bd.unit_id = $1
      AND il.${field} IS NOT NULL
      AND TRIM(il.${field}) != ''
    ORDER BY il.${field} ASC
    LIMIT 20
  `;

  const res = await client.query(query, [targetUnitId]);
  return res.rows.map((r) => r.suggestion);
};

const getLastLineByDocId = async (docId, client = db) => {
  const parsedDocId = parseInt(docId, 10);
  if (isNaN(parsedDocId)) return null;

  const query = `
    SELECT strategic_objective, kpi, work_program, strategic_action, note
    FROM investment_lines
    WHERE doc_id = $1
    ORDER BY id DESC
    LIMIT 1
  `;

  const res = await client.query(query, [parsedDocId]);
  return res.rows[0] || null;
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

const findAllCrossUnit = async (filters = {}, user, client = db) => {
  const accessibleUnitIds = await getAccessibleUnitIds(user);
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return {
      data: [],
      meta: { page: 1, per_page: 50, total: 0, total_pages: 0 },
      totals: { total_amount: 0, total_depreciation: 0, total_units: 0, total_lines: 0 },
    };
  }

  const conditions = ["bd.type = 'INVESTASI'"];
  const params = [];
  let paramIdx = 1;

  // 1. Scoping Akses Unit
  if (accessibleUnitIds !== null) {
    conditions.push(`bd.unit_id = ANY($${paramIdx}::int[])`);
    params.push(accessibleUnitIds);
    paramIdx++;
  }

  // 2. Filter unit_id spesifik (bisa banyak)
  const requestedUnitIds = parseUnitIds(filters.unit_id);
  if (requestedUnitIds.length > 0) {
    if (accessibleUnitIds !== null) {
      const allowedUnitIds = requestedUnitIds.filter((id) => accessibleUnitIds.includes(id));
      if (allowedUnitIds.length === 0) {
        return {
          data: [],
          meta: { page: 1, per_page: 50, total: 0, total_pages: 0 },
          totals: { total_amount: 0, total_depreciation: 0, total_units: 0, total_lines: 0 },
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

  // 3. Filter kategori: spesifik category_id atau fallback Laptop/PC bila diminta
  if (filters.category_id) {
    conditions.push(`il.category_id = $${paramIdx}`);
    params.push(parseInt(filters.category_id, 10));
    paramIdx++;
  } else if (
    filters.is_laptop_pc === true ||
    filters.is_laptop_pc === 'true' ||
    filters.category_name === 'PC/LAPTOP'
  ) {
    conditions.push(`(ic.name ILIKE $${paramIdx} OR ic.name ILIKE $${paramIdx + 1})`);
    params.push('%PC%', '%LAPTOP%');
    paramIdx += 2;
  }

  // 4. Filter prioritas
  if (filters.priority_id) {
    conditions.push(`il.priority_id = $${paramIdx}`);
    params.push(parseInt(filters.priority_id, 10));
    paramIdx++;
  }

  // 5. Filter status dokumen
  if (filters.doc_status && filters.doc_status !== 'ALL') {
    conditions.push(`bd.status = $${paramIdx}`);
    params.push(filters.doc_status);
    paramIdx++;
  }

  // 6. Filter period_id
  if (filters.period_id) {
    conditions.push(`bd.period_id = $${paramIdx}`);
    params.push(parseInt(filters.period_id, 10));
    paramIdx++;
  }

  // 7. Filter company_id / company_code
  if (filters.company_id) {
    conditions.push(`un.company_id = $${paramIdx}`);
    params.push(parseInt(filters.company_id, 10));
    paramIdx++;
  }
  if (filters.company_code) {
    conditions.push(`comp.code = $${paramIdx}`);
    params.push(filters.company_code.trim().toUpperCase());
    paramIdx++;
  }

  // 8. Filter search (nama barang, nama/kode unit, nama kategori, nama/kode COA)
  if (filters.search && filters.search.trim()) {
    conditions.push(
      `(il.name ILIKE $${paramIdx} OR un.name ILIKE $${paramIdx} OR un.code ILIKE $${paramIdx} OR ic.name ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx} OR c.code ILIKE $${paramIdx})`
    );
    params.push(`%${filters.search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const fromJoinClause = `
    FROM investment_lines il
    JOIN budget_docs bd ON bd.id = il.doc_id
    JOIN periods p ON p.id = bd.period_id
    JOIN units un ON un.id = bd.unit_id
    JOIN companies comp ON comp.id = un.company_id
    JOIN investment_categories ic ON ic.id = il.category_id
    LEFT JOIN priorities prio ON prio.id = il.priority_id
    LEFT JOIN coas c ON c.id = il.coa_id
    ${whereClause}
  `;

  // Query Totals
  const totalsQuery = `
    SELECT 
      COUNT(il.id)::int AS total_lines,
      COUNT(DISTINCT bd.unit_id)::int AS total_units,
      COALESCE(SUM(il.amount), 0)::bigint AS total_amount,
      COALESCE(SUM(il.depreciation_amount), 0)::bigint AS total_depreciation
    ${fromJoinClause}
  `;

  const totalsRes = await client.query(totalsQuery, params);
  const totalRow = totalsRes.rows[0] || {
    total_lines: 0,
    total_units: 0,
    total_amount: 0,
    total_depreciation: 0,
  };

  const totalLines = parseInt(totalRow.total_lines, 10);
  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const perPage = Math.max(1, parseInt(filters.per_page || 50, 10));
  const totalPages = Math.ceil(totalLines / perPage) || 0;
  const offset = (page - 1) * perPage;

  // Data Query
  const dataQuery = `
    SELECT 
      il.id,
      il.doc_id,
      bd.status AS doc_status,
      bd.period_id,
      p.year AS period_year,
      bd.unit_id,
      un.code AS unit_code,
      un.name AS unit_name,
      un.company_id,
      comp.code AS company_code,
      comp.name AS company_name,
      il.category_id,
      ic.name AS category_name,
      il.priority_id,
      prio.name AS priority_name,
      il.coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      il.name,
      il.qty,
      il.price,
      il.amount,
      il.plan_month,
      il.useful_life_months,
      il.depreciation_amount,
      il.strategic_objective,
      il.kpi,
      il.work_program,
      il.strategic_action,
      il.note,
      il.version,
      il.created_at,
      il.updated_at
    ${fromJoinClause}
    ORDER BY un.code ASC, il.id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const queryParams = [...params, perPage, offset];
  const dataRes = await client.query(dataQuery, queryParams);

  return {
    data: dataRes.rows.map((r) => ({
      id: r.id,
      doc_id: r.doc_id,
      doc_status: r.doc_status,
      unit: {
        id: r.unit_id,
        code: r.unit_code,
        name: r.unit_name,
        company_code: r.company_code,
      },
      name: r.name,
      category: {
        id: r.category_id,
        name: r.category_name,
      },
      priority: {
        id: r.priority_id,
        name: r.priority_name || '—',
      },
      coa: {
        id: r.coa_id,
        code: r.coa_code,
        name: r.coa_name,
      },
      qty: parseInt(r.qty, 10) || 0,
      price: parseInt(r.price, 10) || 0,
      amount: parseInt(r.amount, 10) || 0,
      plan_month: parseInt(r.plan_month, 10) || 1,
      useful_life_months: parseInt(r.useful_life_months, 10) || 0,
      depreciation_amount: parseInt(r.depreciation_amount, 10) || 0,
      strategic_objective: r.strategic_objective,
      kpi: r.kpi,
      work_program: r.work_program,
      strategic_action: r.strategic_action,
      note: r.note,
      version: parseInt(r.version, 10) || 1,
      created_at: r.created_at,
      updated_at: r.updated_at,
      // Flat properties untuk kompatibilitas ke belakang (LaptopPcPage)
      unit_code: r.unit_code,
      unit_name: r.unit_name,
      category_name: r.category_name,
      priority_name: r.priority_name,
      coa_code: r.coa_code,
      coa_name: r.coa_name,
    })),
    meta: {
      page,
      per_page: perPage,
      total: totalLines,
      total_pages: totalPages,
    },
    totals: {
      total_amount: Number(totalRow.total_amount),
      total_depreciation: Number(totalRow.total_depreciation),
      total_units: parseInt(totalRow.total_units, 10),
      total_lines: totalLines,
    },
  };
};

module.exports = {
  getAccessibleUnitIds,
  findByDocId,
  findById,
  create,
  update,
  deleteById,
  getSuggestions,
  getLastLineByDocId,
  findAllCrossUnit,
};
