const db = require('../../db');

/**
 * Repository Agregasi Dashboard (Fase 7)
 * Seluruh kalkulasi total, subtotal, realisasi (BR-05), dan persentase dihitung murni di SQL.
 */

/**
 * 1. Summary RKAP, Realisasi & Persentase Pemakaian
 */
const getSummary = async (companyId, periodId, periodYear, accessibleUnitIds, assetCoas = ['1.2.1.1.4', '1.2.1.1.6'], client = db) => {
  // Fail-closed untuk non-akuntansi tanpa unit
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return {
      rkap_biaya: null,
      rkap_investasi: null,
      realisasi_biaya: null,
      usage_biaya_percent: null,
      realisasi_investasi: null,
      usage_investasi_percent: null,
    };
  }

  const sql = `
    WITH rkap_b AS (
      SELECT SUM(el.amount)::bigint AS rkap_biaya
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      WHERE bd.period_id = $1
        AND bd.type = 'BIAYA'
        AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
    ),
    rkap_i AS (
      SELECT SUM(il.amount)::bigint AS rkap_investasi
      FROM investment_lines il
      JOIN budget_docs bd ON il.doc_id = bd.id
      WHERE bd.period_id = $1
        AND bd.type = 'INVESTASI'
        AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
    ),
    real_b AS (
      SELECT SUM(jl.debit - jl.credit)::bigint AS realisasi_biaya
      FROM journal_lines jl
      JOIN import_batches b ON jl.batch_id = b.id
      LEFT JOIN coas c ON jl.coa_id = c.id
      WHERE jl.status = 'CONFIRMED'
        AND b.company_id = $3
        AND EXTRACT(YEAR FROM jl.trx_date) = $4
        AND (COALESCE(c.code, jl.raw_coa_code) LIKE '4.%' OR COALESCE(c.code, jl.raw_coa_code) LIKE '5.%')
        AND ($2::int[] IS NULL OR jl.unit_id = ANY($2::int[]))
    ),
    real_i AS (
      SELECT SUM(jl.debit)::bigint AS realisasi_investasi
      FROM journal_lines jl
      JOIN import_batches b ON jl.batch_id = b.id
      LEFT JOIN coas c ON jl.coa_id = c.id
      WHERE jl.status = 'CONFIRMED'
        AND b.company_id = $3
        AND EXTRACT(YEAR FROM jl.trx_date) = $4
        AND EXISTS (
          SELECT 1 FROM unnest($5::text[]) asset_coa
          WHERE COALESCE(c.code, jl.raw_coa_code) LIKE (asset_coa || '%')
        )
        AND ($2::int[] IS NULL OR jl.unit_id = ANY($2::int[]))
    )
    SELECT 
      rkap_b.rkap_biaya,
      rkap_i.rkap_investasi,
      real_b.realisasi_biaya,
      CASE 
        WHEN rkap_b.rkap_biaya IS NOT NULL AND rkap_b.rkap_biaya > 0 AND real_b.realisasi_biaya IS NOT NULL 
        THEN ROUND((real_b.realisasi_biaya::numeric / rkap_b.rkap_biaya) * 100)::int
        ELSE NULL 
      END AS usage_biaya_percent,
      real_i.realisasi_investasi,
      CASE 
        WHEN rkap_i.rkap_investasi IS NOT NULL AND rkap_i.rkap_investasi > 0 AND real_i.realisasi_investasi IS NOT NULL 
        THEN ROUND((real_i.realisasi_investasi::numeric / rkap_i.rkap_investasi) * 100)::int
        ELSE NULL 
      END AS usage_investasi_percent
    FROM rkap_b, rkap_i, real_b, real_i;
  `;

  const params = [periodId, accessibleUnitIds, companyId, periodYear, assetCoas];
  const res = await client.query(sql, params);
  return res.rows[0];
};

/**
 * 2. Progres Pengisian Unit & Unit Terlambat
 */
const getProgress = async (companyId, periodId, accessibleUnitIds, type = null, client = db) => {
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return {
      draft: 0,
      diajukan: 0,
      disetujui: 0,
      dikembalikan: 0,
      final: 0,
      not_started: 0,
      late_units: [],
    };
  }

  // Jika type ditentukan ('BIAYA' atau 'INVESTASI'), evaluasi status per dokumen jenis itu.
  // Jika type null, evaluasi unit: status terendah dari dokumen unit tersebut (atau 'not_started').
  const sql = `
    WITH unit_docs AS (
      SELECT 
        u.id AS unit_id,
        u.code AS unit_code,
        u.name AS unit_name,
        p.fill_deadline AS period_deadline,
        COALESCE(sa.deadline_override, p.fill_deadline) AS effective_deadline,
        bd.status AS doc_status
      FROM units u
      CROSS JOIN periods p
      LEFT JOIN budget_docs bd ON bd.unit_id = u.id 
                              AND bd.period_id = p.id 
                              AND ($4::varchar IS NULL OR bd.type = $4)
      LEFT JOIN submission_access sa ON sa.unit_id = u.id 
                                    AND sa.period_id = p.id 
                                    AND (sa.doc_type = 'SEMUA' OR ($4::varchar IS NOT NULL AND sa.doc_type = $4))
      WHERE p.id = $1
        AND u.company_id = $2
        AND u.is_active = true
        AND ($3::int[] IS NULL OR u.id = ANY($3::int[]))
    ),
    unit_status_ranked AS (
      SELECT 
        unit_id,
        unit_code,
        unit_name,
        effective_deadline,
        -- Status agregat: urutan terendah mendominasi (not_started < DIKEMBALIKAN < DRAFT < DIAJUKAN < DISETUJUI < FINAL)
        COALESCE(
          MIN(CASE 
            WHEN doc_status IS NULL THEN 'not_started'
            WHEN doc_status = 'DIKEMBALIKAN' THEN 'dikembalikan'
            WHEN doc_status = 'DRAFT' THEN 'draft'
            WHEN doc_status = 'DIAJUKAN' THEN 'diajukan'
            WHEN doc_status = 'DISETUJUI' THEN 'disetujui'
            WHEN doc_status = 'FINAL' THEN 'final'
            ELSE 'not_started'
          END), 
          'not_started'
        ) AS status
      FROM unit_docs
      GROUP BY unit_id, unit_code, unit_name, effective_deadline
    )
    SELECT
      COUNT(CASE WHEN status = 'draft' THEN 1 END)::int AS draft,
      COUNT(CASE WHEN status = 'diajukan' THEN 1 END)::int AS diajukan,
      COUNT(CASE WHEN status = 'disetujui' THEN 1 END)::int AS disetujui,
      COUNT(CASE WHEN status = 'dikembalikan' THEN 1 END)::int AS dikembalikan,
      COUNT(CASE WHEN status = 'final' THEN 1 END)::int AS final,
      COUNT(CASE WHEN status = 'not_started' THEN 1 END)::int AS not_started,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('unit_id', unit_id, 'code', unit_code, 'name', unit_name, 'effective_deadline', effective_deadline)
        ) FILTER (
          WHERE effective_deadline < CURRENT_DATE 
            AND status IN ('not_started', 'draft', 'dikembalikan')
        ),
        '[]'::json
      ) AS late_units
    FROM unit_status_ranked;
  `;

  const params = [periodId, companyId, accessibleUnitIds, type];
  const res = await client.query(sql, params);
  return res.rows[0];
};

/**
 * 3. Budget vs Realization per Unit, COA, atau Barang (mendukung Drill-down)
 */
const getBudgetVsRealization = async (
  companyId,
  periodId,
  periodYear,
  groupBy = 'coa',
  filters = {},
  accessibleUnitIds = null,
  assetCoas = ['1.2.1.1.4', '1.2.1.1.6'],
  warningPercent = 80,
  criticalPercent = 100,
  client = db
) => {
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return [];
  }

  const { unit_id, coa_id, item_id } = filters;

  if (groupBy === 'unit') {
    const sql = `
      WITH rkap_per_unit AS (
        SELECT 
          bd.unit_id,
          SUM(COALESCE(el.amount, 0) + COALESCE(il.amount, 0))::bigint AS rkap
        FROM budget_docs bd
        LEFT JOIN expense_lines el ON bd.id = el.doc_id AND bd.type = 'BIAYA'
        LEFT JOIN investment_lines il ON bd.id = il.doc_id AND bd.type = 'INVESTASI'
        WHERE bd.period_id = $1
          AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
          AND ($3::int IS NULL OR bd.unit_id = $3)
        GROUP BY bd.unit_id
      ),
      realisasi_per_unit AS (
        SELECT 
          jl.unit_id,
          SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM unnest($6::text[]) ac 
                WHERE COALESCE(c.code, jl.raw_coa_code) LIKE (ac || '%')
              ) THEN jl.debit
              ELSE (jl.debit - jl.credit)
            END
          )::bigint AS realisasi
        FROM journal_lines jl
        JOIN import_batches b ON jl.batch_id = b.id
        LEFT JOIN coas c ON jl.coa_id = c.id
        WHERE jl.status = 'CONFIRMED'
          AND b.company_id = $4
          AND EXTRACT(YEAR FROM jl.trx_date) = $5
          AND ($2::int[] IS NULL OR jl.unit_id = ANY($2::int[]))
          AND ($3::int IS NULL OR jl.unit_id = $3)
        GROUP BY jl.unit_id
      )
      SELECT 
        u.id AS unit_id,
        u.code AS unit_code,
        u.name AS unit_name,
        rk.rkap,
        rc.realisasi,
        CASE 
          WHEN rk.rkap IS NOT NULL AND rk.rkap > 0 AND rc.realisasi IS NOT NULL 
          THEN ROUND((rc.realisasi::numeric / rk.rkap) * 100)::int
          ELSE NULL 
        END AS usage_percent,
        CASE
          WHEN rk.rkap IS NOT NULL AND rk.rkap > 0 AND rc.realisasi IS NOT NULL THEN
            CASE 
              WHEN ROUND((rc.realisasi::numeric / rk.rkap) * 100) >= $8 THEN 'critical'
              WHEN ROUND((rc.realisasi::numeric / rk.rkap) * 100) >= $7 THEN 'warning'
              ELSE 'ok'
            END
          ELSE NULL
        END AS level
      FROM units u
      LEFT JOIN rkap_per_unit rk ON u.id = rk.unit_id
      LEFT JOIN realisasi_per_unit rc ON u.id = rc.unit_id
      WHERE u.company_id = $4
        AND u.is_active = true
        AND ($2::int[] IS NULL OR u.id = ANY($2::int[]))
        AND ($3::int IS NULL OR u.id = $3)
        AND (rk.rkap IS NOT NULL OR rc.realisasi IS NOT NULL)
      ORDER BY u.code ASC NULLS LAST;
    `;
    const params = [periodId, accessibleUnitIds, unit_id || null, companyId, periodYear, assetCoas, warningPercent, criticalPercent];
    const res = await client.query(sql, params);
    return res.rows;
  }

  if (groupBy === 'item' || groupBy === 'barang') {
    const sql = `
      WITH rkap_per_item AS (
        SELECT 
          el.item_id,
          it.code AS item_code,
          it.name AS item_name,
          it.uom,
          SUM(el.amount)::bigint AS rkap
        FROM expense_lines el
        JOIN budget_docs bd ON el.doc_id = bd.id
        JOIN items it ON el.item_id = it.id
        WHERE bd.period_id = $1
          AND bd.type = 'BIAYA'
          AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
          AND ($3::int IS NULL OR bd.unit_id = $3)
          AND ($4::int IS NULL OR it.coa_id = $4)
          AND ($5::int IS NULL OR it.id = $5)
        GROUP BY el.item_id, it.code, it.name, it.uom
      ),
      realisasi_per_item AS (
        SELECT 
          jl.item_id,
          SUM(jl.debit - jl.credit)::bigint AS realisasi
        FROM journal_lines jl
        JOIN import_batches b ON jl.batch_id = b.id
        WHERE jl.status = 'CONFIRMED'
          AND b.company_id = $6
          AND EXTRACT(YEAR FROM jl.trx_date) = $7
          AND jl.item_id IS NOT NULL
          AND ($2::int[] IS NULL OR jl.unit_id = ANY($2::int[]))
          AND ($3::int IS NULL OR jl.unit_id = $3)
          AND ($5::int IS NULL OR jl.item_id = $5)
        GROUP BY jl.item_id
      )
      SELECT 
        COALESCE(rk.item_id, rc.item_id) AS item_id,
        COALESCE(rk.item_code, it.code) AS item_code,
        COALESCE(rk.item_name, it.name) AS item_name,
        COALESCE(rk.uom, it.uom) AS uom,
        rk.rkap,
        rc.realisasi,
        CASE 
          WHEN rk.rkap IS NOT NULL AND rk.rkap > 0 AND rc.realisasi IS NOT NULL 
          THEN ROUND((rc.realisasi::numeric / rk.rkap) * 100)::int
          ELSE NULL 
        END AS usage_percent,
        CASE
          WHEN rk.rkap IS NOT NULL AND rk.rkap > 0 AND rc.realisasi IS NOT NULL THEN
            CASE 
              WHEN ROUND((rc.realisasi::numeric / rk.rkap) * 100) >= $10 THEN 'critical'
              WHEN ROUND((rc.realisasi::numeric / rk.rkap) * 100) >= $9 THEN 'warning'
              ELSE 'ok'
            END
          ELSE NULL
        END AS level
      FROM rkap_per_item rk
      FULL OUTER JOIN realisasi_per_item rc ON rk.item_id = rc.item_id
      LEFT JOIN items it ON rc.item_id = it.id
      ORDER BY item_name ASC NULLS LAST;
    `;
    const params = [periodId, accessibleUnitIds, unit_id || null, coa_id || null, item_id || null, companyId, periodYear, assetCoas, warningPercent, criticalPercent];
    const res = await client.query(sql, params);
    return res.rows;
  }

  // Default: groupBy === 'coa'
  const sql = `
    WITH rkap_per_coa AS (
      -- Biaya
      SELECT 
        c.id AS coa_id,
        c.code AS coa_code,
        c.name AS coa_name,
        SUM(el.amount)::bigint AS rkap
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      JOIN items it ON el.item_id = it.id
      JOIN coas c ON it.coa_id = c.id
      WHERE bd.period_id = $1
        AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
        AND ($3::int IS NULL OR bd.unit_id = $3)
        AND ($4::int IS NULL OR c.id = $4)
      GROUP BY c.id, c.code, c.name
      UNION ALL
      -- Investasi
      SELECT 
        c.id AS coa_id,
        c.code AS coa_code,
        c.name AS coa_name,
        SUM(il.amount)::bigint AS rkap
      FROM investment_lines il
      JOIN budget_docs bd ON il.doc_id = bd.id
      JOIN coas c ON il.coa_id = c.id
      WHERE bd.period_id = $1
        AND ($2::int[] IS NULL OR bd.unit_id = ANY($2::int[]))
        AND ($3::int IS NULL OR bd.unit_id = $3)
        AND ($4::int IS NULL OR c.id = $4)
      GROUP BY c.id, c.code, c.name
    ),
    rkap_combined AS (
      SELECT coa_id, coa_code, coa_name, SUM(rkap)::bigint AS rkap
      FROM rkap_per_coa
      GROUP BY coa_id, coa_code, coa_name
    ),
    realisasi_per_coa AS (
      SELECT 
        jl.coa_id,
        SUM(
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM unnest($7::text[]) ac 
              WHERE COALESCE(c.code, jl.raw_coa_code) LIKE (ac || '%')
            ) THEN jl.debit
            ELSE (jl.debit - jl.credit)
          END
        )::bigint AS realisasi
      FROM journal_lines jl
      JOIN import_batches b ON jl.batch_id = b.id
      LEFT JOIN coas c ON jl.coa_id = c.id
      WHERE jl.status = 'CONFIRMED'
        AND b.company_id = $5
        AND EXTRACT(YEAR FROM jl.trx_date) = $6
        AND ($2::int[] IS NULL OR jl.unit_id = ANY($2::int[]))
        AND ($3::int IS NULL OR jl.unit_id = $3)
        AND ($4::int IS NULL OR jl.coa_id = $4)
      GROUP BY jl.coa_id
    )
    SELECT 
      COALESCE(rk.coa_id, rc.coa_id) AS coa_id,
      COALESCE(rk.coa_code, c.code) AS coa_code,
      COALESCE(rk.coa_name, c.name) AS coa_name,
      rk.rkap,
      rc.realisasi,
      CASE 
        WHEN rk.rkap IS NOT NULL AND rk.rkap > 0 AND rc.realisasi IS NOT NULL 
        THEN ROUND((rc.realisasi::numeric / rk.rkap) * 100)::int
        ELSE NULL 
      END AS usage_percent,
      CASE
        WHEN rk.rkap IS NOT NULL AND rk.rkap > 0 AND rc.realisasi IS NOT NULL THEN
          CASE 
            WHEN ROUND((rc.realisasi::numeric / rk.rkap) * 100) >= $9 THEN 'critical'
            WHEN ROUND((rc.realisasi::numeric / rk.rkap) * 100) >= $8 THEN 'warning'
            ELSE 'ok'
          END
        ELSE NULL
      END AS level
    FROM rkap_combined rk
    FULL OUTER JOIN realisasi_per_coa rc ON rk.coa_id = rc.coa_id
    LEFT JOIN coas c ON rc.coa_id = c.id
    ORDER BY coa_code ASC NULLS LAST;
  `;

  const params = [periodId, accessibleUnitIds, unit_id || null, coa_id || null, companyId, periodYear, assetCoas, warningPercent, criticalPercent];
  const res = await client.query(sql, params);
  return res.rows;
};

module.exports = {
  getSummary,
  getProgress,
  getBudgetVsRealization,
};
