const db = require('../../db');
const userRepository = require('./user.repository');

/**
 * Mencatat transisi riwayat status ke tabel doc_status_history
 */
const recordStatusHistory = async (historyData, client = null) => {
  const queryExecutor = client || db;
  const { doc_id, from_status, to_status, actor_id, note } = historyData;

  const query = `
    INSERT INTO doc_status_history (doc_id, from_status, to_status, actor_id, note, at, created_by)
    VALUES ($1, $2, $3, $4, $5, NOW(), $4)
    RETURNING *
  `;
  const res = await queryExecutor.query(query, [doc_id, from_status, to_status, actor_id, note]);
  return res.rows[0];
};

/**
 * Mengambil riwayat transisi status dokumen beserta nama aktor
 */
const getStatusHistory = async (docId) => {
  const query = `
    SELECT 
      h.id,
      h.doc_id,
      h.from_status,
      h.to_status,
      h.note,
      h.at,
      h.actor_id,
      u.name AS actor_name,
      u.role AS actor_role
    FROM doc_status_history h
    LEFT JOIN users u ON u.id = h.actor_id
    WHERE h.doc_id = $1
    ORDER BY h.at ASC, h.id ASC
  `;
  const res = await db.query(query, [docId]);
  return res.rows;
};

/**
 * Mengambil antrean dokumen untuk validasi (Review Queue)
 */
const getReviewQueue = async (filters = {}, user) => {
  let accessibleUnitIds = null;
  if (user && user.role !== 'akuntansi') {
    const units = await userRepository.getUserUnits(user.id);
    accessibleUnitIds = units.map((u) => u.unit_id);
    if (accessibleUnitIds.length === 0) {
      return { data: [], meta: { page: 1, per_page: 25, total: 0 } };
    }
  }

  const whereClauses = [];
  const params = [];
  let paramIdx = 1;

  if (accessibleUnitIds !== null) {
    whereClauses.push(`b.unit_id = ANY($${paramIdx}::int[])`);
    params.push(accessibleUnitIds);
    paramIdx++;
  }

  if (filters.period_id) {
    whereClauses.push(`b.period_id = $${paramIdx}`);
    params.push(parseInt(filters.period_id, 10));
    paramIdx++;
  }

  if (filters.unit_id) {
    whereClauses.push(`b.unit_id = $${paramIdx}`);
    params.push(parseInt(filters.unit_id, 10));
    paramIdx++;
  }

  if (filters.company_id) {
    whereClauses.push(`u.company_id = $${paramIdx}`);
    params.push(parseInt(filters.company_id, 10));
    paramIdx++;
  }

  if (filters.type) {
    whereClauses.push(`b.type = $${paramIdx}`);
    params.push(filters.type);
    paramIdx++;
  }

  // Filter status: default 'DIAJUKAN' jika tidak diberikan atau 'ALL' untuk semua status aktif
  if (filters.status && filters.status !== 'ALL') {
    whereClauses.push(`b.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  } else if (!filters.status) {
    whereClauses.push(`b.status = 'DIAJUKAN'`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRes = await db.query(
    `SELECT COUNT(*) FROM budget_docs b 
     JOIN units u ON u.id = b.unit_id 
     ${whereStr}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const page = Math.max(1, parseInt(filters.page || 1, 10));
  const perPage = Math.max(1, parseInt(filters.per_page || 25, 10));
  const offset = (page - 1) * perPage;

  const dataQuery = `
    SELECT 
      b.id AS doc_id,
      b.id,
      b.period_id,
      p.year AS period_year,
      p.status AS period_status,
      p.review_deadline,
      b.unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      u.company_id,
      c.code AS company_code,
      c.name AS company_name,
      b.type,
      b.status,
      b.total_amount,
      b.version,
      b.submitted_by,
      u_sub.name AS submitted_by_name,
      b.submitted_at,
      b.created_at,
      b.updated_at,
      (SELECT COUNT(*) FROM line_comments lc WHERE lc.doc_id = b.id) AS comment_count
    FROM budget_docs b
    JOIN units u ON u.id = b.unit_id
    JOIN companies c ON c.id = u.company_id
    JOIN periods p ON p.id = b.period_id
    LEFT JOIN users u_sub ON u_sub.id = b.submitted_by
    ${whereStr}
    ORDER BY b.submitted_at DESC NULLS LAST, b.updated_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(perPage, offset);

  const dataRes = await db.query(dataQuery, params);

  return {
    data: dataRes.rows,
    meta: {
      page,
      per_page: perPage,
      total,
    },
  };
};

/**
 * Menambahkan komentar per baris anggaran
 */
const addLineComment = async (commentData, client = null) => {
  const queryExecutor = client || db;
  const { doc_id, line_type, line_id, author_id, text } = commentData;

  const query = `
    INSERT INTO line_comments (doc_id, line_type, line_id, author_id, text, created_by)
    VALUES ($1, $2, $3, $4, $5, $4)
    RETURNING *
  `;
  const res = await queryExecutor.query(query, [doc_id, line_type, line_id, author_id, text]);
  return res.rows[0];
};

/**
 * Mengambil daftar komentar untuk baris anggaran tertentu
 */
const getLineComments = async (docId, lineType, lineId) => {
  const query = `
    SELECT 
      lc.id,
      lc.doc_id,
      lc.line_type,
      lc.line_id,
      lc.text,
      lc.created_at,
      lc.author_id,
      u.name AS author_name,
      u.role AS author_role
    FROM line_comments lc
    JOIN users u ON u.id = lc.author_id
    WHERE lc.doc_id = $1 AND lc.line_type = $2 AND lc.line_id = $3
    ORDER BY lc.created_at ASC
  `;
  const res = await db.query(query, [docId, lineType, lineId]);
  return res.rows;
};

/**
 * Mengambil komentar berdasarkan ID
 */
const findCommentById = async (commentId) => {
  const res = await db.query('SELECT * FROM line_comments WHERE id = $1', [commentId]);
  return res.rows[0] || null;
};

/**
 * Menghapus komentar baris
 */
const deleteLineComment = async (commentId, client = null) => {
  const queryExecutor = client || db;
  await queryExecutor.query('DELETE FROM line_comments WHERE id = $1', [commentId]);
};

module.exports = {
  recordStatusHistory,
  getStatusHistory,
  getReviewQueue,
  addLineComment,
  getLineComments,
  findCommentById,
  deleteLineComment,
};
