const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../../db');
const userRepository = require('../repositories/user.repository');
const sessionRepository = require('../repositories/session.repository');
const auditService = require('./audit.service');

const listUsers = async (params) => {
  return await userRepository.findAll(params);
};

const createUser = async ({ name, email, password, role, unit_ids = [] }, actorId) => {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    const error = new Error('Email sudah terdaftar');
    error.status = 422;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id AS user_id, name, email, role, is_active`,
      [name, email, passwordHash, role]
    );
    const newUser = result.rows[0];

    if (Array.isArray(unit_ids) && unit_ids.length > 0) {
      for (const unitId of unit_ids) {
        await client.query(
          `INSERT INTO user_unit_access (user_id, unit_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, unit_id) DO NOTHING`,
          [newUser.user_id, unitId]
        );
      }
    }

    await auditService.log(
      actorId,
      'users',
      newUser.user_id,
      'create_user',
      null,
      { name, email, role, unit_ids },
      client
    );

    await client.query('COMMIT');
    return {
      user_id: newUser.user_id,
      message: 'User created',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getUserDetail = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    const error = new Error('Pengguna tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const companies = await userRepository.getUserCompanies(user.id);
  const units = await userRepository.getUserUnits(user.id);

  return {
    user_id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    companies,
    units,
  };
};

const updateUser = async (id, { name, email, role, unit_ids }, actorId) => {
  const existing = await userRepository.findById(id);
  if (!existing) {
    const error = new Error('Pengguna tidak ditemukan');
    error.status = 404;
    throw error;
  }

  // Proteksi: Akuntansi tidak boleh mengubah role dirinya sendiri
  if (role && role !== existing.role) {
    if (parseInt(id, 10) === parseInt(actorId, 10)) {
      const error = new Error('Anda tidak dapat mengubah role akun Anda sendiri');
      error.status = 403;
      throw error;
    }

    // Proteksi: Tidak boleh mengubah role Akuntansi terakhir yang aktif
    if (existing.role === 'akuntansi' && existing.is_active) {
      const activeAkuntansi = await userRepository.countActiveUsersByRole('akuntansi');
      if (activeAkuntansi <= 1) {
        const error = new Error(
          'Tidak dapat mengubah role: minimal satu pengguna Akuntansi aktif harus tersedia'
        );
        error.status = 422;
        throw error;
      }
    }
  }

  if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
    const emailConflict = await userRepository.findByEmail(email);
    if (emailConflict && parseInt(emailConflict.id, 10) !== parseInt(id, 10)) {
      const error = new Error('Email sudah digunakan oleh pengguna lain');
      error.status = 422;
      throw error;
    }
  }

  if (unit_ids !== undefined && Array.isArray(unit_ids) && unit_ids.length > 0) {
    const validUnitsRes = await db.query(
      'SELECT id FROM units WHERE id = ANY($1::int[])',
      [unit_ids]
    );
    if (validUnitsRes.rows.length !== unit_ids.length) {
      const foundIds = validUnitsRes.rows.map((r) => r.id);
      const invalidIds = unit_ids.filter((uid) => !foundIds.includes(uid));
      const error = new Error(`ID Unit tidak valid: ${invalidIds.join(', ')}`);
      error.status = 422;
      throw error;
    }
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existingUnits = await userRepository.getUserUnits(id, client);
    const existingUnitIds = existingUnits.map((u) => u.unit_id);

    const updated = await userRepository.update(id, { name, email, role }, client);

    if (unit_ids !== undefined) {
      await userRepository.setUserUnits(id, unit_ids, client);
    }

    const auditOldValue = {
      name: existing.name,
      email: existing.email,
      role: existing.role,
      unit_ids: existingUnitIds,
    };
    const auditNewValue = {
      name: updated.name,
      email: updated.email,
      role: updated.role,
      unit_ids: unit_ids !== undefined ? unit_ids : existingUnitIds,
    };

    await auditService.log(actorId, 'users', id, 'update_user', auditOldValue, auditNewValue, client);

    await client.query('COMMIT');

    return {
      user_id: updated.user_id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      unit_ids: unit_ids !== undefined ? unit_ids : existingUnitIds,
      message: 'User updated',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const resetPassword = async (id, { new_password }, actorId) => {
  if (parseInt(id, 10) === parseInt(actorId, 10)) {
    const error = new Error(
      'Anda tidak dapat mereset kata sandi akun Anda sendiri melalui endpoint ini. Gunakan fitur ganti password mandiri.'
    );
    error.status = 403;
    throw error;
  }

  const existing = await userRepository.findById(id);
  if (!existing) {
    const error = new Error('Pengguna tidak ditemukan');
    error.status = 404;
    throw error;
  }

  let plainPassword = new_password && new_password.trim() ? new_password.trim() : null;
  const isGenerated = !plainPassword;

  if (isGenerated) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let randStr = '';
    const bytes = crypto.randomBytes(12);
    for (let i = 0; i < 12; i++) {
      randStr += chars[bytes[i] % chars.length];
    }
    plainPassword = randStr;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [
      id,
      passwordHash,
    ]);

    await sessionRepository.revokeOtherUserSessions(id, null, client);

    await auditService.log(
      actorId,
      'users',
      id,
      'reset_password',
      null,
      { method: isGenerated ? 'generated' : 'manual' },
      client
    );

    await client.query('COMMIT');

    return {
      message: 'Kata sandi berhasil direset',
      temporary_password: plainPassword,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateUserStatus = async (id, isActive, actorId) => {
  const existing = await userRepository.findById(id);
  if (!existing) {
    const error = new Error('Pengguna tidak ditemukan');
    error.status = 404;
    throw error;
  }

  // Proteksi saat menonaktifkan pengguna
  if (isActive === false) {
    // 1. Akuntansi tidak boleh menonaktifkan akun dirinya sendiri
    if (parseInt(id, 10) === parseInt(actorId, 10)) {
      const error = new Error('Anda tidak dapat menonaktifkan akun Anda sendiri');
      error.status = 403;
      throw error;
    }

    // 2. Tidak boleh menonaktifkan Akuntansi terakhir yang aktif
    if (existing.role === 'akuntansi') {
      const activeAkuntansi = await userRepository.countActiveUsersByRole('akuntansi');
      if (activeAkuntansi <= 1) {
        const error = new Error(
          'Tidak dapat menonaktifkan: minimal satu pengguna Akuntansi aktif harus tersedia'
        );
        error.status = 422;
        throw error;
      }
    }
  }

  const updated = await userRepository.updateStatus(id, isActive);
  await auditService.log(
    actorId,
    'users',
    id,
    isActive ? 'activate_user' : 'deactivate_user',
    { is_active: existing.is_active },
    { is_active: updated.is_active }
  );

  return {
    user_id: updated.user_id,
    is_active: updated.is_active,
  };
};

const updateUserUnits = async (id, unitIds, actorId) => {
  const existing = await userRepository.findById(id);
  if (!existing) {
    const error = new Error('Pengguna tidak ditemukan');
    error.status = 404;
    throw error;
  }

  await userRepository.setUserUnits(id, unitIds);
  await auditService.log(actorId, 'users', id, 'update_user_units', null, { unit_ids: unitIds });

  return {
    user_id: parseInt(id, 10),
    unit_ids: unitIds,
  };
};

module.exports = {
  listUsers,
  createUser,
  getUserDetail,
  updateUser,
  updateUserStatus,
  updateUserUnits,
  resetPassword,
};

