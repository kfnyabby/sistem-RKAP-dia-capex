const submissionAccessRepository = require('../repositories/submissionAccess.repository');
const notificationRepository = require('../repositories/notification.repository');
const AuditService = require('./audit.service');
const db = require('../../db');

/**
 * Helper untuk normalisasi tanggal ke akhir hari lokal (23:59:59.999)
 */
function isDatePassed(dateStrOrObj) {
  if (!dateStrOrObj) return false;
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return false;
  // Set ke akhir hari (23:59:59.999)
  d.setHours(23, 59, 59, 999);
  return new Date() > d;
}

/**
 * Format tanggal YYYY-MM-DD
 */
function formatDate(dateStrOrObj) {
  if (!dateStrOrObj) return null;
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/**
 * Menghitung akses efektif dokumen anggaran (BR-10, BR-12, BR-14)
 */
const getEffectiveAccess = async (periodId, unitId, docType = 'SEMUA', client = null) => {
  const period = await submissionAccessRepository.findPeriodById(periodId, client);
  if (!period) {
    return {
      is_open: false,
      effective_state: 'TUTUP',
      effective_deadline: null,
      source: 'PERIOD',
      reason: 'Periode anggaran tidak ditemukan',
      contact_accounting: 'Bagian Akuntansi Kantor Pusat',
    };
  }

  // Ambil kontak bantuan akuntansi dari settings
  let contactAccounting = 'Bagian Akuntansi Kantor Pusat (ext. 102)';
  try {
    const queryExecutor = client || db;
    const sRes = await queryExecutor.query("SELECT value FROM settings WHERE key = 'accounting_contact'");
    if (sRes.rows[0]?.value) {
      contactAccounting = typeof sRes.rows[0].value === 'string' ? sRes.rows[0].value : JSON.stringify(sRes.rows[0].value);
    }
  } catch {
    // Gunakan default
  }

  const override = await submissionAccessRepository.findByUnitAndPeriod(periodId, unitId, docType, client);

  // 1. Jika ada override di submission_access
  if (override) {
    if (override.state === 'TUTUP') {
      return {
        is_open: false,
        effective_state: 'TUTUP',
        effective_deadline: formatDate(override.deadline_override || period.fill_deadline),
        source: override.source || 'MANUAL',
        reason: override.reason || 'Pengajuan untuk unit ini ditutup secara khusus oleh Akuntansi',
        contact_accounting: contactAccounting,
        period_status: period.status,
      };
    }

    // Override berstatus BUKA
    if (override.deadline_override) {
      const passed = isDatePassed(override.deadline_override);
      return {
        is_open: !passed,
        effective_state: !passed ? 'BUKA' : 'TUTUP',
        effective_deadline: formatDate(override.deadline_override),
        source: override.source || 'MANUAL',
        reason: passed ? 'Melewati batas waktu perpanjangan unit' : override.reason,
        contact_accounting: contactAccounting,
        period_status: period.status,
      };
    }

    // Jika source AUTO_RETURN, batas pengisian diperpanjang hingga review_deadline (BR-14)
    if (override.source === 'AUTO_RETURN') {
      const deadline = period.review_deadline || period.fill_deadline;
      const passed = isDatePassed(deadline);
      return {
        is_open: !passed,
        effective_state: !passed ? 'BUKA' : 'TUTUP',
        effective_deadline: formatDate(deadline),
        source: 'AUTO_RETURN',
        reason: passed ? 'Melewati batas waktu penelaahan untuk perbaikan dokumen' : override.reason,
        contact_accounting: contactAccounting,
        period_status: period.status,
      };
    }

    // Override BUKA tanpa deadline_override mengikuti fill_deadline
    const passed = isDatePassed(period.fill_deadline);
    return {
      is_open: !passed,
      effective_state: !passed ? 'BUKA' : 'TUTUP',
      effective_deadline: formatDate(period.fill_deadline),
      source: override.source || 'MANUAL',
      reason: passed ? 'Melewati batas waktu pengisian periode' : override.reason,
      contact_accounting: contactAccounting,
      period_status: period.status,
    };
  }

  // 2. Jika tidak ada override, gunakan aturan periode
  if (period.submission_state === 'TUTUP') {
    return {
      is_open: false,
      effective_state: 'TUTUP',
      effective_deadline: formatDate(period.fill_deadline),
      source: 'PERIOD',
      reason: 'Pengajuan periode RKAP ini telah ditutup oleh Akuntansi',
      contact_accounting: contactAccounting,
      period_status: period.status,
    };
  }

  const passed = isDatePassed(period.fill_deadline);
  return {
    is_open: !passed,
    effective_state: !passed ? 'BUKA' : 'TUTUP',
    effective_deadline: formatDate(period.fill_deadline),
    source: 'PERIOD',
    reason: passed ? 'Melewati batas waktu pengisian periode' : null,
    contact_accounting: contactAccounting,
    period_status: period.status,
  };
};

/**
 * Assertion bahwa pengajuan dokumen terbuka. Melempar 403 SUBMISSION_CLOSED jika tertutup.
 */
const assertSubmissionOpen = async (doc, client = null) => {
  const periodId = doc.period_id;
  const unitId = doc.unit_id;
  const docType = doc.type || 'SEMUA';

  const access = await getEffectiveAccess(periodId, unitId, docType, client);

  if (!access.is_open) {
    const error = new Error(
      `Pengajuan anggaran untuk unit dan periode ini sedang ditutup atau telah melewati deadline. Hubungi ${access.contact_accounting || 'bagian Akuntansi'}.`
    );
    error.status = 403;
    error.code = 'SUBMISSION_CLOSED';
    error.effective_deadline = access.effective_deadline;
    error.reason = access.reason;
    throw error;
  }

  return access;
};

/**
 * Akuntansi mengubah deadline periode (FR-P4, BR-12)
 */
const setPeriodDeadlines = async (periodId, deadlines, user) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const oldPeriod = await submissionAccessRepository.findPeriodById(periodId, client);
    if (!oldPeriod) {
      const err = new Error('Periode tidak ditemukan');
      err.status = 404;
      throw err;
    }

    const updated = await submissionAccessRepository.updatePeriodDeadlines(periodId, deadlines, client);

    await AuditService.log(
      {
        userId: user.id,
        action: 'UPDATE',
        entity: 'periods',
        entityId: periodId,
        oldData: oldPeriod,
        newData: updated,
      },
      client
    );

    // Kirim notifikasi perubahan deadline ke seluruh PIC & Manager pada periode tersebut
    const targetUserIds = await notificationRepository.findTargetUserIds({ roles: ['pic', 'manager'] });
    const notifs = targetUserIds.map((uid) => ({
      user_id: uid,
      title: `Pembaruan Tenggat Periode RKAP ${oldPeriod.year}`,
      body: `Batas pengisian diubah menjadi ${formatDate(updated.fill_deadline)} dan validasi menjadi ${formatDate(updated.review_deadline)}.`,
      link: '/entry',
    }));
    await notificationRepository.createBulkNotifications(notifs, client);

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Akuntansi membuka atau menutup pengajuan periode (FR-P6, FR-P7)
 */
const togglePeriodSubmission = async (periodId, { state, reason }, user) => {
  if (state === 'BUKA' && (!reason || reason.trim() === '')) {
    const err = new Error('Alasan wajib diisi saat membuka kembali pengajuan');
    err.status = 422;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const oldPeriod = await submissionAccessRepository.findPeriodById(periodId, client);
    if (!oldPeriod) {
      const err = new Error('Periode tidak ditemukan');
      err.status = 404;
      throw err;
    }

    const updated = await submissionAccessRepository.updatePeriodSubmission(periodId, state, client);

    await AuditService.log(
      {
        userId: user.id,
        action: 'TOGGLE_SUBMISSION',
        entity: 'periods',
        entityId: periodId,
        oldData: { submission_state: oldPeriod.submission_state },
        newData: { submission_state: state, reason },
      },
      client
    );

    // Kirim notifikasi
    const targetUserIds = await notificationRepository.findTargetUserIds({ roles: ['pic', 'manager'] });
    const notifs = targetUserIds.map((uid) => ({
      user_id: uid,
      title: `Pengajuan Periode RKAP ${oldPeriod.year} ${state === 'BUKA' ? 'Dibuka Kembali' : 'Ditutup'}`,
      body: state === 'BUKA' ? `Pengajuan dibuka kembali. Alasan: ${reason}` : 'Pengajuan anggaran untuk periode ini telah ditutup oleh Akuntansi.',
      link: '/entry',
    }));
    await notificationRepository.createBulkNotifications(notifs, client);

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Override akses per unit atau per jenis anggaran (FR-P5, FR-P7, BR-12)
 */
const overrideUnitAccess = async (accessData, user) => {
  const { period_id, unit_id, doc_type = 'SEMUA', state = 'BUKA', deadline_override, reason } = accessData;

  if (state === 'BUKA' && (!reason || reason.trim() === '')) {
    const err = new Error('Alasan wajib diisi saat membuka kembali akses unit');
    err.status = 422;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const oldAccess = await submissionAccessRepository.findByUnitAndPeriod(period_id, unit_id, doc_type, client);

    const saved = await submissionAccessRepository.upsert(
      {
        period_id,
        unit_id,
        doc_type,
        state,
        deadline_override: deadline_override || null,
        source: 'MANUAL',
        reason,
        changed_by: user.id,
      },
      client
    );

    await AuditService.log(
      {
        userId: user.id,
        action: 'OVERRIDE_UNIT_ACCESS',
        entity: 'submission_access',
        entityId: saved.id,
        oldData: oldAccess,
        newData: saved,
      },
      client
    );

    // Kirim notifikasi ke pengguna unit tersebut
    const targetUserIds = await notificationRepository.findTargetUserIds({ unitId: unit_id, roles: ['pic', 'manager'] });
    const notifs = targetUserIds.map((uid) => ({
      user_id: uid,
      title: `Status Akses Pengajuan Unit ${state === 'BUKA' ? 'Dibuka' : 'Ditutup'}`,
      body: state === 'BUKA' 
        ? `Akses pengajuan unit Anda dibuka kembali${deadline_override ? ` sampai ${deadline_override}` : ''}. Alasan: ${reason}`
        : 'Akses pengajuan unit Anda ditutup oleh Akuntansi.',
      link: '/entry',
    }));
    await notificationRepository.createBulkNotifications(notifs, client);

    await client.query('COMMIT');
    return saved;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Ambil daftar papan status unit per periode (FR-P9)
 */
const getPeriodUnitAccess = async (periodId) => {
  const rawList = await submissionAccessRepository.getUnitAccessListByPeriod(periodId);

  return rawList.map((row) => {
    let effectiveState = row.period_submission_state;
    let effectiveDeadline = row.period_fill_deadline;
    let source = 'PERIOD';
    let reason = null;

    if (row.override_state) {
      effectiveState = row.override_state;
      source = row.override_source || 'MANUAL';
      reason = row.override_reason;
      if (row.deadline_override) {
        effectiveDeadline = row.deadline_override;
      }
    }

    const passed = isDatePassed(effectiveDeadline);
    const isOpen = effectiveState === 'BUKA' && !passed;

    return {
      unit_id: row.unit_id,
      unit_code: row.unit_code,
      unit_name: row.unit_name,
      company_id: row.company_id,
      company_code: row.company_code,
      company_name: row.company_name,
      period_id: row.period_id,
      period_year: row.period_year,
      is_open: isOpen,
      effective_state: effectiveState,
      effective_deadline: formatDate(effectiveDeadline),
      source,
      reason,
      changed_at: row.changed_at,
      changed_by_name: row.changed_by_name,
    };
  });
};

module.exports = {
  getEffectiveAccess,
  assertSubmissionOpen,
  setPeriodDeadlines,
  togglePeriodSubmission,
  overrideUnitAccess,
  getPeriodUnitAccess,
};
