import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../src/app';
import db from '../db';

describe('Realization Ledger Test Suite (Fase 6)', () => {
  let aktDya;
  let mgrBudi;
  let picRina;

  const fixturesDir = path.join(__dirname, 'fixtures');
  const mainFixturePath = path.join(fixturesDir, 'dummy_daftar_jurnal.xlsx');
  const badHeaderFixturePath = path.join(fixturesDir, 'dummy_jurnal_missing_header.xlsx');
  const cleanFixturePath = path.join(fixturesDir, 'dummy_jurnal_clean.xlsx');

  const createdBatchIds = [];

  const getCsrf = async () => {
    const res = await request(app).get('/api/auth/csrf');
    expect(res.status).toBe(200);
    return {
      csrfToken: res.body.csrf_token,
      cookie: res.headers['set-cookie'],
    };
  };

  const loginAs = async (email) => {
    const { csrfToken: initCsrf, cookie: initCookie } = await getCsrf();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('Cookie', initCookie)
      .set('X-CSRF-Token', initCsrf)
      .send({ email, password: 'password123' });

    expect(loginRes.status).toBe(200);
    return {
      csrfToken: loginRes.body.csrf_token,
      cookie: loginRes.headers['set-cookie'],
      user: loginRes.body.user,
    };
  };

  const waitForBatchStatus = async (batchId, targetStatus = 'PREVIEW', maxWaitMs = 15000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const res = await request(app)
        .get(`/api/realization-imports/${batchId}`)
        .set('Cookie', aktDya.cookie);
      if (res.status === 200 && res.body.data.status === targetStatus) {
        return res.body.data;
      }
      if (res.status === 200 && res.body.data.status === 'FAILED') {
        throw new Error(`Batch gagal: ${res.body.data.error_message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Timeout menunggu batch ${batchId} mencapai status ${targetStatus}`);
  };

  beforeAll(async () => {
    // Pastikan fixture tersedia
    expect(fs.existsSync(mainFixturePath)).toBe(true);
    expect(fs.existsSync(badHeaderFixturePath)).toBe(true);
    expect(fs.existsSync(cleanFixturePath)).toBe(true);

    // Bersihkan data alias uji terdahulu jika ada
    await db.query("DELETE FROM unit_aliases WHERE alias_name IN ('KLINIK SG SATELIT', 'TEST')");

    aktDya = await loginAs('dya@ptcn.id'); // Akuntansi
    mgrBudi = await loginAs('budi@ptcn.id'); // Manager (Unit 1 & 2)
    picRina = await loginAs('rina@ptcn.id'); // PIC (Unit 1 MCU saja)
  });

  afterAll(async () => {
    // Bersihkan batch uji dan alias uji
    if (createdBatchIds.length > 0) {
      await db.query('DELETE FROM import_batches WHERE id = ANY($1::int[])', [createdBatchIds]);
    }
    await db.query("DELETE FROM unit_aliases WHERE alias_name IN ('KLINIK SG SATELIT', 'TEST')");
  });

  describe('1. Validasi Unggah & Header File', () => {
    it('harus menolak request tanpa file dengan 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .field('company_code', 'CN');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/wajib diunggah/i);
    });

    it('harus menolak format file bukan .xlsx dengan 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .field('company_code', 'CN')
        .attach('file', Buffer.from('bukan excel'), 'test.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/tidak didukung/i);
    });

    it('harus menolak file dengan header wajib yang hilang dengan 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .field('company_code', 'CN')
        .attach('file', badHeaderFixturePath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Kolom header wajib tidak ditemukan/i);
      expect(res.body.message).toMatch(/ID SUB JURNAL/i);
      expect(res.body.message).toMatch(/KETERANGAN/i);
    });

    it('harus menolak mode import yang tidak valid dengan 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .field('company_code', 'CN')
        .field('mode', 'invalid_mode')
        .attach('file', cleanFixturePath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Mode import tidak valid/i);
    });
  });

  describe('2. Pemrosesan Streaming, Filtering & Deteksi Galat', () => {
    let batchId;

    it('harus menerima upload 200 baris dengan 202 Accepted dan menyelesaikan status PREVIEW', async () => {
      const res = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .field('company_code', 'CN')
        .field('mode', 'replace_month')
        .attach('file', mainFixturePath);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batch_id).toBeDefined();

      batchId = res.body.data.batch_id;
      createdBatchIds.push(batchId);

      // Tunggu streaming parser di latar belakang selesai
      const batchData = await waitForBatchStatus(batchId, 'PREVIEW');
      expect(batchData.status).toBe('PREVIEW');
      expect(batchData.rows_read).toBe(200);
      expect(batchData.rows_skipped).toBe(20); // 20 baris akun kas/non-biaya
      expect(batchData.rows_expense).toBe(160); // Akun 4.x & 5.x
      expect(batchData.rows_investment).toBe(20); // Akun 1.2.1.1.4 & 1.2.1.1.6
      expect(batchData.rows_used).toBe(180); // 160 expense + 20 investment
      expect(batchData.rows_without_unit).toBeGreaterThan(0);
      expect(batchData.period).toBe('2026-10');
    });

    it('harus mendeteksi daftar unmapped units pada batch', async () => {
      const res = await request(app)
        .get(`/api/realization-imports/${batchId}/unmapped-units`)
        .set('Cookie', aktDya.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const unmappedNames = res.body.data.map((u) => u.raw_unit);
      expect(unmappedNames).toContain('KLINIK SG SATELIT');
      expect(unmappedNames).toContain('UNIT FIKTIF TIDAK DIKENAL');
    });

    it('harus mencatat rincian galat (NO_UNIT, UNMAPPED_UNIT, UNMATCHED_ITEM)', async () => {
      const res = await request(app)
        .get(`/api/realization-imports/${batchId}/errors`)
        .set('Cookie', aktDya.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const errorTypes = res.body.data.map((e) => e.error_type);
      expect(errorTypes).toContain('NO_UNIT');
      expect(errorTypes).toContain('UNMAPPED_UNIT');
      expect(errorTypes).toContain('UNMATCHED_ITEM');
    });

    it('harus menolak konfirmasi dengan 409 Conflict saat masih ada unit tak terpetakan', async () => {
      const res = await request(app)
        .post(`/api/realization-imports/${batchId}/confirm`)
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Konfirmasi gagal: masih ada.*unit.*belum terpetakan/i);
    });

    it('harus dapat memetakan alias unit via PUT /api/unit-aliases dan memetakan ulang baris PREVIEW', async () => {
      // Petakan alias "KLINIK SG SATELIT" ke Unit ID 1 (MCU)
      const res = await request(app)
        .put('/api/unit-aliases')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .send({
          company_code: 'CN',
          alias_name: 'KLINIK SG SATELIT',
          unit_id: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.remapped_rows).toBe(10); // 10 baris KLINIK SG SATELIT di fixture
    });

    it('harus dapat melakukan rollback batch via DELETE /api/realization-imports/:id', async () => {
      const res = await request(app)
        .delete(`/api/realization-imports/${batchId}`)
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ROLLED_BACK');

      // Verifikasi baris jurnal dan error sudah terhapus
      const linesCheck = await db.query(
        'SELECT COUNT(*) AS total FROM journal_lines WHERE batch_id = $1',
        [batchId]
      );
      expect(parseInt(linesCheck.rows[0].total, 10)).toBe(0);

      const errCheck = await db.query(
        'SELECT COUNT(*) AS total FROM realization_errors WHERE batch_id = $1',
        [batchId]
      );
      expect(parseInt(errCheck.rows[0].total, 10)).toBe(0);
    });
  });

  describe('3. Konfirmasi Batch Bersih, Replace Month vs Append, dan Kalkulasi BR-05', () => {
    let cleanBatchId;

    it('harus berhasil mengimpor dan mengonfirmasi batch bersih tanpa unmapped unit', async () => {
      // 1. Upload clean fixture (10 baris, semua unit MCU [9910])
      const uploadRes = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .field('company_code', 'CN')
        .field('mode', 'replace_month')
        .attach('file', cleanFixturePath);

      expect(uploadRes.status).toBe(202);
      cleanBatchId = uploadRes.body.data.batch_id;
      createdBatchIds.push(cleanBatchId);

      const batchData = await waitForBatchStatus(cleanBatchId, 'PREVIEW');
      expect(batchData.rows_without_unit).toBe(0);

      // 2. Konfirmasi batch
      const confirmRes = await request(app)
        .post(`/api/realization-imports/${cleanBatchId}/confirm`)
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken);

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.status).toBe('CONFIRMED');

      // Verifikasi status baris jurnal menjadi CONFIRMED
      const linesCheck = await db.query(
        "SELECT COUNT(*) AS total FROM journal_lines WHERE batch_id = $1 AND status = 'CONFIRMED'",
        [cleanBatchId]
      );
      expect(parseInt(linesCheck.rows[0].total, 10)).toBe(50);
    });

    it('harus menghitung realisasi sesuai BR-05 (Biaya: DEBET - KREDIT, Aset Tetap: DEBET)', async () => {
      const res = await request(app)
        .get('/api/realizations?group_by=coa&start_month=2026-10&end_month=2026-10')
        .set('Cookie', aktDya.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Cari baris akun 5.2.4 (Biaya)
      const expenseLine = res.body.data.find((c) => c.coa_code === '5.2.4');
      expect(expenseLine).toBeDefined();
      // 25 baris x DEBET 100.000 = 2.500.000, 25 x KREDIT 20.000 = 500.000 -> Realisasi = 2.000.000
      expect(Number(expenseLine.total_debit)).toBe(2500000);
      expect(Number(expenseLine.total_credit)).toBe(500000);
      expect(Number(expenseLine.total_realization)).toBe(2000000);

      // Cari baris akun 1.2.1.1.4 (Aset Tetap)
      const assetLine = res.body.data.find((c) => c.coa_code === '1.2.1.1.4');
      expect(assetLine).toBeDefined();
      // 25 baris x DEBET 500.000 = 12.500.000, credit tidak mengurangi -> Realisasi = 12.500.000
      expect(Number(assetLine.total_debit)).toBe(12500000);
      expect(Number(assetLine.total_realization)).toBe(12500000);
    });

    it('harus melewati baris duplikat sub_journal_id pada mode append (BR-19)', async () => {
      // Upload kembali clean fixture tetapi dengan mode append
      const uploadRes = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .field('company_code', 'CN')
        .field('mode', 'append')
        .attach('file', cleanFixturePath);

      expect(uploadRes.status).toBe(202);
      const appendBatchId = uploadRes.body.data.batch_id;
      createdBatchIds.push(appendBatchId);

      await waitForBatchStatus(appendBatchId, 'PREVIEW');

      // Karena seluruh 10 sub_journal_id sudah ada di DB berstatus CONFIRMED,
      // mode append tidak menduplikasi baris ke journal_lines
      const appendLines = await db.query(
        'SELECT COUNT(*) AS total FROM journal_lines WHERE batch_id = $1',
        [appendBatchId]
      );
      expect(parseInt(appendLines.rows[0].total, 10)).toBe(0);
    });
  });

  describe('4. Otorisasi RBAC, Akses Unit & Audit Trail', () => {
    it('harus menolak PIC dan Manager untuk melakukan import dan konfirmasi (403 Forbidden)', async () => {
      // PIC Rina
      const picRes = await request(app)
        .post('/api/realization-imports')
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .field('company_code', 'CN')
        .attach('file', cleanFixturePath);

      expect(picRes.status).toBe(403);

      // Manager Budi
      const mgrRes = await request(app)
        .put('/api/unit-aliases')
        .set('Cookie', mgrBudi.cookie)
        .set('X-CSRF-Token', mgrBudi.csrfToken)
        .send({ company_code: 'CN', alias_name: 'TEST', unit_id: 1 });

      expect(mgrRes.status).toBe(403);
    });

    it('harus menerapkan filter unit di repository untuk PIC pada GET /api/realizations', async () => {
      // PIC Rina hanya memiliki akses ke Unit 1 (MCU)
      const picRes = await request(app)
        .get('/api/realizations?group_by=unit')
        .set('Cookie', picRina.cookie);

      expect(picRes.status).toBe(200);
      expect(picRes.body.success).toBe(true);

      const unitsInResult = picRes.body.data.map((u) => u.unit_id);
      expect(unitsInResult.every((id) => id === 1)).toBe(true);
    });

    it('harus mencatat mutasi pada audit_logs untuk konfirmasi dan alias unit', async () => {
      const logs = await db.query(
        "SELECT * FROM audit_logs WHERE action IN ('CONFIRM_REALIZATION', 'UPSERT_UNIT_ALIAS') ORDER BY created_at DESC LIMIT 5"
      );
      expect(logs.rows.length).toBeGreaterThan(0);
    });
  });
});
