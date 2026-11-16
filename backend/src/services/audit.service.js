const db = require('../../db');

const sanitize = (data) => {
  if (!data || typeof data !== 'object') return data;
  const copy = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = [
    'password',
    'password_hash',
    'current_password',
    'new_password',
    'new_password_confirmation',
    'csrf_token',
    'token',
  ];

  for (const key of Object.keys(copy)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      delete copy[key]; // Hapus sepenuhnya agar tidak tersimpan di log
    } else if (typeof copy[key] === 'object' && copy[key] !== null) {
      copy[key] = sanitize(copy[key]);
    }
  }
  return copy;
};

const log = async (actorId, entity, entityId, action, oldValue = null, newValue = null) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_id, entity, entity_id, action, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        actorId || null,
        entity,
        entityId || null,
        action,
        oldValue ? JSON.stringify(sanitize(oldValue)) : null,
        newValue ? JSON.stringify(sanitize(newValue)) : null,
      ]
    );
  } catch (err) {
    console.error('AuditService error:', err.message);
  }
};

module.exports = {
  log,
  sanitize,
};

