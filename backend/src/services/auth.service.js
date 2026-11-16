const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const auditService = require('./audit.service');

const login = async (email, password) => {
  const user = await userRepository.findByEmail(email);

  // Email tidak dikenal -> pesan generik demi keamanan
  if (!user) {
    const error = new Error('Email atau password salah');
    error.status = 401;
    throw error;
  }

  // Cek kata sandi
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Email atau password salah');
    error.status = 401;
    throw error;
  }

  // Cek status aktif
  if (!user.is_active) {
    const error = new Error('Akun dinonaktifkan');
    error.status = 403;
    throw error;
  }

  const companies = await userRepository.getUserCompanies(user.id);
  const units = await userRepository.getUserUnits(user.id);

  // Catat audit login (tanpa data sensitif)
  await auditService.log(user.id, 'users', user.id, 'login', null, { email: user.email });

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

const getProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    const error = new Error('User not found');
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

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await userRepository.findByEmail((await userRepository.findById(userId)).email);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    const error = new Error('Current password is incorrect');
    error.status = 422;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await userRepository.updatePassword(userId, passwordHash);

  // Catat audit (tanpa mencatat password)
  await auditService.log(userId, 'users', userId, 'update_password');

  return { message: 'Password updated successfully' };
};

module.exports = {
  login,
  getProfile,
  changePassword,
};

