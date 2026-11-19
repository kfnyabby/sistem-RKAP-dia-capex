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

const log = async (...args) => {
  let actorId;
  let entity;
  let entityId;
  let action;
  let oldValue;
  let newValue;
  let client;

  if (args.length >= 1 && typeof args[0] === 'object' && args[0] !== null && args[0].entity) {
    const opts = args[0];
    actorId = opts.actorId !== undefined ? opts.actorId : opts.userId !== undefined ? opts.userId : null;
    entity = opts.entity;
    entityId = opts.entityId || null;
    action = opts.action;
    oldValue = opts.oldValue !== undefined ? opts.oldValue : opts.oldData || null;
    newValue = opts.newValue !== undefined ? opts.newValue : opts.newData || null;
    client = args[1] || opts.client || db;
  } else {
    [actorId, entity, entityId, action, oldValue = null, newValue = null, client = db] = args;
  }

  try {
    const executor = client || db;
    await executor.query(
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
    if (client && client !== db) {
      throw err;
    }
  }
};

module.exports = {
  log,
  sanitize,
};

