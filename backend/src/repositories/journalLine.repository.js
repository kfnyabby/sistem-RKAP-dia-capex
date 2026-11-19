const db = require('../../db');

/**
 * Menyimpan sekumpulan baris jurnal dalam satu chunk query SQL berparameter.
 */
const bulkInsertChunk = async (lines, client = db) => {
  if (!lines || lines.length === 0) return 0;

  const valueRows = [];
  const params = [];
  let pIdx = 1;

  for (const line of lines) {
    const rowPlaceholders = [];
    // 14 kolom:
    // batch_id, sub_journal_id, journal_no, trx_date, unit_id, raw_unit,
    // coa_id, raw_coa_code, raw_coa_name, debit, credit, description, item_id, status
    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.batch_id);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.sub_journal_id);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.journal_no || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.trx_date);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.unit_id || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.raw_unit || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.coa_id || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.raw_coa_code || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.raw_coa_name || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.debit || 0);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.credit || 0);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.description || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.item_id || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(line.status || 'PREVIEW');

    valueRows.push(`(${rowPlaceholders.join(', ')})`);
  }

  const sql = `
    INSERT INTO journal_lines (
      batch_id,
      sub_journal_id,
      journal_no,
      trx_date,
      unit_id,
      raw_unit,
      coa_id,
      raw_coa_code,
      raw_coa_name,
      debit,
      credit,
      description,
      item_id,
      status,
      created_at,
      updated_at
    ) VALUES 
    ${valueRows.map((r) => `${r.slice(0, -1)}, NOW(), NOW())`).join(',\n')}
    RETURNING id;
  `;

  const res = await client.query(sql, params);
  return res.rowCount;
};

/**
 * Mencari ID SUB JURNAL yang sudah terdaftar di baris jurnal CONFIRMED (untuk mode append / BR-19).
 */
const findExistingSubJournalIds = async (subJournalIds, client = db) => {
  if (!subJournalIds || subJournalIds.length === 0) return new Set();

  const sql = `
    SELECT DISTINCT sub_journal_id
    FROM journal_lines
    WHERE sub_journal_id = ANY($1::varchar[])
      AND status = 'CONFIRMED';
  `;

  const res = await client.query(sql, [subJournalIds]);
  return new Set(res.rows.map((r) => r.sub_journal_id));
};

/**
 * Menghapus seluruh baris jurnal untuk suatu batch (misal saat rollback atau re-parse).
 */
const deleteByBatchId = async (batchId, client = db) => {
  const res = await client.query('DELETE FROM journal_lines WHERE batch_id = $1', [batchId]);
  return res.rowCount;
};

/**
 * Menghapus baris jurnal berstatus CONFIRMED milik perusahaan dan periode yang sama (untuk mode replace_month).
 */
const deleteExistingConfirmedLines = async (companyId, period, excludeBatchId = null, client = db) => {
  const sql = `
    DELETE FROM journal_lines
    WHERE batch_id IN (
      SELECT id 
      FROM import_batches 
      WHERE company_id = $1 
        AND period = $2 
        AND status = 'CONFIRMED'
        AND id != COALESCE($3, -1)
    );
  `;
  const res = await client.query(sql, [companyId, period, excludeBatchId]);
  return res.rowCount;
};

/**
 * Memperbarui status semua baris jurnal pada batch tertentu (misal PREVIEW -> CONFIRMED).
 */
const updateBatchLinesStatus = async (batchId, status, client = db) => {
  const sql = `
    UPDATE journal_lines
    SET status = $2, updated_at = NOW()
    WHERE batch_id = $1;
  `;
  const res = await client.query(sql, [batchId, status]);
  return res.rowCount;
};

/**
 * Memetakan ulang unit_id baris jurnal berstatus PREVIEW berdasarkan nama alias unit.
 */
const remapLinesByAlias = async (companyId, aliasName, targetUnitId, client = db) => {
  const sql = `
    UPDATE journal_lines jl
    SET unit_id = $1, updated_at = NOW()
    FROM import_batches b
    WHERE jl.batch_id = b.id
      AND b.company_id = $2
      AND b.status = 'PREVIEW'
      AND LOWER(TRIM(jl.raw_unit)) = LOWER(TRIM($3))
      AND jl.unit_id IS NULL;
  `;
  const res = await client.query(sql, [targetUnitId, companyId, aliasName]);
  return res.rowCount;
};

/**
 * Mengambil agregasi realisasi buku besar dengan otorisasi unit (fail-closed) dan aturan BR-05.
 */
const getRealizationsAggregation = async (
  filters = {},
  accessibleUnitIds = null,
  investmentAssetCoas = ['1.2.1.1.4', '1.2.1.1.6'],
  client = db
) => {
  // Otorisasi Fail-closed: Jika bukan Akuntansi dan tidak punya akses unit, kembalikan kosong
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return [];
  }

  const conditions = ["jl.status = 'CONFIRMED'"];
  const params = [];
  let pIdx = 1;

  // Filter unit akses
  if (accessibleUnitIds !== null) {
    conditions.push(`jl.unit_id = ANY($${pIdx}::int[])`);
    params.push(accessibleUnitIds);
    pIdx++;
  }

  // Filter company_id
  if (filters.company_id) {
    conditions.push(`b.company_id = $${pIdx}`);
    params.push(parseInt(filters.company_id, 10));
    pIdx++;
  }

  // Filter company_code
  if (filters.company_code) {
    conditions.push(`cmp.code = $${pIdx}`);
    params.push(filters.company_code.trim().toUpperCase());
    pIdx++;
  }

  // Filter unit_id spesifik
  if (filters.unit_id) {
    const targetUnitId = parseInt(filters.unit_id, 10);
    if (accessibleUnitIds !== null && !accessibleUnitIds.includes(targetUnitId)) {
      return [];
    }
    conditions.push(`jl.unit_id = $${pIdx}`);
    params.push(targetUnitId);
    pIdx++;
  }

  // Filter coa_id spesifik
  if (filters.coa_id) {
    conditions.push(`jl.coa_id = $${pIdx}`);
    params.push(parseInt(filters.coa_id, 10));
    pIdx++;
  }

  // Filter item_id spesifik
  if (filters.item_id) {
    conditions.push(`jl.item_id = $${pIdx}`);
    params.push(parseInt(filters.item_id, 10));
    pIdx++;
  }

  // Filter rentang bulan ('YYYY-MM')
  if (filters.start_month) {
    conditions.push(`TO_CHAR(jl.trx_date, 'YYYY-MM') >= $${pIdx}`);
    params.push(filters.start_month.trim());
    pIdx++;
  }
  if (filters.end_month) {
    conditions.push(`TO_CHAR(jl.trx_date, 'YYYY-MM') <= $${pIdx}`);
    params.push(filters.end_month.trim());
    pIdx++;
  }

  // Filter tahun ('YYYY')
  if (filters.year) {
    conditions.push(`EXTRACT(YEAR FROM jl.trx_date) = $${pIdx}`);
    params.push(parseInt(filters.year, 10));
    pIdx++;
  }

  // Parameter investmentAssetCoas untuk CASE BR-05
  const assetCoasParamIdx = pIdx;
  params.push(investmentAssetCoas);

  // BR-05: Realisasi Biaya = DEBET - KREDIT, Aset Tetap = DEBET
  const realizationCaseExpr = `
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM unnest($${assetCoasParamIdx}::text[]) AS asset_coa 
        WHERE COALESCE(c.code, jl.raw_coa_code) LIKE (asset_coa || '%')
      ) THEN jl.debit
      ELSE (jl.debit - jl.credit)
    END
  `;

  const whereClause = conditions.join(' AND ');
  const groupBy = (filters.group_by || 'coa').toLowerCase();

  let selectCols;
  let groupByCols;
  let orderByCols;

  if (groupBy === 'coa') {
    selectCols = `
      COALESCE(c.id, 0) AS coa_id,
      COALESCE(c.code, jl.raw_coa_code) AS coa_code,
      COALESCE(c.name, jl.raw_coa_name) AS coa_name,
      COALESCE(c.category, 'investasi') AS coa_category,
      SUM(jl.debit)::bigint AS total_debit,
      SUM(jl.credit)::bigint AS total_credit,
      SUM(${realizationCaseExpr})::bigint AS total_realization,
      COUNT(jl.id)::int AS line_count
    `;
    groupByCols = "COALESCE(c.id, 0), COALESCE(c.code, jl.raw_coa_code), COALESCE(c.name, jl.raw_coa_name), COALESCE(c.category, 'investasi')";
    orderByCols = 'coa_code ASC';
  } else if (groupBy === 'unit') {
    selectCols = `
      u.id AS unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      cmp.code AS company_code,
      SUM(jl.debit)::bigint AS total_debit,
      SUM(jl.credit)::bigint AS total_credit,
      SUM(${realizationCaseExpr})::bigint AS total_realization,
      COUNT(jl.id)::int AS line_count
    `;
    groupByCols = 'u.id, u.code, u.name, cmp.code';
    orderByCols = 'u.code ASC';
  } else if (groupBy === 'month') {
    selectCols = `
      TO_CHAR(jl.trx_date, 'YYYY-MM') AS month,
      SUM(jl.debit)::bigint AS total_debit,
      SUM(jl.credit)::bigint AS total_credit,
      SUM(${realizationCaseExpr})::bigint AS total_realization,
      COUNT(jl.id)::int AS line_count
    `;
    groupByCols = "TO_CHAR(jl.trx_date, 'YYYY-MM')";
    orderByCols = 'month ASC';
  } else if (groupBy === 'item') {
    selectCols = `
      it.id AS item_id,
      it.code AS item_code,
      it.name AS item_name,
      SUM(jl.debit)::bigint AS total_debit,
      SUM(jl.credit)::bigint AS total_credit,
      SUM(${realizationCaseExpr})::bigint AS total_realization,
      COUNT(jl.id)::int AS line_count
    `;
    groupByCols = 'it.id, it.code, it.name';
    orderByCols = 'it.name ASC';
  } else {
    // Detail breakdown COA + Unit + Bulan
    selectCols = `
      COALESCE(c.id, 0) AS coa_id,
      COALESCE(c.code, jl.raw_coa_code) AS coa_code,
      COALESCE(c.name, jl.raw_coa_name) AS coa_name,
      u.id AS unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      TO_CHAR(jl.trx_date, 'YYYY-MM') AS month,
      SUM(jl.debit)::bigint AS total_debit,
      SUM(jl.credit)::bigint AS total_credit,
      SUM(${realizationCaseExpr})::bigint AS total_realization,
      COUNT(jl.id)::int AS line_count
    `;
    groupByCols = "COALESCE(c.id, 0), COALESCE(c.code, jl.raw_coa_code), COALESCE(c.name, jl.raw_coa_name), u.id, u.code, u.name, TO_CHAR(jl.trx_date, 'YYYY-MM')";
    orderByCols = 'month ASC, coa_code ASC, u.code ASC';
  }

  const sql = `
    SELECT ${selectCols}
    FROM journal_lines jl
    JOIN import_batches b ON jl.batch_id = b.id
    JOIN companies cmp ON b.company_id = cmp.id
    LEFT JOIN coas c ON jl.coa_id = c.id
    LEFT JOIN units u ON jl.unit_id = u.id
    LEFT JOIN items it ON jl.item_id = it.id
    WHERE ${whereClause}
    GROUP BY ${groupByCols}
    ORDER BY ${orderByCols};
  `;

  const res = await client.query(sql, params);
  return res.rows;
};

module.exports = {
  bulkInsertChunk,
  findExistingSubJournalIds,
  deleteByBatchId,
  deleteExistingConfirmedLines,
  updateBatchLinesStatus,
  remapLinesByAlias,
  getRealizationsAggregation,
};
