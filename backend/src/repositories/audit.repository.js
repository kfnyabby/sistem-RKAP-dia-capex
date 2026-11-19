const db = require('../../db');

/**
 * Repository Audit Logs (Fase 8)
 * Mendukung filter komprehensif, paginasi, dan isolasi data unit fail-closed
 */

const getAuditLogs = async (filters = {}, accessibleUnitIds = null, currentUserId = null, client = db) => {
  // Fail-closed untuk pengguna tanpa akses unit sama sekali
  if (accessibleUnitIds !== null && accessibleUnitIds.length === 0) {
    return {
      rows: [],
      total_count: 0,
      page: filters.page || 1,
      limit: filters.limit || 20,
      total_pages: 0,
    };
  }

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  // 1. Filter Action
  if (filters.action) {
    conditions.push(`LOWER(al.action) = LOWER($${paramIdx})`);
    params.push(filters.action);
    paramIdx += 1;
  }

  // 2. Filter Entity Type
  if (filters.entity) {
    conditions.push(`LOWER(al.entity) = LOWER($${paramIdx})`);
    params.push(filters.entity);
    paramIdx += 1;
  }

  // 3. Filter User / Actor ID
  if (filters.user_id || filters.actor_id) {
    const actorId = parseInt(filters.user_id || filters.actor_id, 10);
    if (!isNaN(actorId)) {
      conditions.push(`al.actor_id = $${paramIdx}`);
      params.push(actorId);
      paramIdx += 1;
    }
  }

  // 4. Filter Rentang Waktu (created_at atau at)
  if (filters.start_date) {
    conditions.push(`COALESCE(al.at, al.created_at) >= $${paramIdx}`);
    params.push(new Date(filters.start_date));
    paramIdx += 1;
  }
  if (filters.end_date) {
    conditions.push(`COALESCE(al.at, al.created_at) <= $${paramIdx}`);
    params.push(new Date(filters.end_date));
    paramIdx += 1;
  }

  // 5. Scoping Unit Akses Manager (B4 & B9)
  if (accessibleUnitIds !== null) {
    // Manager dibatasi hanya pada unit miliknya atau aksi yang dilakukannya sendiri
    const unitParam = paramIdx;
    params.push(accessibleUnitIds);
    paramIdx += 1;

    let userParamClause = '';
    if (currentUserId) {
      const uParam = paramIdx;
      params.push(currentUserId);
      paramIdx += 1;
      userParamClause = `al.actor_id = $${uParam} OR `;
    }

    conditions.push(`(
      ${userParamClause}
      (al.entity = 'units' AND al.entity_id = ANY($${unitParam}::int[])) OR
      ((al.new_value->>'unit_id')::int = ANY($${unitParam}::int[])) OR
      ((al.old_value->>'unit_id')::int = ANY($${unitParam}::int[])) OR
      (al.entity = 'budget_docs' AND EXISTS (
        SELECT 1 FROM budget_docs bd WHERE bd.id = al.entity_id AND bd.unit_id = ANY($${unitParam}::int[])
      )) OR
      (al.entity = 'expense_lines' AND EXISTS (
        SELECT 1 FROM expense_lines el JOIN budget_docs bd ON el.doc_id = bd.id
        WHERE el.id = al.entity_id AND bd.unit_id = ANY($${unitParam}::int[])
      )) OR
      (al.entity = 'investment_lines' AND EXISTS (
        SELECT 1 FROM investment_lines il JOIN budget_docs bd ON il.doc_id = bd.id
        WHERE il.id = al.entity_id AND bd.unit_id = ANY($${unitParam}::int[])
      )) OR
      (al.entity = 'new_item_requests' AND EXISTS (
        SELECT 1 FROM new_item_requests nir WHERE nir.id = al.entity_id AND nir.unit_id = ANY($${unitParam}::int[])
      ))
    )`);
  }

  // 6. Filter Spesifik Unit ID (bila diminta pada query)
  if (filters.unit_id) {
    const targetUnit = parseInt(filters.unit_id, 10);
    if (!isNaN(targetUnit)) {
      const uIdx = paramIdx;
      params.push(targetUnit);
      paramIdx += 1;

      conditions.push(`(
        (al.entity = 'units' AND al.entity_id = $${uIdx}) OR
        ((al.new_value->>'unit_id')::int = $${uIdx}) OR
        ((al.old_value->>'unit_id')::int = $${uIdx}) OR
        (al.entity = 'budget_docs' AND EXISTS (
          SELECT 1 FROM budget_docs bd WHERE bd.id = al.entity_id AND bd.unit_id = $${uIdx}
        )) OR
        (al.entity = 'expense_lines' AND EXISTS (
          SELECT 1 FROM expense_lines el JOIN budget_docs bd ON el.doc_id = bd.id
          WHERE el.id = al.entity_id AND bd.unit_id = $${uIdx}
        )) OR
        (al.entity = 'investment_lines' AND EXISTS (
          SELECT 1 FROM investment_lines il JOIN budget_docs bd ON il.doc_id = bd.id
          WHERE il.id = al.entity_id AND bd.unit_id = $${uIdx}
        )) OR
        (al.entity = 'new_item_requests' AND EXISTS (
          SELECT 1 FROM new_item_requests nir WHERE nir.id = al.entity_id AND nir.unit_id = $${uIdx}
        ))
      )`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Hitung Total Data untuk Metadata Paginasi
  const countSql = `SELECT COUNT(*)::int AS total FROM audit_logs al ${whereClause}`;
  const countRes = await client.query(countSql, params);
  const totalCount = countRes.rows[0]?.total || 0;

  // Paginasi
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const dataSql = `
    SELECT 
      al.id,
      al.actor_id,
      u.name AS actor_name,
      u.email AS actor_email,
      u.role AS actor_role,
      al.entity,
      al.entity_id,
      al.action,
      al.old_value,
      al.new_value,
      COALESCE(al.at, al.created_at) AS created_at
    FROM audit_logs al
    LEFT JOIN users u ON al.actor_id = u.id
    ${whereClause}
    ORDER BY al.id DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const dataParams = [...params, limit, offset];
  const dataRes = await client.query(dataSql, dataParams);

  return {
    rows: dataRes.rows,
    total_count: totalCount,
    page,
    limit,
    total_pages: Math.ceil(totalCount / limit) || 1,
  };
};

module.exports = {
  getAuditLogs,
};
