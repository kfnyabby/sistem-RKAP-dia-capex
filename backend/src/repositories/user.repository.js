const db = require('../../db');

const findByEmail = async (email) => {
  const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return result.rows[0] || null;
};

const findById = async (id) => {
  const result = await db.query(
    'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const getUserCompanies = async (userId) => {
  // Ambil perusahaan dari unit yang ditugaskan ke user
  const result = await db.query(
    `
    SELECT DISTINCT c.id AS company_id, c.code, c.name
    FROM user_unit_access uua
    JOIN units u ON u.id = uua.unit_id
    JOIN companies c ON c.id = u.company_id
    WHERE uua.user_id = $1
    ORDER BY c.id ASC
  `,
    [userId]
  );

  // Jika Akuntansi atau tidak ada penugasan spesifik, berikan semua perusahaan
  if (result.rows.length === 0) {
    const allCompanies = await db.query(
      'SELECT id AS company_id, code, name FROM companies ORDER BY id ASC'
    );
    return allCompanies.rows;
  }

  return result.rows;
};

const getUserUnits = async (userId) => {
  const result = await db.query(
    `
    SELECT u.id AS unit_id, u.code, u.name, u.company_id
    FROM user_unit_access uua
    JOIN units u ON u.id = uua.unit_id
    WHERE uua.user_id = $1
    ORDER BY u.id ASC
  `,
    [userId]
  );
  return result.rows;
};

const findAll = async ({ role, search, isActive, page = 1, perPage = 25 }) => {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (role) {
    conditions.push(`role = $${paramIdx++}`);
    params.push(role);
  }

  if (isActive !== undefined && isActive !== null) {
    conditions.push(`is_active = $${paramIdx++}`);
    params.push(isActive === '1' || isActive === 1 || isActive === true);
  }

  if (search) {
    conditions.push(`(name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countRes = await db.query(`SELECT COUNT(*) AS total FROM users ${whereClause}`, params);
  const total = parseInt(countRes.rows[0].total, 10);

  // Pagination
  const offset = (page - 1) * perPage;
  const listParams = [...params, perPage, offset];
  const query = `
    SELECT id, id AS user_id, name, email, role, is_active, created_at
    FROM users
    ${whereClause}
    ORDER BY id ASC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  const listRes = await db.query(query, listParams);

  return {
    data: listRes.rows,
    meta: {
      page: parseInt(page, 10),
      per_page: parseInt(perPage, 10),
      total,
    },
  };
};

const create = async ({ name, email, passwordHash, role = 'pic' }) => {
  const result = await db.query(
    `
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id AS user_id, name, email, role, is_active
  `,
    [name, email, passwordHash, role]
  );
  return result.rows[0];
};

const update = async (id, { name, email, role }) => {
  const result = await db.query(
    `
    UPDATE users
    SET name = COALESCE($2, name),
        email = COALESCE($3, email),
        role = COALESCE($4, role),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id AS user_id, name, email, role, is_active
  `,
    [id, name, email, role]
  );
  return result.rows[0];
};

const updateStatus = async (id, isActive) => {
  const result = await db.query(
    `
    UPDATE users
    SET is_active = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING id AS user_id, is_active
  `,
    [id, isActive]
  );
  return result.rows[0];
};

const updatePassword = async (id, passwordHash) => {
  await db.query(
    `
    UPDATE users
    SET password_hash = $2, updated_at = NOW()
    WHERE id = $1
  `,
    [id, passwordHash]
  );
};

const setUserUnits = async (userId, unitIds = []) => {
  await db.query('DELETE FROM user_unit_access WHERE user_id = $1', [userId]);
  if (Array.isArray(unitIds) && unitIds.length > 0) {
    for (const unitId of unitIds) {
      await db.query(
        `
        INSERT INTO user_unit_access (user_id, unit_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, unit_id) DO NOTHING
      `,
        [userId, unitId]
      );
    }
  }
};

module.exports = {
  findByEmail,
  findById,
  getUserCompanies,
  getUserUnits,
  findAll,
  create,
  update,
  updateStatus,
  updatePassword,
  setUserUnits,
};
