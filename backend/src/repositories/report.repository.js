const db = require('../../db');

/**
 * Repository Laporan & Matriks RKAP (Fase 7)
 * Seluruh kalkulasi total, subtotal, dan agregasi dihitung murni di SQL.
 */

/**
 * 1. Laporan Anggaran Biaya per COA
 */
const getExpenseByCoa = async (filters = {}, accessibleUnitIds = null, client = db) => {
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return [];
  }

  const { company_id, period_id, unit_id, group_id } = filters;

  const sql = `
    SELECT 
      c.id AS coa_id,
      c.code AS coa_code,
      c.name AS coa_name,
      cg.id AS group_id,
      cg.name AS group_name,
      SUM(el.amount)::bigint AS amount,
      COUNT(el.id)::int AS line_count
    FROM expense_lines el
    JOIN budget_docs bd ON el.doc_id = bd.id
    JOIN items it ON el.item_id = it.id
    JOIN coas c ON it.coa_id = c.id
    LEFT JOIN coa_groups cg ON c.group_id = cg.id
    WHERE bd.type = 'BIAYA'
      AND ($1::int IS NULL OR bd.period_id = $1)
      AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
      AND ($3::int IS NULL OR bd.unit_id = $3)
      AND ($4::int IS NULL OR cg.id = $4)
      AND ($5::int IS NULL OR EXISTS (SELECT 1 FROM units u WHERE u.id = bd.unit_id AND u.company_id = $5))
    GROUP BY c.id, c.code, c.name, cg.id, cg.name
    ORDER BY c.code ASC;
  `;

  const params = [
    period_id ? parseInt(period_id, 10) : null,
    accessibleUnitIds,
    unit_id ? parseInt(unit_id, 10) : null,
    group_id ? parseInt(group_id, 10) : null,
    company_id ? parseInt(company_id, 10) : null,
  ];

  const res = await client.query(sql, params);
  return res.rows;
};

/**
 * 2. Laporan Rekapitulasi Investasi (per jenis/kategori, prioritas, atau bulan)
 */
const getInvestmentSummary = async (filters = {}, accessibleUnitIds = null, client = db) => {
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return [];
  }

  const { company_id, period_id, unit_id, group_by = 'type' } = filters;
  const groupBy = group_by.toLowerCase();

  const baseWhere = `
    WHERE bd.type = 'INVESTASI'
      AND ($1::int IS NULL OR bd.period_id = $1)
      AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
      AND ($3::int IS NULL OR bd.unit_id = $3)
      AND ($4::int IS NULL OR EXISTS (SELECT 1 FROM units u WHERE u.id = bd.unit_id AND u.company_id = $4))
  `;
  const params = [
    period_id ? parseInt(period_id, 10) : null,
    accessibleUnitIds,
    unit_id ? parseInt(unit_id, 10) : null,
    company_id ? parseInt(company_id, 10) : null,
  ];

  if (groupBy === 'priority') {
    const sql = `
      SELECT 
        p.id AS priority_id,
        p.name AS priority_name,
        COUNT(il.id)::int AS count,
        SUM(il.amount)::bigint AS amount,
        SUM(il.depreciation_amount)::bigint AS depreciation_amount
      FROM investment_lines il
      JOIN budget_docs bd ON il.doc_id = bd.id
      JOIN priorities p ON il.priority_id = p.id
      ${baseWhere}
      GROUP BY p.id, p.name
      ORDER BY p.id ASC;
    `;
    const res = await client.query(sql, params);
    return res.rows;
  }

  if (groupBy === 'month') {
    const sql = `
      SELECT 
        il.plan_month AS month,
        COUNT(il.id)::int AS count,
        SUM(il.amount)::bigint AS amount,
        SUM(il.depreciation_amount)::bigint AS depreciation_amount
      FROM investment_lines il
      JOIN budget_docs bd ON il.doc_id = bd.id
      ${baseWhere}
      GROUP BY il.plan_month
      ORDER BY il.plan_month ASC;
    `;
    const res = await client.query(sql, params);
    return res.rows;
  }

  // Default: group_by === 'type' || group_by === 'category'
  const sql = `
    SELECT 
      ic.id AS category_id,
      ic.name AS investment_type,
      ic.name AS category_name,
      COUNT(il.id)::int AS count,
      SUM(il.amount)::bigint AS amount,
      SUM(il.depreciation_amount)::bigint AS depreciation_amount
    FROM investment_lines il
    JOIN budget_docs bd ON il.doc_id = bd.id
    JOIN investment_categories ic ON il.category_id = ic.id
    ${baseWhere}
    GROUP BY ic.id, ic.name
    ORDER BY ic.name ASC;
  `;
  const res = await client.query(sql, params);
  return res.rows;
};

/**
 * 3. Laporan Rekap Gabungan CN dan CNH (Consolidated Report)
 * Hierarki: Perusahaan -> Unit -> Lines (Biaya per COA, Investasi per Kategori)
 * dengan subtotal unit, subtotal perusahaan, dan grand total gabungan.
 */
const getConsolidatedReport = async (
  periodYear,
  companyIds = null,
  type = 'ALL',
  targetUnitId = null,
  accessibleUnitIds = null,
  client = db
) => {
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return {
      period_year: periodYear,
      companies: [],
      grand_total: { rkap: null, realisasi: null },
    };
  }

  // Query detail baris dan subtotal dihitung di SQL
  const sql = `
    WITH raw_lines AS (
      -- 1. Baris Anggaran Biaya
      SELECT 
        cmp.id AS company_id,
        cmp.code AS company_code,
        cmp.name AS company_name,
        u.id AS unit_id,
        u.code AS unit_code,
        u.name AS unit_name,
        'BIAYA' AS kind,
        c.code AS coa_code,
        c.name AS line_name,
        SUM(el.amount)::bigint AS rkap,
        -- Realisasi Biaya matching unit and coa in that year
        (
          SELECT SUM(jl.debit - jl.credit)::bigint
          FROM journal_lines jl
          JOIN import_batches b ON jl.batch_id = b.id
          WHERE jl.status = 'CONFIRMED'
            AND b.company_id = cmp.id
            AND EXTRACT(YEAR FROM jl.trx_date) = $1
            AND jl.unit_id = u.id
            AND jl.coa_id = c.id
        ) AS realisasi
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN companies cmp ON u.company_id = cmp.id
      JOIN items it ON el.item_id = it.id
      JOIN coas c ON it.coa_id = c.id
      WHERE p.year = $1
        AND bd.type = 'BIAYA'
        AND ($2::int[] IS NULL OR cmp.id = ANY($2::int[]))
        AND ($3::int[] IS NULL OR u.id = ANY($3::int[]))
        AND ($4::int IS NULL OR u.id = $4)
        AND ($5::varchar IS NULL OR $5 = 'ALL' OR $5 = 'BIAYA')
      GROUP BY cmp.id, cmp.code, cmp.name, u.id, u.code, u.name, c.id, c.code, c.name
      
      UNION ALL
      
      -- 2. Baris Anggaran Investasi
      SELECT 
        cmp.id AS company_id,
        cmp.code AS company_code,
        cmp.name AS company_name,
        u.id AS unit_id,
        u.code AS unit_code,
        u.name AS unit_name,
        'INVESTASI' AS kind,
        COALESCE(c.code, '—') AS coa_code,
        ic.name AS line_name,
        SUM(il.amount)::bigint AS rkap,
        -- Realisasi Investasi matching unit and coa in that year
        (
          SELECT SUM(jl.debit)::bigint
          FROM journal_lines jl
          JOIN import_batches b ON jl.batch_id = b.id
          LEFT JOIN coas c_asset ON jl.coa_id = c_asset.id
          WHERE jl.status = 'CONFIRMED'
            AND b.company_id = cmp.id
            AND EXTRACT(YEAR FROM jl.trx_date) = $1
            AND jl.unit_id = u.id
            AND (c_asset.code LIKE '1.2.1.1.%' OR COALESCE(c_asset.id, 0) = COALESCE(c.id, -1))
        ) AS realisasi
      FROM investment_lines il
      JOIN budget_docs bd ON il.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN companies cmp ON u.company_id = cmp.id
      JOIN investment_categories ic ON il.category_id = ic.id
      LEFT JOIN coas c ON il.coa_id = c.id
      WHERE p.year = $1
        AND bd.type = 'INVESTASI'
        AND ($2::int[] IS NULL OR cmp.id = ANY($2::int[]))
        AND ($3::int[] IS NULL OR u.id = ANY($3::int[]))
        AND ($4::int IS NULL OR u.id = $4)
        AND ($5::varchar IS NULL OR $5 = 'ALL' OR $5 = 'INVESTASI')
      GROUP BY cmp.id, cmp.code, cmp.name, u.id, u.code, u.name, ic.name, c.code, c.id
    )
    SELECT 
      company_id,
      company_code,
      company_name,
      unit_id,
      unit_code,
      unit_name,
      kind,
      coa_code,
      line_name,
      rkap,
      realisasi,
      CASE 
        WHEN rkap > 0 AND realisasi IS NOT NULL 
        THEN ROUND((realisasi::numeric / rkap) * 100)::int
        ELSE NULL 
      END AS usage_percent
    FROM raw_lines
    ORDER BY company_id ASC, unit_code ASC, kind ASC, coa_code ASC;
  `;

  // Query SQL untuk kalkulasi subtotal dan grand total secara presisi di database
  const totalsSql = `
    WITH raw_lines AS (
      SELECT 
        cmp.id AS company_id,
        u.id AS unit_id,
        SUM(el.amount)::bigint AS rkap,
        (
          SELECT SUM(jl.debit - jl.credit)::bigint
          FROM journal_lines jl
          JOIN import_batches b ON jl.batch_id = b.id
          WHERE jl.status = 'CONFIRMED'
            AND b.company_id = cmp.id
            AND EXTRACT(YEAR FROM jl.trx_date) = $1
            AND jl.unit_id = u.id
            AND jl.coa_id = it.coa_id
        ) AS realisasi
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN companies cmp ON u.company_id = cmp.id
      JOIN items it ON el.item_id = it.id
      WHERE p.year = $1
        AND bd.type = 'BIAYA'
        AND ($2::int[] IS NULL OR cmp.id = ANY($2::int[]))
        AND ($3::int[] IS NULL OR u.id = ANY($3::int[]))
        AND ($4::int IS NULL OR u.id = $4)
        AND ($5::varchar IS NULL OR $5 = 'ALL' OR $5 = 'BIAYA')
      GROUP BY cmp.id, u.id, it.coa_id

      UNION ALL

      SELECT 
        cmp.id AS company_id,
        u.id AS unit_id,
        SUM(il.amount)::bigint AS rkap,
        (
          SELECT SUM(jl.debit)::bigint
          FROM journal_lines jl
          JOIN import_batches b ON jl.batch_id = b.id
          LEFT JOIN coas c_asset ON jl.coa_id = c_asset.id
          WHERE jl.status = 'CONFIRMED'
            AND b.company_id = cmp.id
            AND EXTRACT(YEAR FROM jl.trx_date) = $1
            AND jl.unit_id = u.id
            AND (c_asset.code LIKE '1.2.1.1.%' OR COALESCE(c_asset.id, 0) = COALESCE(il.coa_id, -1))
        ) AS realisasi
      FROM investment_lines il
      JOIN budget_docs bd ON il.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN companies cmp ON u.company_id = cmp.id
      WHERE p.year = $1
        AND bd.type = 'INVESTASI'
        AND ($2::int[] IS NULL OR cmp.id = ANY($2::int[]))
        AND ($3::int[] IS NULL OR u.id = ANY($3::int[]))
        AND ($4::int IS NULL OR u.id = $4)
        AND ($5::varchar IS NULL OR $5 = 'ALL' OR $5 = 'INVESTASI')
      GROUP BY cmp.id, u.id, il.category_id, il.coa_id
    )
    SELECT
      company_id,
      unit_id,
      SUM(rkap)::bigint AS subtotal_rkap,
      CASE WHEN COUNT(realisasi) > 0 THEN SUM(realisasi)::bigint ELSE NULL END AS subtotal_realisasi
    FROM raw_lines
    GROUP BY GROUPING SETS (
      (),
      (company_id),
      (company_id, unit_id)
    );
  `;

  const params = [
    periodYear,
    companyIds && companyIds.length > 0 ? companyIds : null,
    accessibleUnitIds,
    targetUnitId ? parseInt(targetUnitId, 10) : null,
    type || 'ALL',
  ];

  const [linesRes, totalsRes] = await Promise.all([
    client.query(sql, params),
    client.query(totalsSql, params),
  ]);

  // Ekstrak hasil perhitungan SQL ke peta subtotal
  let grandTotalRkap = null;
  let grandTotalRealisasi = null;
  const companyTotalsMap = new Map();
  const unitTotalsMap = new Map();

  for (const row of totalsRes.rows) {
    const rkapVal = row.subtotal_rkap !== null ? Number(row.subtotal_rkap) : null;
    const realisasiVal = row.subtotal_realisasi !== null ? Number(row.subtotal_realisasi) : null;
    if (row.company_id === null && row.unit_id === null) {
      grandTotalRkap = rkapVal;
      grandTotalRealisasi = realisasiVal;
    } else if (row.company_id !== null && row.unit_id === null) {
      companyTotalsMap.set(row.company_id, {
        rkap: rkapVal,
        realisasi: realisasiVal,
      });
    } else if (row.company_id !== null && row.unit_id !== null) {
      unitTotalsMap.set(row.unit_id, {
        rkap: rkapVal,
        realisasi: realisasiVal,
      });
    }
  }

  // Strukturisasi respons hierarkis (Perusahaan -> Unit -> Lines)
  const companiesMap = new Map();

  for (const row of linesRes.rows) {
    if (!companiesMap.has(row.company_id)) {
      companiesMap.set(row.company_id, {
        company_id: row.company_id,
        company_code: row.company_code,
        company_name: row.company_name,
        units: [],
        subtotal: companyTotalsMap.get(row.company_id) || { rkap: null, realisasi: null },
      });
    }

    const comp = companiesMap.get(row.company_id);
    let unitObj = comp.units.find((u) => u.unit_id === row.unit_id);
    if (!unitObj) {
      unitObj = {
        unit_id: row.unit_id,
        code: row.unit_code,
        name: row.unit_name,
        lines: [],
        subtotal: unitTotalsMap.get(row.unit_id) || { rkap: null, realisasi: null },
      };
      comp.units.push(unitObj);
    }

    unitObj.lines.push({
      kind: row.kind,
      coa_code: row.coa_code,
      name: row.line_name,
      rkap: row.rkap !== null ? Number(row.rkap) : null,
      realisasi: row.realisasi !== null ? Number(row.realisasi) : null,
      usage_percent: row.usage_percent !== null ? Number(row.usage_percent) : null,
    });
  }

  return {
    period_year: periodYear,
    companies: Array.from(companiesMap.values()),
    grand_total: {
      rkap: grandTotalRkap,
      realisasi: grandTotalRealisasi,
    },
  };
};

/**
 * 4. Matriks Unit x COA (Format ERP)
 * Kolom: COA dikelompokkan per Jenis COA (coa_groups), dengan TOTAL tiap kelompok.
 * Baris: Perusahaan -> Instalasi/Org Group -> Unit dengan classification dan values { [coa_code]: amount }.
 * Termasuk subtotal per instalasi, subtotal per perusahaan, dan grand total.
 * Opsi hide_empty (default true): menyembunyikan kolom COA yang tidak memiliki nilai anggaran pada cakupan data.
 */
const getMatrixReport = async (
  periodYear,
  companyIds = null,
  groupIds = null,
  hideEmpty = true,
  accessibleUnitIds = null,
  client = db
) => {
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return {
      columns: [],
      companies: [],
      grand_total: { values: {}, group_totals: {}, total: 0 },
    };
  }

  // 1. Query Agregasi Nilai Sel Unit x COA dan Group Totals di SQL
  const matrixSql = `
    WITH cell_data AS (
      SELECT 
        cmp.id AS company_id,
        cmp.code AS company_code,
        cmp.name AS company_name,
        og.id AS group_id,
        COALESCE(og.name, 'Tanpa Instalasi') AS group_name,
        u.id AS unit_id,
        u.code AS unit_code,
        u.name AS unit_name,
        u.classification,
        cg.id AS coa_group_id,
        COALESCE(cg.name, 'Lain-lain') AS coa_group_name,
        c.id AS coa_id,
        c.code AS coa_code,
        c.name AS coa_name,
        SUM(el.amount)::bigint AS amount
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN companies cmp ON u.company_id = cmp.id
      LEFT JOIN org_groups og ON u.group_id = og.id
      JOIN items it ON el.item_id = it.id
      JOIN coas c ON it.coa_id = c.id
      LEFT JOIN coa_groups cg ON c.group_id = cg.id
      WHERE p.year = $1
        AND bd.type = 'BIAYA'
        AND ($2::int[] IS NULL OR cmp.id = ANY($2::int[]))
        AND ($3::int[] IS NULL OR og.id = ANY($3::int[]))
        AND ($4::int[] IS NULL OR u.id = ANY($4::int[]))
      GROUP BY 
        cmp.id, cmp.code, cmp.name,
        og.id, og.name,
        u.id, u.code, u.name, u.classification,
        cg.id, cg.name,
        c.id, c.code, c.name
    )
    SELECT * FROM cell_data
    ORDER BY company_id ASC, group_name ASC, unit_code ASC, coa_code ASC;
  `;

  // 2. Query Subtotals dan Grand Total murni di SQL menggunakan GROUPING SETS
  const subtotalSql = `
    WITH cell_data AS (
      SELECT 
        cmp.id AS company_id,
        og.id AS group_id,
        u.id AS unit_id,
        cg.name AS coa_group_name,
        c.code AS coa_code,
        SUM(el.amount)::bigint AS amount
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN companies cmp ON u.company_id = cmp.id
      LEFT JOIN org_groups og ON u.group_id = og.id
      JOIN items it ON el.item_id = it.id
      JOIN coas c ON it.coa_id = c.id
      LEFT JOIN coa_groups cg ON c.group_id = cg.id
      WHERE p.year = $1
        AND bd.type = 'BIAYA'
        AND ($2::int[] IS NULL OR cmp.id = ANY($2::int[]))
        AND ($3::int[] IS NULL OR og.id = ANY($3::int[]))
        AND ($4::int[] IS NULL OR u.id = ANY($4::int[]))
      GROUP BY 
        cmp.id, og.id, u.id, cg.name, c.code
    )
    SELECT 
      company_id,
      group_id,
      coa_group_name,
      coa_code,
      SUM(amount)::bigint AS amount
    FROM cell_data
    GROUP BY GROUPING SETS (
      -- Grand total per coa & group
      (coa_code),
      (coa_group_name),
      (),
      -- Company subtotal per coa & group
      (company_id, coa_code),
      (company_id, coa_group_name),
      (company_id),
      -- Instalasi subtotal per coa & group
      (company_id, group_id, coa_code),
      (company_id, group_id, coa_group_name),
      (company_id, group_id)
    );
  `;

  // 3. Query Daftar Kolom COA Aktif (dengan atau tanpa hideEmpty)
  const columnsSql = hideEmpty
    ? `
      SELECT DISTINCT
        cg.id AS group_id,
        COALESCE(cg.name, 'Lain-lain') AS group_name,
        c.id AS coa_id,
        c.code AS coa_code,
        c.name AS coa_name
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN items it ON el.item_id = it.id
      JOIN coas c ON it.coa_id = c.id
      LEFT JOIN coa_groups cg ON c.group_id = cg.id
      WHERE p.year = $1
        AND bd.type = 'BIAYA'
        AND ($2::int[] IS NULL OR u.company_id = ANY($2::int[]))
        AND ($3::int[] IS NULL OR u.group_id = ANY($3::int[]))
        AND ($4::int[] IS NULL OR u.id = ANY($4::int[]))
      ORDER BY group_id ASC NULLS LAST, c.code ASC;
    `
    : `
      SELECT 
        cg.id AS group_id,
        COALESCE(cg.name, 'Lain-lain') AS group_name,
        c.id AS coa_id,
        c.code AS coa_code,
        c.name AS coa_name
      FROM coas c
      LEFT JOIN coa_groups cg ON c.group_id = cg.id
      WHERE c.category = 'biaya' AND c.is_active = true
      ORDER BY cg.id ASC NULLS LAST, c.code ASC;
    `;

  const params = [
    periodYear,
    companyIds && companyIds.length > 0 ? companyIds : null,
    groupIds && groupIds.length > 0 ? groupIds : null,
    accessibleUnitIds,
  ];

  const [cellsRes, totalsRes, colsRes] = await Promise.all([
    client.query(matrixSql, params),
    client.query(subtotalSql, params),
    client.query(columnsSql, hideEmpty ? params : []),
  ]);

  // Susun Kolom Terkelompok (Columns Header)
  const groupsMap = new Map();
  for (const col of colsRes.rows) {
    const gKey = col.group_id || 'null';
    if (!groupsMap.has(gKey)) {
      groupsMap.set(gKey, {
        group_id: col.group_id,
        group: col.group_name,
        coas: [],
      });
    }
    groupsMap.get(gKey).coas.push({
      id: col.coa_id,
      code: col.coa_code,
      name: col.coa_name,
    });
  }
  const columns = Array.from(groupsMap.values());

  // Susun Peta Subtotal SQL
  const grandTotal = { values: {}, group_totals: {}, total: 0 };
  const compSubtotalsMap = new Map();
  const instSubtotalsMap = new Map();

  for (const r of totalsRes.rows) {
    const amountVal = r.amount !== null ? Number(r.amount) : 0;
    if (r.company_id === null && r.group_id === null) {
      if (r.coa_code) grandTotal.values[r.coa_code] = amountVal;
      else if (r.coa_group_name) grandTotal.group_totals[r.coa_group_name] = amountVal;
      else grandTotal.total = amountVal;
    } else if (r.company_id !== null && r.group_id === null) {
      if (!compSubtotalsMap.has(r.company_id)) {
        compSubtotalsMap.set(r.company_id, { values: {}, group_totals: {}, total: 0 });
      }
      const cs = compSubtotalsMap.get(r.company_id);
      if (r.coa_code) cs.values[r.coa_code] = amountVal;
      else if (r.coa_group_name) cs.group_totals[r.coa_group_name] = amountVal;
      else cs.total = amountVal;
    } else if (r.company_id !== null && r.group_id !== null) {
      const instKey = `${r.company_id}_${r.group_id}`;
      if (!instSubtotalsMap.has(instKey)) {
        instSubtotalsMap.set(instKey, { values: {}, group_totals: {}, total: 0 });
      }
      const is = instSubtotalsMap.get(instKey);
      if (r.coa_code) is.values[r.coa_code] = amountVal;
      else if (r.coa_group_name) is.group_totals[r.coa_group_name] = amountVal;
      else is.total = amountVal;
    }
  }

  // Susun Hierarki Matriks Baris (Perusahaan -> Instalasi -> Unit)
  const companiesMap = new Map();

  for (const row of cellsRes.rows) {
    if (!companiesMap.has(row.company_id)) {
      companiesMap.set(row.company_id, {
        code: row.company_code,
        name: row.company_name,
        instalasi: [],
        subtotal: compSubtotalsMap.get(row.company_id) || { values: {}, group_totals: {}, total: 0 },
      });
    }

    const comp = companiesMap.get(row.company_id);
    let instObj = comp.instalasi.find((i) => i.group_id === row.group_id);
    if (!instObj) {
      const instKey = `${row.company_id}_${row.group_id}`;
      instObj = {
        name: row.group_name,
        group_id: row.group_id,
        units: [],
        subtotal: instSubtotalsMap.get(instKey) || { values: {}, group_totals: {}, total: 0 },
      };
      comp.instalasi.push(instObj);
    }

    let unitObj = instObj.units.find((u) => u.unit_id === row.unit_id);
    if (!unitObj) {
      unitObj = {
        unit_id: row.unit_id,
        code: row.unit_code,
        name: row.unit_name,
        classification: row.classification || '—',
        values: {},
        group_totals: {},
        total: 0,
      };
      instObj.units.push(unitObj);
    }

    unitObj.values[row.coa_code] = Number(row.amount);
    unitObj.group_totals[row.coa_group_name] = (unitObj.group_totals[row.coa_group_name] || 0) + Number(row.amount);
    unitObj.total += Number(row.amount);
  }

  return {
    columns,
    companies: Array.from(companiesMap.values()),
    grand_total: grandTotal,
  };
};

module.exports = {
  getExpenseByCoa,
  getInvestmentSummary,
  getConsolidatedReport,
  getMatrixReport,
};
