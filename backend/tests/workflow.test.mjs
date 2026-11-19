import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';
import { runAutoCloseJob, runReminderJob } from '../src/services/scheduler.service';

describe('Workflow Approval, Submission Access, & Notification Test Suite (Fase 5)', () => {
  let picAgent;
  let managerAgent;
  let managerLainAgent;
  let akuntansiAgent;

  let picUserId;
  let managerUserId;

  let testPeriodId;
  let unit1Id;
  let unit2Id;
  let testDocId;
  let testDocInvestId;

  beforeAll(async () => {
    picAgent = request.agent(app);
    managerAgent = request.agent(app);
    managerLainAgent = request.agent(app);
    akuntansiAgent = request.agent(app);

    // 1. Ambil data user dari database
    const usersRes = await db.query(
      "SELECT id, email, role FROM users WHERE email IN ('rina@ptcn.id', 'budi@ptcn.id', 'dya@ptcn.id')"
    );
    for (const u of usersRes.rows) {
      if (u.role === 'pic') picUserId = u.id;
      if (u.role === 'manager') managerUserId = u.id;
    }

    // 2. Ambil data unit
    const unitsRes = await db.query(
      "SELECT id, code FROM units WHERE code IN ('9001', '9002') ORDER BY code ASC"
    );
    unit1Id = unitsRes.rows[0]?.id || 1;
    unit2Id = unitsRes.rows[1]?.id || 2;

    // Pastikan managerUserId ditugaskan ke unit1Id
    await db.query(
      `INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [managerUserId, unit1Id]
    );

    // Buat/ambil user manager lain yang HANYA memiliki akses ke unit2Id
    const managerLainRes = await db.query(
      "SELECT id FROM users WHERE email = 'manager2@ptcn.id'"
    );
    let managerLainId;
    if (managerLainRes.rows.length > 0) {
      managerLainId = managerLainRes.rows[0].id;
    } else {
      const insRes = await db.query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES ('Manager Unit 2', 'manager2@ptcn.id', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash', 'manager', true)
         RETURNING id`
      );
      managerLainId = insRes.rows[0].id;
    }
    await db.query(
      `INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [managerLainId, unit2Id]
    );

    // 3. Buat periode khusus pengujian
    const compRes = await db.query("SELECT id FROM companies WHERE code = 'CN'");
    const cnCompId = compRes.rows[0]?.id || 1;

    // Set deadline pengisian ke masa depan (misal 10 hari ke depan)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const fillDeadlineStr = futureDate.toISOString().split('T')[0];

    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + 20);
    const reviewDeadlineStr = reviewDate.toISOString().split('T')[0];

    const periodRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state, auto_close)
       VALUES ($1, 2035, 'PENGISIAN', $2, $3, $3, 'BUKA', true)
       ON CONFLICT (company_id, year) 
       DO UPDATE SET fill_deadline = $2, review_deadline = $3, submission_state = 'BUKA'
       RETURNING id`,
      [cnCompId, fillDeadlineStr, reviewDeadlineStr]
    );
    testPeriodId = periodRes.rows[0].id;

    // 4. Buat dokumen anggaran uji
    const docBiayaRes = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount)
       VALUES ($1, $2, 'BIAYA', 'DRAFT', 1000000)
       ON CONFLICT (period_id, unit_id, type)
       DO UPDATE SET status = 'DRAFT'
       RETURNING id`,
      [testPeriodId, unit1Id]
    );
    testDocId = docBiayaRes.rows[0].id;

    const docInvestRes = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount)
       VALUES ($1, $2, 'INVESTASI', 'DRAFT', 25000000)
       ON CONFLICT (period_id, unit_id, type)
       DO UPDATE SET status = 'DRAFT'
       RETURNING id`,
      [testPeriodId, unit1Id]
    );
    testDocInvestId = docInvestRes.rows[0].id;

    // Bersihkan submission_access untuk periode uji agar bersih
    await db.query('DELETE FROM submission_access WHERE period_id = $1', [testPeriodId]);

    // 5. Login Agents
    // PIC
    const csrfPic = await picAgent.get('/api/auth/csrf');
    await picAgent.post('/api/auth/login').set('X-CSRF-Token', csrfPic.body.csrf_token).send({
      email: 'rina@ptcn.id',
      password: 'password123',
    });

    // Manager Unit 1
    const csrfMgr = await managerAgent.get('/api/auth/csrf');
    await managerAgent.post('/api/auth/login').set('X-CSRF-Token', csrfMgr.body.csrf_token).send({
      email: 'budi@ptcn.id',
      password: 'password123',
    });

    // Akuntansi
    const csrfAcc = await akuntansiAgent.get('/api/auth/csrf');
    await akuntansiAgent.post('/api/auth/login').set('X-CSRF-Token', csrfAcc.body.csrf_token).send({
      email: 'dya@ptcn.id',
      password: 'password123',
    });

    // Mock session untuk Manager Lain
    const csrfMgrLain = await managerLainAgent.get('/api/auth/csrf');
    // Login paksa dengan mock atau buat session
    await db.query(
      `UPDATE users SET password_hash = (SELECT password_hash FROM users WHERE email = 'budi@ptcn.id') WHERE id = $1`,
      [managerLainId]
    );
    await managerLainAgent.post('/api/auth/login').set('X-CSRF-Token', csrfMgrLain.body.csrf_token).send({
      email: 'manager2@ptcn.id',
      password: 'password123',
    });
  });

  afterAll(async () => {
    // Bersihkan data tes
    if (testPeriodId) {
      await db.query('DELETE FROM submission_access WHERE period_id = $1', [testPeriodId]);
      await db.query('DELETE FROM budget_docs WHERE period_id = $1', [testPeriodId]);
      await db.query('DELETE FROM periods WHERE id = $1', [testPeriodId]);
    }
  });

  // -----------------------------------------------------------------------------
  // 1. Transisi Status Dokumen (Workflow State Machine)
  // -----------------------------------------------------------------------------
  describe('1. Transisi Status Dokumen (DRAFT -> DIAJUKAN -> DISETUJUI -> FINAL)', () => {
    it('PIC dapat mengajukan (submit) dokumen DRAFT menjadi DIAJUKAN', async () => {
      const csrf = await picAgent.get('/api/auth/csrf');
      const res = await picAgent
        .post(`/api/budget-docs/${testDocId}/submit`)
        .set('X-CSRF-Token', csrf.body.csrf_token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DIAJUKAN');
      expect(res.body.data.submitted_by).toBe(picUserId);

      // Cek riwayat status
      const histRes = await picAgent.get(`/api/budget-docs/${testDocId}/history`);
      expect(histRes.status).toBe(200);
      expect(histRes.body.history.length).toBeGreaterThan(0);
      const lastHist = histRes.body.history[histRes.body.history.length - 1];
      expect(lastHist.to_status).toBe('DIAJUKAN');
    });

    it('Transisi tidak sah: DRAFT langsung difinalisasi tanpa persetujuan ditolak (422)', async () => {
      // testDocInvestId masih DRAFT
      const csrf = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .post(`/api/budget-docs/${testDocInvestId}/finalize`)
        .set('X-CSRF-Token', csrf.body.csrf_token);

      expect(res.status).toBe(422);
    });

    it('Manager dapat menyetujui (approve) dokumen DIAJUKAN menjadi DISETUJUI', async () => {
      const csrf = await managerAgent.get('/api/auth/csrf');
      const res = await managerAgent
        .post(`/api/budget-docs/${testDocId}/approve`)
        .set('X-CSRF-Token', csrf.body.csrf_token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DISETUJUI');
    });

    it('Akuntansi dapat memfinalisasi (finalize) dokumen DISETUJUI menjadi FINAL (terkunci)', async () => {
      const csrf = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .post(`/api/budget-docs/${testDocId}/finalize`)
        .set('X-CSRF-Token', csrf.body.csrf_token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('FINAL');
    });
  });

  // -----------------------------------------------------------------------------
  // 2. Maker-Checker (BR-07)
  // -----------------------------------------------------------------------------
  describe('2. Maker-Checker BR-07: Pengaju Dilarang Menyetujui Dokumen Sendiri', () => {
    it('Manager yang mengajukan dokumen sendiri ditolak saat mencoba menyetujuinya (403)', async () => {
      // Buat dokumen yang diajukan oleh Manager sendiri
      const newDocRes = await db.query(
        `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, submitted_by)
         VALUES ($1, $2, 'INVESTASI', 'DIAJUKAN', 15000000, $3)
         ON CONFLICT (period_id, unit_id, type)
         DO UPDATE SET status = 'DIAJUKAN', submitted_by = $3
         RETURNING id`,
        [testPeriodId, unit1Id, managerUserId]
      );
      const docSubmittedByManager = newDocRes.rows[0].id;

      // Manager mencoba approve dokumen yang diajukannya sendiri
      const csrf = await managerAgent.get('/api/auth/csrf');
      const res = await managerAgent
        .post(`/api/budget-docs/${docSubmittedByManager}/approve`)
        .set('X-CSRF-Token', csrf.body.csrf_token);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Pengaju tidak boleh menyetujui/i);
    });
  });

  // -----------------------------------------------------------------------------
  // 3. Pengembalian Dokumen (BR-08) & Reopen Dokumen FINAL (BR-06)
  // -----------------------------------------------------------------------------
  describe('3. Pengembalian Dokumen (BR-08) & Reopen Dokumen FINAL (BR-06)', () => {
    it('Pengembalian dokumen tanpa catatan wajib ditolak dengan status 422 (BR-08)', async () => {
      const csrf = await managerAgent.get('/api/auth/csrf');
      const res = await managerAgent
        .post(`/api/budget-docs/${testDocId}/return`)
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ note: '' });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/Catatan pengembalian wajib diisi/i);
    });

    it('Akuntansi membuka kembali dokumen FINAL menjadi DRAFT dengan alasan wajib (BR-06)', async () => {
      // testDocId berstatus FINAL dari test 1
      const csrf = await akuntansiAgent.get('/api/auth/csrf');

      // 1. Tanpa alasan -> tolak 422
      const failRes = await akuntansiAgent
        .post(`/api/budget-docs/${testDocId}/reopen`)
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ reason: '   ' });
      expect(failRes.status).toBe(422);

      // 2. Dengan alasan -> sukses kembali ke DRAFT
      const successRes = await akuntansiAgent
        .post(`/api/budget-docs/${testDocId}/reopen`)
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ reason: 'Perbaikan estimasi kuantitas obat logistik triwulan 1' });

      expect(successRes.status).toBe(200);
      expect(successRes.body.data.status).toBe('DRAFT');

      // Cek audit log mencatat aksi REOPEN
      const auditRes = await db.query(
        "SELECT * FROM audit_logs WHERE entity = 'budget_docs' AND entity_id = $1 AND action = 'REOPEN'",
        [testDocId]
      );
      expect(auditRes.rows.length).toBeGreaterThan(0);
    });

    it('Dokumen yang diajukan kembali dapat dikembalikan dengan catatan oleh Manager', async () => {
      // Submit lagi oleh PIC
      const csrfPic = await picAgent.get('/api/auth/csrf');
      await picAgent.post(`/api/budget-docs/${testDocId}/submit`).set('X-CSRF-Token', csrfPic.body.csrf_token);

      // Kembalikan oleh Manager
      const csrfMgr = await managerAgent.get('/api/auth/csrf');
      const retRes = await managerAgent
        .post(`/api/budget-docs/${testDocId}/return`)
        .set('X-CSRF-Token', csrfMgr.body.csrf_token)
        .send({ note: 'Mohon kurangi kuantitas sarung tangan medis non-steril' });

      expect(retRes.status).toBe(200);
      expect(retRes.body.data.status).toBe('DIKEMBALIKAN');
    });
  });

  // -----------------------------------------------------------------------------
  // 4. Akses Efektif Dokumen & Penolakan Tulis (BR-10)
  // -----------------------------------------------------------------------------
  describe('4. Akses Efektif Dokumen & Penolakan Tulis saat Akses Tertutup (403 SUBMISSION_CLOSED)', () => {
    it('GET /api/budget-docs/:id/access mengembalikan status is_open = true saat periode buka', async () => {
      const res = await picAgent.get(`/api/budget-docs/${testDocId}/access`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.is_open).toBe(true);
      expect(res.body.effective_state).toBe('BUKA');
    });

    it('Saat Akuntansi menutup akses unit, mutasi baris biaya dan investasi ditolak dengan 403 SUBMISSION_CLOSED', async () => {
      // 1. Akuntansi menutup akses unit1Id
      const csrfAcc = await akuntansiAgent.get('/api/auth/csrf');
      const closeRes = await akuntansiAgent
        .post('/api/submission-access')
        .set('X-CSRF-Token', csrfAcc.body.csrf_token)
        .send({
          period_id: testPeriodId,
          unit_id: unit1Id,
          doc_type: 'SEMUA',
          state: 'TUTUP',
          reason: 'Batas revisi unit 1 telah berakhir sementara',
        });
      expect(closeRes.status).toBe(200);

      // 2. Cek GET access mengembalikan is_open = false
      const accRes = await picAgent.get(`/api/budget-docs/${testDocId}/access`);
      expect(accRes.body.is_open).toBe(false);
      expect(accRes.body.effective_state).toBe('TUTUP');

      // 3. Upaya update baris biaya ditolak 403 SUBMISSION_CLOSED
      const csrfPic = await picAgent.get('/api/auth/csrf');
      const failExpense = await picAgent
        .put(`/api/budget-docs/${testDocId}/expense-lines`)
        .set('X-CSRF-Token', csrfPic.body.csrf_token)
        .send({ lines: [{ item_id: 1, qty: 5 }] });

      expect(failExpense.status).toBe(403);
      expect(failExpense.body.message).toMatch(/sedang ditutup atau telah melewati deadline/i);

      // 4. Upaya tambah baris investasi juga ditolak 403 SUBMISSION_CLOSED
      const failInvest = await picAgent
        .post(`/api/budget-docs/${testDocInvestId}/investment-lines`)
        .set('X-CSRF-Token', csrfPic.body.csrf_token)
        .send({
          category_id: 1,
          name: 'Alat Operasi',
          qty: 1,
          price: 15000000,
          plan_month: 2,
          priority_id: 1,
        });

      expect(failInvest.status).toBe(403);
    });

    it('Membuka kembali akses unit wajib menyertakan alasan (422 jika kosong)', async () => {
      const csrfAcc = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .post('/api/submission-access')
        .set('X-CSRF-Token', csrfAcc.body.csrf_token)
        .send({
          period_id: testPeriodId,
          unit_id: unit1Id,
          doc_type: 'SEMUA',
          state: 'BUKA',
          reason: '', // Kosong
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/Alasan wajib diisi/i);
    });
  });

  // -----------------------------------------------------------------------------
  // 5. Pembukaan Otomatis saat Dokumen Dikembalikan (BR-14 Auto-Return)
  // -----------------------------------------------------------------------------
  describe('5. Pembukaan Otomatis Dokumen Dikembalikan (BR-14 Auto-Return)', () => {
    it('Pengembalian dokumen saat pengisian ditutup & review deadline belum lewat otomatis membuka akses unit', async () => {
      // 1. Pastikan dokumen berstatus DIAJUKAN
      await db.query("UPDATE budget_docs SET status = 'DIAJUKAN' WHERE id = $1", [testDocId]);

      // 2. Pastikan akses unit ditutup (MANUAL TUTUP)
      await db.query(
        `UPDATE submission_access SET state = 'TUTUP', source = 'MANUAL' 
         WHERE period_id = $1 AND unit_id = $2`,
        [testPeriodId, unit1Id]
      );

      // 3. Manager mengembalikan dokumen
      const csrfMgr = await managerAgent.get('/api/auth/csrf');
      const retRes = await managerAgent
        .post(`/api/budget-docs/${testDocId}/return`)
        .set('X-CSRF-Token', csrfMgr.body.csrf_token)
        .send({ note: 'Revisi rincian biaya alkes unit' });

      expect(retRes.status).toBe(200);
      expect(retRes.body.auto_reopened).toBe(true);

      // 4. Verifikasi bahwa submission_access berubah menjadi BUKA dengan source AUTO_RETURN
      const accessRes = await db.query(
        `SELECT * FROM submission_access WHERE period_id = $1 AND unit_id = $2 AND doc_type = 'BIAYA'`,
        [testPeriodId, unit1Id]
      );
      expect(accessRes.rows.length).toBeGreaterThan(0);
      expect(accessRes.rows[0].state).toBe('BUKA');
      expect(accessRes.rows[0].source).toBe('AUTO_RETURN');

      // 5. Submit ulang oleh PIC menutup akses AUTO_RETURN tersebut kembali (BR-14)
      const csrfPic = await picAgent.get('/api/auth/csrf');
      const subRes = await picAgent
        .post(`/api/budget-docs/${testDocId}/submit`)
        .set('X-CSRF-Token', csrfPic.body.csrf_token);
      expect(subRes.status).toBe(200);

      const accessAfterSub = await db.query(
        `SELECT * FROM submission_access WHERE period_id = $1 AND unit_id = $2 AND doc_type = 'BIAYA'`,
        [testPeriodId, unit1Id]
      );
      expect(accessAfterSub.rows[0].state).toBe('TUTUP');
    });
  });

  // -----------------------------------------------------------------------------
  // 6. Review Queue, Komentar Baris & Finalisasi Massal
  // -----------------------------------------------------------------------------
  describe('6. Review Queue, Komentar Baris & Finalisasi Massal', () => {
    it('Review Queue menampilkan dokumen DIAJUKAN sesuai kewenangan unit pengguna', async () => {
      // Manager Unit 1 melihat testDocId
      const resMgr = await managerAgent.get(`/api/budget-docs/review-queue?period_id=${testPeriodId}`);
      expect(resMgr.status).toBe(200);
      expect(resMgr.body.data.some((d) => d.id === testDocId)).toBe(true);

      // Manager Unit 2 TIDAK melihat testDocId (karena hanya punya unit 2)
      const resMgr2 = await managerLainAgent.get(`/api/budget-docs/review-queue?period_id=${testPeriodId}`);
      expect(resMgr2.body.data.some((d) => d.id === testDocId)).toBe(false);
    });

    it('Manager dapat menambahkan dan menghapus komentar pada baris anggaran', async () => {
      // 1. Tambah komentar
      const csrfMgr = await managerAgent.get('/api/auth/csrf');
      const addRes = await managerAgent
        .post(`/api/budget-docs/${testDocId}/lines/expense/1/comments`)
        .set('X-CSRF-Token', csrfMgr.body.csrf_token)
        .send({ text: 'Perhatikan tren pemakaian bulan sebelumnya' });

      expect(addRes.status).toBe(201);
      expect(addRes.body.data.text).toBe('Perhatikan tren pemakaian bulan sebelumnya');
      const commentId = addRes.body.data.id;

      // 2. Ambil komentar
      const listRes = await picAgent.get(`/api/budget-docs/${testDocId}/lines/expense/1/comments`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((c) => c.id === commentId)).toBe(true);

      // 3. Hapus komentar
      const delRes = await managerAgent
        .delete(`/api/line-comments/${commentId}`)
        .set('X-CSRF-Token', csrfMgr.body.csrf_token);
      expect(delRes.status).toBe(200);
    });

    it('Akuntansi dapat memfinalisasi banyak dokumen DISETUJUI sekaligus (finalize-bulk)', async () => {
      // Setujui dokumen dulu oleh Manager
      const csrfMgr = await managerAgent.get('/api/auth/csrf');
      await managerAgent.post(`/api/budget-docs/${testDocId}/approve`).set('X-CSRF-Token', csrfMgr.body.csrf_token);

      // Finalize bulk oleh Akuntansi
      const csrfAcc = await akuntansiAgent.get('/api/auth/csrf');
      const bulkRes = await akuntansiAgent
        .post('/api/budget-docs/finalize-bulk')
        .set('X-CSRF-Token', csrfAcc.body.csrf_token)
        .send({ doc_ids: [testDocId] });

      expect(bulkRes.status).toBe(200);
      expect(bulkRes.body.finalized_count).toBe(1);

      // Verifikasi dokumen berstatus FINAL
      const docCheck = await db.query('SELECT status FROM budget_docs WHERE id = $1', [testDocId]);
      expect(docCheck.rows[0].status).toBe('FINAL');
    });
  });

  // -----------------------------------------------------------------------------
  // 7. Notifikasi In-App & Scheduler Otomatis
  // -----------------------------------------------------------------------------
  describe('7. Notifikasi In-App & Scheduler Otomatis (Auto-Close & Pengingat)', () => {
    it('Notifikasi in-app tersimpan saat transisi status, dapat dibaca dan ditandai selesai', async () => {
      const listRes = await picAgent.get('/api/notifications');
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(typeof listRes.body.unread_count).toBe('number');

      if (listRes.body.data.length > 0) {
        const firstNotif = listRes.body.data[0];
        const csrf = await picAgent.get('/api/auth/csrf');
        const readRes = await picAgent
          .patch(`/api/notifications/${firstNotif.id}/read`)
          .set('X-CSRF-Token', csrf.body.csrf_token);
        expect(readRes.status).toBe(200);
        expect(readRes.body.data.is_read).toBe(true);
      }

      // Tandai semua dibaca
      const csrfAll = await picAgent.get('/api/auth/csrf');
      const readAllRes = await picAgent
        .post('/api/notifications/read-all')
        .set('X-CSRF-Token', csrfAll.body.csrf_token);
      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.unread_count).toBe(0);
    });

    it('Scheduler: runAutoCloseJob menutup periode yang melewati fill_deadline secara otomatis', async () => {
      // 1. Buat periode yang deadlinenya sudah lewat kemarin
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDeadline = yesterday.toISOString().split('T')[0];

      const expiredPeriodRes = await db.query(
        `INSERT INTO periods (company_id, year, status, fill_deadline, submission_state, auto_close)
         VALUES (1, 2039, 'PENGISIAN', $1, 'BUKA', true)
         RETURNING id`,
        [pastDeadline]
      );
      const expiredId = expiredPeriodRes.rows[0].id;

      // 2. Jalankan fungsi job auto-close
      const result = await runAutoCloseJob();
      expect(result.success).toBe(true);
      expect(result.closed_periods.some((p) => p.id === expiredId)).toBe(true);

      // 3. Verifikasi status periode di database menjadi TUTUP
      const checkRes = await db.query('SELECT submission_state FROM periods WHERE id = $1', [expiredId]);
      expect(checkRes.rows[0].submission_state).toBe('TUTUP');

      // Cleanup periode dummy
      await db.query('DELETE FROM periods WHERE id = $1', [expiredId]);
    });

    it('Scheduler: runReminderJob mengirim pengingat tanpa error', async () => {
      const res = await runReminderJob();
      expect(res.success).toBe(true);
      expect(typeof res.sent_count).toBe('number');
    });
  });
});
