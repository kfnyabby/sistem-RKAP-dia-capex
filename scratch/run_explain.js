const db = require('../backend/db');

async function runExplain() {
  console.log('=== 1. EXPLAIN (ANALYZE, BUFFERS) - Matriks Unit x COA ===');
  const matrixExplain = await db.query(`
    EXPLAIN (ANALYZE, BUFFERS)
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
    WHERE p.year = 2027
      AND bd.type = 'BIAYA'
    GROUP BY cmp.id, cmp.code, cmp.name, og.id, og.name, u.id, u.code, u.name, u.classification, cg.id, cg.name, c.id, c.code, c.name
    ORDER BY cmp.code ASC, og.name ASC, u.code ASC, c.code ASC;
  `);
  console.log(matrixExplain.rows.map(r => r['QUERY PLAN']).join('\n'));

  console.log('\n=== 2. EXPLAIN (ANALYZE, BUFFERS) - Rekap Konsolidasi Gabungan ===');
  const consolidatedExplain = await db.query(`
    EXPLAIN (ANALYZE, BUFFERS)
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
            AND EXTRACT(YEAR FROM jl.trx_date) = 2027
            AND jl.unit_id = u.id
            AND jl.coa_id = it.coa_id
        ) AS realisasi
      FROM expense_lines el
      JOIN budget_docs bd ON el.doc_id = bd.id
      JOIN periods p ON bd.period_id = p.id
      JOIN units u ON bd.unit_id = u.id
      JOIN companies cmp ON u.company_id = cmp.id
      JOIN items it ON el.item_id = it.id
      WHERE p.year = 2027
        AND bd.type = 'BIAYA'
      GROUP BY cmp.id, u.id, it.coa_id
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
  `);
  console.log(consolidatedExplain.rows.map(r => r['QUERY PLAN']).join('\n'));

  await db.pool.end();
}

runExplain().catch(console.error);
