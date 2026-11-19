const db = require('../../db');

const bulkInsertErrors = async (errors, client = db) => {
  if (!errors || errors.length === 0) return 0;

  const valueRows = [];
  const params = [];
  let pIdx = 1;

  for (const err of errors) {
    const rowPlaceholders = [];
    // batch_id, sub_journal_id, row_number, error_type, raw_data, reason
    rowPlaceholders.push(`$${pIdx++}`);
    params.push(err.batch_id);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(err.sub_journal_id || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(err.row_number || null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(err.error_type);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(err.raw_data ? JSON.stringify(err.raw_data) : null);

    rowPlaceholders.push(`$${pIdx++}`);
    params.push(err.reason || null);

    valueRows.push(`(${rowPlaceholders.join(', ')})`);
  }

  const sql = `
    INSERT INTO realization_errors (
      batch_id,
      sub_journal_id,
      row_number,
      error_type,
      raw_data,
      reason,
      created_at
    ) VALUES 
    ${valueRows.map((r) => `${r.slice(0, -1)}, NOW())`).join(',\n')}
    RETURNING id;
  `;

  const res = await client.query(sql, params);
  return res.rowCount;
};

const findByBatchId = async (batchId, params = {}, client = db) => {
  const { error_type, page = 1, per_page = 50 } = params;

  const conditions = ['batch_id = $1'];
  const queryParams = [batchId];
  let pIdx = 2;

  if (error_type) {
    conditions.push(`error_type = $${pIdx}`);
    queryParams.push(error_type);
    pIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countSql = `SELECT COUNT(*) AS total FROM realization_errors WHERE ${whereClause};`;
  const countRes = await client.query(countSql, queryParams);
  const total = parseInt(countRes.rows[0].total, 10);

  const limit = Math.max(1, parseInt(per_page, 10) || 50);
  const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * limit;

  const dataSql = `
    SELECT *
    FROM realization_errors
    WHERE ${whereClause}
    ORDER BY row_number ASC, id ASC
    LIMIT $${pIdx} OFFSET $${pIdx + 1};
  `;

  queryParams.push(limit, offset);
  const dataRes = await client.query(dataSql, queryParams);

  return {
    data: dataRes.rows,
    meta: {
      page: Math.max(1, parseInt(page, 10) || 1),
      per_page: limit,
      total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
};

const deleteByBatchId = async (batchId, client = db) => {
  const res = await client.query('DELETE FROM realization_errors WHERE batch_id = $1', [batchId]);
  return res.rowCount;
};

module.exports = {
  bulkInsertErrors,
  findByBatchId,
  deleteByBatchId,
};
