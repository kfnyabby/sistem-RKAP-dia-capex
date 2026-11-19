const db = require('../../db');
const notificationRepository = require('../repositories/notification.repository');
const AuditService = require('./audit.service');

function isDatePassed(dateStrOrObj) {
  if (!dateStrOrObj) return false;
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return new Date() > d;
}

function formatDate(dateStrOrObj) {
  if (!dateStrOrObj) return '';
  const d = new Date(dateStrOrObj);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * 1. Tugas Terjadwal: Penutupan Otomatis Pengajuan yang Melewati Deadline (FR-P8)
 */
const runAutoCloseJob = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Cari periode yang auto_close = true, submission_state = 'BUKA', dan fill_deadline sudah lewat
    const res = await client.query(`
      SELECT * FROM periods 
      WHERE auto_close = TRUE 
        AND submission_state = 'BUKA' 
        AND status != 'DITUTUP'
        AND fill_deadline IS NOT NULL
    `);

    const closedPeriods = [];

    for (const p of res.rows) {
      if (isDatePassed(p.fill_deadline)) {
        await client.query(
          `UPDATE periods SET submission_state = 'TUTUP', updated_at = NOW() WHERE id = $1`,
          [p.id]
        );

        await AuditService.log(
          {
            userId: null, // Aksi sistem
            action: 'AUTO_CLOSE',
            entity: 'periods',
            entityId: p.id,
            oldData: { submission_state: 'BUKA' },
            newData: { submission_state: 'TUTUP', reason: 'Penutupan otomatis sistem karena melewati deadline' },
          },
          client
        );

        // Kirim notifikasi ke seluruh PIC & Manager
        const targetUserIds = await notificationRepository.findTargetUserIds({ roles: ['pic', 'manager'] });
        const notifs = targetUserIds.map((uid) => ({
          user_id: uid,
          title: `Pengajuan Periode RKAP ${p.year} Ditutup Otomatis`,
          body: `Batas waktu pengisian (${formatDate(p.fill_deadline)}) telah berakhir. Pengajuan ditutup otomatis oleh sistem.`,
          link: '/entry',
        }));
        await notificationRepository.createBulkNotifications(notifs, client);

        closedPeriods.push(p);
      }
    }

    await client.query('COMMIT');
    return {
      success: true,
      closed_count: closedPeriods.length,
      closed_periods: closedPeriods,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * 2. Tugas Terjadwal: Pengingat H-3 dan H-1 Menjelang Deadline (FR-P9)
 */
const runReminderJob = async () => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Ambil konfigurasi reminder_days dari settings (default [3, 1])
    let reminderDays = [3, 1];
    try {
      const sRes = await client.query("SELECT value FROM settings WHERE key = 'reminder_days'");
      if (sRes.rows[0]?.value) {
        reminderDays = Array.isArray(sRes.rows[0].value) ? sRes.rows[0].value : JSON.parse(sRes.rows[0].value);
      }
    } catch {
      reminderDays = [3, 1];
    }

    const periodsRes = await client.query(`
      SELECT * FROM periods 
      WHERE submission_state = 'BUKA' 
        AND status != 'DITUTUP' 
        AND fill_deadline IS NOT NULL
    `);

    let sentCount = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const p of periodsRes.rows) {
      const deadline = new Date(p.fill_deadline);
      deadline.setHours(0, 0, 0, 0);

      const diffTime = deadline.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (reminderDays.includes(diffDays) && diffDays >= 0) {
        // Cari unit yang masih memiliki dokumen DRAFT atau DIKEMBALIKAN pada periode ini
        const draftDocsRes = await client.query(
          `SELECT DISTINCT unit_id FROM budget_docs 
           WHERE period_id = $1 AND status IN ('DRAFT', 'DIKEMBALIKAN')`,
          [p.id]
        );

        for (const docRow of draftDocsRes.rows) {
          const targetUserIds = await notificationRepository.findTargetUserIds({
            unitId: docRow.unit_id,
            roles: ['pic'],
          });

          const notifs = targetUserIds.map((uid) => ({
            user_id: uid,
            title: `Pengingat Pengisian RKAP ${p.year} (H-${diffDays})`,
            body: `Batas waktu pengisian anggaran RKAP ${p.year} tersisa ${diffDays} hari lagi (${formatDate(p.fill_deadline)}). Segera lengkapi dan ajukan dokumen unit Anda.`,
            link: '/entry',
          }));

          await notificationRepository.createBulkNotifications(notifs, client);
          sentCount += notifs.length;
        }
      }
    }

    await client.query('COMMIT');
    return {
      success: true,
      sent_count: sentCount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

let schedulerInterval = null;

const startScheduler = (intervalMs = 3600000) => {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(async () => {
    try {
      await runAutoCloseJob();
      await runReminderJob();
    } catch (err) {
      console.error('Galat menjalankan background scheduler:', err.message);
    }
  }, intervalMs);
};

const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
};

module.exports = {
  runAutoCloseJob,
  runReminderJob,
  startScheduler,
  stopScheduler,
};
