const budgetDocRepository = require('../repositories/budgetDoc.repository');
const workflowRepository = require('../repositories/workflow.repository');
const submissionAccessRepository = require('../repositories/submissionAccess.repository');
const notificationRepository = require('../repositories/notification.repository');
const submissionAccessService = require('./submissionAccess.service');
const AuditService = require('./audit.service');
const db = require('../../db');

function isDatePassed(dateStrOrObj) {
  if (!dateStrOrObj) return false;
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return new Date() > d;
}

/**
 * 1. Submit Dokumen Anggaran (DRAFT / DIKEMBALIKAN -> DIAJUKAN)
 */
const submitDoc = async (docId, user) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const doc = await budgetDocRepository.findRawById(docId, client);
    if (!doc) {
      const err = new Error('Dokumen anggaran tidak ditemukan');
      err.status = 404;
      throw err;
    }

    // Validasi otorisasi unit
    if (user.role !== 'akuntansi') {
      const accessibleUnits = await budgetDocRepository.getAccessibleUnitIds(user);
      if (!accessibleUnits.includes(doc.unit_id)) {
        const err = new Error('Anda tidak memiliki akses ke unit kerja dokumen ini');
        err.status = 403;
        throw err;
      }
    }

    // Validasi status dokumen
    if (doc.status !== 'DRAFT' && doc.status !== 'DIKEMBALIKAN') {
      const err = new Error(`Dokumen dengan status '${doc.status}' tidak dapat diajukan`);
      err.status = 422;
      throw err;
    }

    // Validasi akses efektif pengisian terbuka (BR-10)
    await submissionAccessService.assertSubmissionOpen(doc, client);

    const oldStatus = doc.status;
    const updated = await budgetDocRepository.updateStatus(docId, 'DIAJUKAN', user.id, client);

    // Catat ke doc_status_history
    await workflowRepository.recordStatusHistory(
      {
        doc_id: docId,
        from_status: oldStatus,
        to_status: 'DIAJUKAN',
        actor_id: user.id,
        note: 'Pengajuan dokumen anggaran oleh unit kerja',
      },
      client
    );

    // BR-14: Jika dokumen sebelumnya dibuka via AUTO_RETURN, submit ulang menutup akses AUTO_RETURN tersebut
    const existingOverride = await submissionAccessRepository.findByUnitAndPeriod(
      doc.period_id,
      doc.unit_id,
      doc.type,
      client
    );
    if (existingOverride && existingOverride.source === 'AUTO_RETURN' && existingOverride.state === 'BUKA') {
      await submissionAccessRepository.upsert(
        {
          period_id: doc.period_id,
          unit_id: doc.unit_id,
          doc_type: doc.type,
          state: 'TUTUP',
          source: 'AUTO_RETURN',
          reason: 'Pengajuan ulang dokumen menutup pembukaan otomatis (BR-14)',
          changed_by: user.id,
        },
        client
      );
    }

    // Audit log
    await AuditService.log(
      {
        userId: user.id,
        action: 'SUBMIT',
        entity: 'budget_docs',
        entityId: docId,
        oldData: { status: oldStatus },
        newData: { status: 'DIAJUKAN', submitted_by: user.id },
      },
      client
    );

    // Notifikasi ke Manager unit dan Akuntansi
    const managerAndAccountingIds = await notificationRepository.findTargetUserIds({
      unitId: doc.unit_id,
      roles: ['manager', 'akuntansi'],
    });
    // Kecualikan diri sendiri
    const recipientIds = managerAndAccountingIds.filter((id) => id !== user.id);

    const notifs = recipientIds.map((uid) => ({
      user_id: uid,
      title: `Dokumen Anggaran Diajukan: [${doc.unit_code}] ${doc.unit_name}`,
      body: `Dokumen ${doc.type} periode ${doc.period_year} telah diajukan oleh ${user.name} dan siap divalidasi.`,
      link: `/proses?tab=validasi&doc_id=${docId}`,
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
 * 2. Setujui Dokumen Anggaran (DIAJUKAN -> DISETUJUI)
 */
const approveDoc = async (docId, user) => {
  if (user.role !== 'manager' && user.role !== 'akuntansi') {
    const err = new Error('Hanya Manager atau Akuntansi yang dapat menyetujui dokumen');
    err.status = 403;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const doc = await budgetDocRepository.findRawById(docId, client);
    if (!doc) {
      const err = new Error('Dokumen anggaran tidak ditemukan');
      err.status = 404;
      throw err;
    }

    // Validasi otorisasi unit untuk Manager
    if (user.role === 'manager') {
      const accessibleUnits = await budgetDocRepository.getAccessibleUnitIds(user);
      if (!accessibleUnits.includes(doc.unit_id)) {
        const err = new Error('Anda tidak memiliki kewenangan validasi pada unit kerja ini');
        err.status = 403;
        throw err;
      }
    }

    // BR-07: Pengaju tidak boleh menyetujui dokumennya sendiri (Maker-Checker)
    if (doc.submitted_by === user.id) {
      const err = new Error('Pengaju tidak boleh menyetujui dokumen yang diajukannya sendiri');
      err.status = 403;
      err.code = 'MAKER_CHECKER_VIOLATION';
      throw err;
    }

    // Validasi status
    if (doc.status !== 'DIAJUKAN') {
      const err = new Error(`Hanya dokumen berstatus 'DIAJUKAN' yang dapat disetujui (status saat ini: '${doc.status}')`);
      err.status = 422;
      throw err;
    }

    const updated = await budgetDocRepository.updateStatus(docId, 'DISETUJUI', null, client);

    await workflowRepository.recordStatusHistory(
      {
        doc_id: docId,
        from_status: 'DIAJUKAN',
        to_status: 'DISETUJUI',
        actor_id: user.id,
        note: 'Dokumen disetujui oleh validator',
      },
      client
    );

    await AuditService.log(
      {
        userId: user.id,
        action: 'APPROVE',
        entity: 'budget_docs',
        entityId: docId,
        oldData: { status: 'DIAJUKAN' },
        newData: { status: 'DISETUJUI' },
      },
      client
    );

    // Notifikasi ke pengaju dan Akuntansi
    const recipientIds = [];
    if (doc.submitted_by && doc.submitted_by !== user.id) {
      recipientIds.push(doc.submitted_by);
    }
    const accountingIds = await notificationRepository.findTargetUserIds({ roles: ['akuntansi'] });
    for (const accId of accountingIds) {
      if (accId !== user.id && !recipientIds.includes(accId)) {
        recipientIds.push(accId);
      }
    }

    const notifs = recipientIds.map((uid) => ({
      user_id: uid,
      title: `Dokumen Disetujui: [${doc.unit_code}] ${doc.unit_name}`,
      body: `Dokumen ${doc.type} periode ${doc.period_year} telah disetujui oleh ${user.name}.`,
      link: `/proses?tab=validasi&doc_id=${docId}`,
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
 * 3. Kembalikan Dokumen Anggaran (DIAJUKAN / DISETUJUI -> DIKEMBALIKAN)
 */
const returnDoc = async (docId, { note }, user) => {
  if (user.role !== 'manager' && user.role !== 'akuntansi') {
    const err = new Error('Hanya Manager atau Akuntansi yang dapat mengembalikan dokumen');
    err.status = 403;
    throw err;
  }

  // BR-08: Catatan wajib diisi
  if (!note || note.trim() === '') {
    const err = new Error('Catatan pengembalian wajib diisi');
    err.status = 422;
    err.code = 'RETURN_NOTE_REQUIRED';
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const doc = await budgetDocRepository.findRawById(docId, client);
    if (!doc) {
      const err = new Error('Dokumen anggaran tidak ditemukan');
      err.status = 404;
      throw err;
    }

    if (user.role === 'manager') {
      const accessibleUnits = await budgetDocRepository.getAccessibleUnitIds(user);
      if (!accessibleUnits.includes(doc.unit_id)) {
        const err = new Error('Anda tidak memiliki kewenangan validasi pada unit kerja ini');
        err.status = 403;
        throw err;
      }
    }

    if (doc.status !== 'DIAJUKAN' && doc.status !== 'DISETUJUI') {
      const err = new Error(`Dokumen dengan status '${doc.status}' tidak dapat dikembalikan`);
      err.status = 422;
      throw err;
    }

    const oldStatus = doc.status;
    const updated = await budgetDocRepository.updateStatus(docId, 'DIKEMBALIKAN', null, client);

    await workflowRepository.recordStatusHistory(
      {
        doc_id: docId,
        from_status: oldStatus,
        to_status: 'DIKEMBALIKAN',
        actor_id: user.id,
        note: note.trim(),
      },
      client
    );

    // BR-14: Otomatis buka akses unit jika pengisian sudah ditutup dan review_deadline belum lewat
    const period = await submissionAccessRepository.findPeriodById(doc.period_id, client);
    const reviewDeadlinePassed = isDatePassed(period.review_deadline);

    // Cek apakah fitur auto_reopen_on_return aktif di settings
    let autoReopenSetting = true;
    try {
      const sRes = await client.query("SELECT value FROM settings WHERE key = 'auto_reopen_on_return'");
      if (sRes.rows[0]) {
        autoReopenSetting = Boolean(sRes.rows[0].value);
      }
    } catch {
      autoReopenSetting = true;
    }

    let openedAutoReturn = false;
    if (autoReopenSetting && !reviewDeadlinePassed) {
      // Cek apakah akses pengisian saat ini tertutup
      const currentAccess = await submissionAccessService.getEffectiveAccess(
        doc.period_id,
        doc.unit_id,
        doc.type,
        client
      );

      if (!currentAccess.is_open) {
        await submissionAccessRepository.upsert(
          {
            period_id: doc.period_id,
            unit_id: doc.unit_id,
            doc_type: doc.type,
            state: 'BUKA',
            source: 'AUTO_RETURN',
            reason: `Pembukaan otomatis: Dokumen dikembalikan (${note.trim()})`,
            changed_by: user.id,
          },
          client
        );
        openedAutoReturn = true;
      }
    }

    await AuditService.log(
      {
        userId: user.id,
        action: 'RETURN',
        entity: 'budget_docs',
        entityId: docId,
        oldData: { status: oldStatus },
        newData: { status: 'DIKEMBALIKAN', note: note.trim(), auto_returned: openedAutoReturn },
      },
      client
    );

    // Kirim notifikasi ke pengaju dan PIC unit kerja
    const targetUserIds = await notificationRepository.findTargetUserIds({
      unitId: doc.unit_id,
      roles: ['pic'],
    });
    if (doc.submitted_by && !targetUserIds.includes(doc.submitted_by)) {
      targetUserIds.push(doc.submitted_by);
    }
    const recipientIds = targetUserIds.filter((id) => id !== user.id);

    const notifs = recipientIds.map((uid) => ({
      user_id: uid,
      title: `Dokumen Dikembalikan: [${doc.unit_code}] ${doc.unit_name}`,
      body: `Dokumen ${doc.type} dikembalikan oleh ${user.name}. Catatan: "${note.trim()}".${
        openedAutoReturn ? ' Akses pengisian unit Anda telah dibuka otomatis untuk perbaikan.' : ''
      }`,
      link: '/entry',
    }));
    await notificationRepository.createBulkNotifications(notifs, client);

    await client.query('COMMIT');
    return {
      ...updated,
      auto_reopened: openedAutoReturn,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * 4. Finalisasi Dokumen Tunggal (DISETUJUI -> FINAL)
 */
const finalizeDoc = async (docId, user) => {
  if (user.role !== 'akuntansi') {
    const err = new Error('Hanya Akuntansi yang berwenang memfinalisasi dokumen');
    err.status = 403;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const doc = await budgetDocRepository.findRawById(docId, client);
    if (!doc) {
      const err = new Error('Dokumen anggaran tidak ditemukan');
      err.status = 404;
      throw err;
    }

    if (doc.status !== 'DISETUJUI') {
      const err = new Error(`Dokumen hanya dapat difinalisasi bila berstatus 'DISETUJUI' (status saat ini: '${doc.status}')`);
      err.status = 422;
      throw err;
    }

    const updated = await budgetDocRepository.updateStatus(docId, 'FINAL', null, client);

    await workflowRepository.recordStatusHistory(
      {
        doc_id: docId,
        from_status: 'DISETUJUI',
        to_status: 'FINAL',
        actor_id: user.id,
        note: 'Dokumen difinalisasi oleh Akuntansi (terkunci)',
      },
      client
    );

    await AuditService.log(
      {
        userId: user.id,
        action: 'FINALIZE',
        entity: 'budget_docs',
        entityId: docId,
        oldData: { status: 'DISETUJUI' },
        newData: { status: 'FINAL' },
      },
      client
    );

    // Notifikasi ke PIC dan Manager unit
    const recipientIds = await notificationRepository.findTargetUserIds({
      unitId: doc.unit_id,
      roles: ['pic', 'manager'],
    });

    const notifs = recipientIds.map((uid) => ({
      user_id: uid,
      title: `Dokumen FINAL (Terkunci): [${doc.unit_code}] ${doc.unit_name}`,
      body: `Dokumen anggaran ${doc.type} periode ${doc.period_year} telah disahkan dan difinalisasi oleh Akuntansi.`,
      link: '/display',
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
 * 5. Finalisasi Massal (Bulk Finalize)
 */
const finalizeBulk = async (docIds, user) => {
  if (user.role !== 'akuntansi') {
    const err = new Error('Hanya Akuntansi yang berwenang memfinalisasi dokumen');
    err.status = 403;
    throw err;
  }

  if (!Array.isArray(docIds) || docIds.length === 0) {
    const err = new Error('Daftar ID dokumen tidak boleh kosong');
    err.status = 422;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const finalizedList = await budgetDocRepository.finalizeBulk(docIds, client);

    for (const d of finalizedList) {
      await workflowRepository.recordStatusHistory(
        {
          doc_id: d.id,
          from_status: 'DISETUJUI',
          to_status: 'FINAL',
          actor_id: user.id,
          note: 'Finalisasi massal oleh Akuntansi',
        },
        client
      );

      await AuditService.log(
        {
          userId: user.id,
          action: 'FINALIZE_BULK',
          entity: 'budget_docs',
          entityId: d.id,
          oldData: { status: 'DISETUJUI' },
          newData: { status: 'FINAL' },
        },
        client
      );
    }

    await client.query('COMMIT');
    return {
      success: true,
      finalized_count: finalizedList.length,
      finalized_docs: finalizedList,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * 6. Buka Kembali Dokumen FINAL (FINAL -> DRAFT) (BR-06)
 */
const reopenDoc = async (docId, { reason }, user) => {
  if (user.role !== 'akuntansi') {
    const err = new Error('Hanya Akuntansi yang berwenang membuka kembali dokumen terkunci');
    err.status = 403;
    throw err;
  }

  if (!reason || reason.trim() === '') {
    const err = new Error('Alasan pembukaan kembali dokumen wajib diisi');
    err.status = 422;
    err.code = 'REOPEN_REASON_REQUIRED';
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const doc = await budgetDocRepository.findRawById(docId, client);
    if (!doc) {
      const err = new Error('Dokumen anggaran tidak ditemukan');
      err.status = 404;
      throw err;
    }

    if (doc.status !== 'FINAL') {
      const err = new Error(`Hanya dokumen berstatus 'FINAL' yang dapat dibuka kembali (status saat ini: '${doc.status}')`);
      err.status = 422;
      throw err;
    }

    const updated = await budgetDocRepository.updateStatus(docId, 'DRAFT', null, client);

    await workflowRepository.recordStatusHistory(
      {
        doc_id: docId,
        from_status: 'FINAL',
        to_status: 'DRAFT',
        actor_id: user.id,
        note: `Buka kembali dokumen: ${reason.trim()}`,
      },
      client
    );

    await AuditService.log(
      {
        userId: user.id,
        action: 'REOPEN',
        entity: 'budget_docs',
        entityId: docId,
        oldData: { status: 'FINAL' },
        newData: { status: 'DRAFT', reason: reason.trim() },
      },
      client
    );

    // Notifikasi ke PIC dan Manager unit
    const recipientIds = await notificationRepository.findTargetUserIds({
      unitId: doc.unit_id,
      roles: ['pic', 'manager'],
    });

    const notifs = recipientIds.map((uid) => ({
      user_id: uid,
      title: `Dokumen Dibuka Kembali: [${doc.unit_code}] ${doc.unit_name}`,
      body: `Dokumen ${doc.type} dibuka kembali menjadi DRAFT oleh Akuntansi. Alasan: "${reason.trim()}".`,
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
 * 7. Riwayat Status Dokumen
 */
const getDocHistory = async (docId, user) => {
  const doc = await budgetDocRepository.findRawById(docId);
  if (!doc) {
    const err = new Error('Dokumen anggaran tidak ditemukan');
    err.status = 404;
    throw err;
  }

  // Otorisasi akses unit
  if (user.role !== 'akuntansi') {
    const accessibleUnits = await budgetDocRepository.getAccessibleUnitIds(user);
    if (!accessibleUnits.includes(doc.unit_id)) {
      const err = new Error('Anda tidak memiliki akses ke dokumen ini');
      err.status = 403;
      throw err;
    }
  }

  const history = await workflowRepository.getStatusHistory(docId);
  return {
    doc_id: docId,
    unit_id: doc.unit_id,
    unit_name: doc.unit_name,
    type: doc.type,
    current_status: doc.status,
    history,
  };
};

/**
 * 8. Antrean Validasi (Review Queue)
 */
const getReviewQueue = async (filters, user) => {
  return workflowRepository.getReviewQueue(filters, user);
};

/**
 * 9. Komentar Per Baris
 */
const addLineComment = async (docId, { line_type, line_id, text }, user) => {
  if (!text || text.trim() === '') {
    const err = new Error('Teks komentar tidak boleh kosong');
    err.status = 422;
    throw err;
  }

  const doc = await budgetDocRepository.findRawById(docId);
  if (!doc) {
    const err = new Error('Dokumen anggaran tidak ditemukan');
    err.status = 404;
    throw err;
  }

  if (user.role !== 'akuntansi') {
    const accessibleUnits = await budgetDocRepository.getAccessibleUnitIds(user);
    if (!accessibleUnits.includes(doc.unit_id)) {
      const err = new Error('Anda tidak memiliki akses ke dokumen ini');
      err.status = 403;
      throw err;
    }
  }

  const saved = await workflowRepository.addLineComment({
    doc_id: docId,
    line_type,
    line_id,
    author_id: user.id,
    text: text.trim(),
  });

  return saved;
};

const getLineComments = async (docId, lineType, lineId, user) => {
  const doc = await budgetDocRepository.findRawById(docId);
  if (!doc) {
    const err = new Error('Dokumen anggaran tidak ditemukan');
    err.status = 404;
    throw err;
  }

  if (user.role !== 'akuntansi') {
    const accessibleUnits = await budgetDocRepository.getAccessibleUnitIds(user);
    if (!accessibleUnits.includes(doc.unit_id)) {
      const err = new Error('Anda tidak memiliki akses ke dokumen ini');
      err.status = 403;
      throw err;
    }
  }

  return workflowRepository.getLineComments(docId, lineType, lineId);
};

const deleteLineComment = async (commentId, user) => {
  const comment = await workflowRepository.findCommentById(commentId);
  if (!comment) {
    const err = new Error('Komentar tidak ditemukan');
    err.status = 404;
    throw err;
  }

  if (comment.author_id !== user.id && user.role !== 'akuntansi') {
    const err = new Error('Hanya pembuat komentar atau Akuntansi yang dapat menghapus komentar ini');
    err.status = 403;
    throw err;
  }

  await workflowRepository.deleteLineComment(commentId);
  return { success: true, message: 'Komentar berhasil dihapus' };
};

module.exports = {
  submitDoc,
  approveDoc,
  returnDoc,
  finalizeDoc,
  finalizeBulk,
  reopenDoc,
  getDocHistory,
  getReviewQueue,
  addLineComment,
  getLineComments,
  deleteLineComment,
};
