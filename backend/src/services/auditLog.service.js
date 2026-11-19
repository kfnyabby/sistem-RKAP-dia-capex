const auditRepository = require('../repositories/audit.repository');
const userRepository = require('../repositories/user.repository');

/**
 * Service Audit Logs (Fase 8)
 */

const getAuditLogs = async (query = {}, user) => {
  if (!user) {
    const error = new Error('Autentikasi diperlukan');
    error.status = 401;
    throw error;
  }

  // PIC ditolak 403
  if (user.role === 'pic') {
    const error = new Error('Akses ditolak: Role PIC tidak memiliki wewenang melihat jejak audit sistem');
    error.status = 403;
    error.code = 'FORBIDDEN_ROLE';
    throw error;
  }

  let accessibleUnitIds = null;

  // Jika Manager, batasi sebatas cakupan unit miliknya
  if (user.role === 'manager') {
    const userUnits = await userRepository.getUserUnits(user.id);
    accessibleUnitIds = userUnits.map((u) => u.unit_id);

    // Bila Manager secara eksplisit memfilter unit_id tertentu:
    if (query.unit_id) {
      const requestedUnit = parseInt(query.unit_id, 10);
      if (!accessibleUnitIds.includes(requestedUnit)) {
        const error = new Error('Akses ditolak: Anda tidak memiliki wewenang melihat jejak audit unit ini');
        error.status = 403;
        error.code = 'UNIT_ACCESS_DENIED';
        throw error;
      }
    }
  }

  const result = await auditRepository.getAuditLogs(query, accessibleUnitIds, user.id);
  return result;
};

module.exports = {
  getAuditLogs,
};
