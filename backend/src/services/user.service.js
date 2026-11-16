const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
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

  const newUser = await userRepository.create({
    name,
    email,
    passwordHash,
    role,
  });

  if (Array.isArray(unit_ids) && unit_ids.length > 0) {
    await userRepository.setUserUnits(newUser.user_id, unit_ids);
  }

  await auditService.log(actorId, 'users', newUser.user_id, 'create_user', null, {
    name,
    email,
    role,
    unit_ids,
  });

  return {
    user_id: newUser.user_id,
    message: 'User created',
  };
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

const updateUser = async (id, { name, email, role }, actorId) => {
  const existing = await userRepository.findById(id);
  if (!existing) {
    const error = new Error('Pengguna tidak ditemukan');
    error.status = 404;
    throw error;
  }

  if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
    const emailConflict = await userRepository.findByEmail(email);
    if (emailConflict) {
      const error = new Error('Email sudah digunakan oleh pengguna lain');
      error.status = 422;
      throw error;
    }
  }

  const updated = await userRepository.update(id, { name, email, role });
  await auditService.log(actorId, 'users', id, 'update_user', existing, updated);

  return {
    user_id: updated.user_id,
    message: 'User updated',
  };
};

const updateUserStatus = async (id, isActive, actorId) => {
  const existing = await userRepository.findById(id);
  if (!existing) {
    const error = new Error('Pengguna tidak ditemukan');
    error.status = 404;
    throw error;
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
};

