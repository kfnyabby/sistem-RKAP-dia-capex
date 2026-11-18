const db = require('../../db');

const findAll = async (params = {}) => {
  const {
    q,
    coa_id,
    group_name,
    is_active,
    page = 1,
    per_page = 20,
    sort_by = 'id',
    sort_dir = 'ASC',
  } = params;

  const conditions = [];
  const queryParams = [];
  let paramIdx = 1;

  if (q && q.trim()) {
    conditions.push(
      `(i.name ILIKE $${paramIdx} OR i.code ILIKE $${paramIdx} OR i.product_code ILIKE $${paramIdx})`
    );
    queryParams.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (coa_id !== undefined && coa_id !== null && coa_id !== '') {
    conditions.push(`i.coa_id = $${paramIdx}`);
    queryParams.push(parseInt(coa_id, 10));
    paramIdx++;
  }

  if (group_name && group_name.trim()) {
    conditions.push(`i.group_name = $${paramIdx}`);
    queryParams.push(group_name.trim());
    paramIdx++;
  }

  if (is_active !== undefined && is_active !== null && is_active !== '') {
    conditions.push(`i.is_active = $${paramIdx}`);
    queryParams.push(is_active === 'true' || is_active === true);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Hitung total
  const countSql = `SELECT COUNT(*) as total FROM items i ${whereClause}`;
  const countRes = await db.query(countSql, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  // Pagination & Sorting
  const limit = Math.max(1, parseInt(per_page, 10) || 20);
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

  const validSortCols = {
    id: 'i.id',
    code: 'i.code',
    name: 'i.name',
    product_code: 'i.product_code',
    group_name: 'i.group_name',
    price_cn: 'p_cn.price',
  };
  const orderByCol = validSortCols[sort_by] || 'i.id';
  const orderDir = sort_dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const dataSql = `
    SELECT
      i.id,
      i.code,
      i.product_code,
      i.name,
      i.group_name,
      i.uom,
      i.sell_uom,
      i.producer,
      i.min_stock,
      i.max_stock,
      i.coa_category,
      i.coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      i.inventory_coa_id,
      c_inv.code AS inventory_coa_code,
      c_inv.name AS inventory_coa_name,
      i.is_active,
      COALESCE(p_cn.price, 0) AS price_cn,
      COALESCE(p_cnh.price, 0) AS price_cnh
    FROM items i
    LEFT JOIN coas c ON i.coa_id = c.id
    LEFT JOIN coas c_inv ON i.inventory_coa_id = c_inv.id
    LEFT JOIN item_prices p_cn ON i.id = p_cn.item_id AND p_cn.company_id = 1 AND p_cn.period_id = 1
    LEFT JOIN item_prices p_cnh ON i.id = p_cnh.item_id AND p_cnh.company_id = 2 AND p_cnh.period_id = 2
    ${whereClause}
    ORDER BY ${orderByCol} ${orderDir}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const listRes = await db.query(dataSql, [...queryParams, limit, offset]);

  return {
    data: listRes.rows,
    meta: {
      page: parseInt(page, 10) || 1,
      per_page: limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const findById = async (id, client = db) => {
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return null;

  const sql = `
    SELECT
      i.*,
      c.code AS coa_code,
      c.name AS coa_name,
      c_inv.code AS inventory_coa_code,
      c_inv.name AS inventory_coa_name,
      COALESCE(p_cn.price, 0) AS price_cn,
      COALESCE(p_cnh.price, 0) AS price_cnh
    FROM items i
    LEFT JOIN coas c ON i.coa_id = c.id
    LEFT JOIN coas c_inv ON i.inventory_coa_id = c_inv.id
    LEFT JOIN item_prices p_cn ON i.id = p_cn.item_id AND p_cn.company_id = 1 AND p_cn.period_id = 1
    LEFT JOIN item_prices p_cnh ON i.id = p_cnh.item_id AND p_cnh.company_id = 2 AND p_cnh.period_id = 2
    WHERE i.id = $1
  `;
  const res = await client.query(sql, [itemId]);
  const item = res.rows[0] || null;
  if (!item) return null;

  // Ambil seluruh daftar harga per perusahaan dan periode
  const pricesSql = `
    SELECT
      comp.code AS company_code,
      p.year AS period_year,
      ip.price
    FROM item_prices ip
    JOIN companies comp ON ip.company_id = comp.id
    JOIN periods p ON ip.period_id = p.id
    WHERE ip.item_id = $1
    ORDER BY comp.code ASC, p.year ASC
  `;
  const pricesRes = await client.query(pricesSql, [itemId]);
  item.prices = pricesRes.rows.map((row) => ({
    company_code: row.company_code,
    period_year: row.period_year,
    price: parseInt(row.price, 10),
  }));

  return item;
};

const findByCode = async (code, client = db) => {
  if (!code) return null;
  const res = await client.query('SELECT * FROM items WHERE code = $1', [code.trim()]);
  return res.rows[0] || null;
};

const upsertItem = async (data, client = db) => {
  const {
    code,
    name,
    product_code = null,
    group_name = null,
    uom = 'Pcs',
    sell_uom = null,
    producer = null,
    coa_id = null,
    inventory_coa_id = null,
    coa_category = null,
    min_stock = 0,
    max_stock = 0,
    is_active = true,
  } = data;

  const sql = `
    INSERT INTO items (
      code, name, product_code, group_name, uom, sell_uom, producer,
      coa_id, inventory_coa_id, coa_category, min_stock, max_stock, is_active, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      product_code = COALESCE(EXCLUDED.product_code, items.product_code),
      group_name = COALESCE(EXCLUDED.group_name, items.group_name),
      uom = COALESCE(EXCLUDED.uom, items.uom),
      sell_uom = COALESCE(EXCLUDED.sell_uom, items.sell_uom),
      producer = COALESCE(EXCLUDED.producer, items.producer),
      coa_id = COALESCE(EXCLUDED.coa_id, items.coa_id),
      inventory_coa_id = COALESCE(EXCLUDED.inventory_coa_id, items.inventory_coa_id),
      coa_category = COALESCE(EXCLUDED.coa_category, items.coa_category),
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING *
  `;

  const res = await client.query(sql, [
    code.trim(),
    name.trim(),
    product_code ? product_code.trim() : null,
    group_name ? group_name.trim() : null,
    uom ? uom.trim() : 'Pcs',
    sell_uom ? sell_uom.trim() : null,
    producer ? producer.trim() : null,
    coa_id || null,
    inventory_coa_id || null,
    coa_category ? coa_category.trim() : null,
    min_stock || 0,
    max_stock || 0,
    is_active,
  ]);

  return res.rows[0];
};

const upsertPrice = async (itemId, companyId, periodId, price, client = db) => {
  const sql = `
    INSERT INTO item_prices (item_id, company_id, period_id, price)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (item_id, company_id, period_id)
    DO UPDATE SET price = EXCLUDED.price
    RETURNING *
  `;
  const res = await client.query(sql, [itemId, companyId, periodId, price]);
  return res.rows[0];
};

const updateStatus = async (id, isActive, client = db) => {
  const res = await client.query(
    'UPDATE items SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, isActive]
  );
  return res.rows[0] || null;
};

const getQualityMetrics = async (client = db) => {
  const metricsSql = `
    SELECT
      COUNT(*) AS total_items,
      COUNT(*) FILTER (WHERE coa_id IS NULL) AS items_without_coa,
      COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_items
    FROM items
  `;
  const metricsRes = await client.query(metricsSql);
  const row = metricsRes.rows[0];

  // Hitung barang dengan HPP 0 pada CN
  const hppZeroSql = `
    SELECT COUNT(*) AS count
    FROM item_prices
    WHERE company_id = 1 AND price = 0
  `;
  const hppZeroRes = await client.query(hppZeroSql);

  // Hitung selisih harga CN vs CNH
  const diffPricesSql = `
    SELECT COUNT(*) AS count
    FROM item_prices p1
    JOIN item_prices p2 ON p1.item_id = p2.item_id AND p2.company_id = 2
    WHERE p1.company_id = 1 AND p1.price != p2.price
  `;
  const diffPricesRes = await client.query(diffPricesSql);

  // Hitungan barang tanpa harga per perusahaan dan periode (FR-M8 & Fase 2b)
  const noPricesByPeriodSql = `
    SELECT
      comp.code AS company_code,
      comp.name AS company_name,
      p.year AS period_year,
      p.id AS period_id,
      COUNT(i.id)::int AS items_without_price
    FROM companies comp
    JOIN periods p ON p.company_id = comp.id
    CROSS JOIN items i
    WHERE i.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM item_prices ip
        WHERE ip.item_id = i.id
          AND ip.company_id = comp.id
          AND ip.period_id = p.id
          AND ip.price > 0
      )
    GROUP BY comp.id, comp.code, comp.name, p.id, p.year
    ORDER BY comp.code ASC, p.year ASC
  `;
  const noPricesRes = await client.query(noPricesByPeriodSql);

  return {
    total_items: parseInt(row.total_items, 10),
    items_without_coa: parseInt(row.items_without_coa, 10),
    inactive_items: parseInt(row.inactive_items, 10),
    hpp_zero_count: parseInt(hppZeroRes.rows[0].count, 10),
    diff_prices_cn_cnh: parseInt(diffPricesRes.rows[0].count, 10),
    items_without_price_by_period: noPricesRes.rows.map((r) => ({
      company_code: r.company_code,
      company_name: r.company_name,
      period_year: r.period_year,
      period_id: r.period_id,
      items_without_price: parseInt(r.items_without_price, 10),
    })),
  };
};

const getAvailableForDoc = async (docId, companyId, periodId, params = {}) => {
  const { q, group_id, coa_id, page = 1, per_page = 25 } = params;

  const conditions = [
    'i.is_active = TRUE',
    'i.coa_id IS NOT NULL',
    'NOT EXISTS (SELECT 1 FROM expense_lines el WHERE el.doc_id = $1 AND el.item_id = i.id)',
  ];
  const queryParams = [parseInt(docId, 10)];
  let paramIdx = 2;

  if (q && q.trim()) {
    conditions.push(
      `(i.name ILIKE $${paramIdx} OR i.code ILIKE $${paramIdx} OR i.product_code ILIKE $${paramIdx})`
    );
    queryParams.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (group_id) {
    conditions.push(`c.group_id = $${paramIdx}`);
    queryParams.push(parseInt(group_id, 10));
    paramIdx++;
  }

  if (coa_id) {
    conditions.push(`i.coa_id = $${paramIdx}`);
    queryParams.push(parseInt(coa_id, 10));
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countSql = `
    SELECT COUNT(*) as total 
    FROM items i
    JOIN coas c ON c.id = i.coa_id
    ${whereClause}
  `;
  const countRes = await db.query(countSql, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedPerPage = Math.max(1, parseInt(per_page, 10));
  const offset = (parsedPage - 1) * parsedPerPage;

  const dataSql = `
    SELECT 
      i.id AS item_id,
      i.id,
      i.code AS item_code,
      i.name AS item_name,
      i.uom,
      i.coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      c.group_id,
      COALESCE(cg.name, 'Lainnya') AS group_name,
      COALESCE(ip.price, 0) AS price
    FROM items i
    JOIN coas c ON c.id = i.coa_id
    LEFT JOIN coa_groups cg ON cg.id = c.group_id
    LEFT JOIN item_prices ip ON ip.item_id = i.id 
      AND ip.company_id = $${paramIdx} 
      AND ip.period_id = $${paramIdx + 1}
    ${whereClause}
    ORDER BY c.code ASC, i.name ASC
    LIMIT $${paramIdx + 2} OFFSET $${paramIdx + 3}
  `;
  queryParams.push(
    parseInt(companyId, 10),
    parseInt(periodId, 10),
    parsedPerPage,
    offset
  );

  const dataRes = await db.query(dataSql, queryParams);

  return {
    data: dataRes.rows.map((r) => ({
      ...r,
      price: parseInt(r.price, 10),
    })),
    meta: {
      page: parsedPage,
      per_page: parsedPerPage,
      total,
    },
  };
};

module.exports = {
  findAll,
  findById,
  findByCode,
  upsertItem,
  upsertPrice,
  updateStatus,
  getQualityMetrics,
  getAvailableForDoc,
};

