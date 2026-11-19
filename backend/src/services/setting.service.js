const db = require('../../db');
const settingRepository = require('../repositories/setting.repository');
const auditService = require('./audit.service');
const { updateSettingsSchema } = require('../validators/setting.validator');

/**
 * Service Pengaturan Sistem (Fase 8)
 */

const getSettings = async () => {
  const rows = await settingRepository.getAllSettings();
  const settingsMap = {};
  for (const r of rows) {
    settingsMap[r.key] = r.value;
  }
  return {
    settings: settingsMap,
    items: rows,
  };
};

const updateSettings = async (body, user) => {
  if (!user || user.role !== 'akuntansi') {
    const error = new Error('Akses ditolak: Hanya peran Akuntansi yang berwenang mengubah pengaturan sistem');
    error.status = 403;
    error.code = 'FORBIDDEN_ROLE';
    throw error;
  }

  // Dukung payload flat { investment_threshold: 5000000 } atau nested { settings: { ... } }
  const payload = body.settings && typeof body.settings === 'object' ? body.settings : body;

  const parseResult = updateSettingsSchema.safeParse(payload);
  if (!parseResult.success) {
    const issues = parseResult.error.issues || parseResult.error.errors || [];
    const error = new Error('Validasi pengaturan gagal: ' + issues.map((e) => e.message).join(', '));
    error.status = 422;
    error.code = 'VALIDATION_ERROR';
    error.errors = issues;
    throw error;
  }

  const validData = parseResult.data;
  const keysToUpdate = Object.keys(validData);

  if (keysToUpdate.length === 0) {
    const error = new Error('Tidak ada kunci pengaturan yang diberikan untuk diperbarui');
    error.status = 400;
    error.code = 'EMPTY_SETTINGS_PAYLOAD';
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const updated = {};
    for (const key of keysToUpdate) {
      const newValue = validData[key];
      const oldValue = await settingRepository.getSetting(key, null, client);

      const saved = await settingRepository.setSetting(key, newValue, null, user.id, client);
      updated[key] = saved.value;

      // Catat atomis jejak audit per perubahan setting
      await auditService.log(
        {
          actorId: user.id,
          entity: 'settings',
          entityId: null,
          action: 'UPDATE',
          oldValue: { [key]: oldValue },
          newValue: { [key]: newValue },
        },
        client
      );
    }

    await client.query('COMMIT');

    return {
      message: 'Pengaturan sistem berhasil diperbarui',
      updated,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
