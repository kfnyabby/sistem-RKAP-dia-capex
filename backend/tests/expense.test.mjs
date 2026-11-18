import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Expense Budget Test Suite (Fase 3)', () => {
  let picRina;
  let mgrBudi;
  let aktDya;

  let testCoa1Id;
  let testCoa2Id;
  let testPeriodId = 1; // Seed CN 2027
  let testUnit1Id = 1; // Seed CN unit 1 (MCU - accessible by Rina & Budi)
  let testUnit2Id = 2; // Seed CN unit 2 (Laboratorium - accessible by Budi, NOT Rina)
  let testUnit3Id = 3; // Seed CN unit 3 (Rawat Inap 1 - neither Rina nor Budi has access)
  let testDocUnit1Id;
  let testDocUnit2Id;

  const testItemIds = [];
  let noPriceItemId;

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
      cookie: loginRes.headers['set-cookie'],
      csrfToken: loginRes.body.csrf_token,
      user: loginRes.body.user,
    };
  };

  beforeAll(async () => {
    // 1. Dapatkan COA yang ada di seed
    const coaRes = await db.query(
      'SELECT id, code FROM coas WHERE category = $1 ORDER BY id ASC LIMIT 2',
      ['biaya']
    );
    testCoa1Id = coaRes.rows[0].id;
    testCoa2Id = coaRes.rows[1].id;

    // 2. Buat 100 barang uji (50 di COA 1, 50 di COA 2)
    for (let i = 1; i <= 100; i++) {
      const pad = String(i).padStart(3, '0');
      const coaId = i <= 50 ? testCoa1Id : testCoa2Id;
      const code = `TEST-EXP-${pad}`;
      const name = `Barang Uji Exp ${pad}`;

      const itemRes = await db.query(
        `INSERT INTO items (code, name, uom, coa_id, is_active)
         VALUES ($1, $2, 'Pcs', $3, TRUE)
         ON CONFLICT (code) DO UPDATE SET coa_id = EXCLUDED.coa_id
         RETURNING id`,
        [code, name, coaId]
      );
      const itemId = itemRes.rows[0].id;
      testItemIds.push({
        id: itemId,
        code,
        name,
        coaId,
        price: i <= 50 ? 10000 : 25000,
        qty: i <= 50 ? 2 : 4,
      });

      // Masukkan harga master di item_prices
      await db.query(
        `INSERT INTO item_prices (item_id, company_id, price)
         VALUES ($1, 1, $2)
         ON CONFLICT (item_id, company_id) DO UPDATE SET price = EXCLUDED.price`,
        [itemId, i <= 50 ? 10000 : 25000]
      );
    }

    // 3. Buat barang tanpa harga (HPP = 0 atau belum ada di item_prices)
    const noPriceRes = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ('TEST-EXP-NOPRICE', 'Barang Tanpa Harga', 'Pcs', $1, TRUE)
       ON CONFLICT (code) DO UPDATE SET is_active = TRUE
       RETURNING id`,
      [testCoa1Id]
    );
    noPriceItemId = noPriceRes.rows[0].id;

    // Pastikan tidak ada harga aktif > 0 untuk item ini
    await db.query(
      'DELETE FROM item_prices WHERE item_id = $1 AND company_id = 1',
      [noPriceItemId]
    );

    // Login users
    picRina = await loginAs('rina@ptcn.id');
    mgrBudi = await loginAs('budi@ptcn.id');
    aktDya = await loginAs('dya@ptcn.id');
  });

  afterAll(async () => {
    try {
      // Hapus dokumen dan baris biaya uji spesifik
      if (testDocUnit1Id) {
        await db.query('DELETE FROM budget_docs WHERE id = $1', [testDocUnit1Id]);
      }
      if (testDocUnit2Id) {
        await db.query('DELETE FROM budget_docs WHERE id = $1', [testDocUnit2Id]);
      }

      // Hapus barang uji dan harganya
      await db.query("DELETE FROM items WHERE code LIKE 'TEST-EXP-%'");

      // Hapus audit log uji
      await db.query("DELETE FROM audit_logs WHERE entity = 'expense_lines'");
    } catch (err) {
      console.error('Error during expense test cleanup:', err.message);
    }
  });

  describe('1. Endpoint Periode (/api/periods)', () => {
    it('Semua pengguna terautentikasi dapat membaca daftar periode', async () => {
      const res = await request(app)
        .get('/api/periods')
        .set('Cookie', picRina.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('year');
      expect(res.body[0]).toHaveProperty('status');
    });

    it('PIC ditolak (403) saat mencoba membuat periode baru', async () => {
      const res = await request(app)
        .post('/api/periods')
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          company_id: 1,
          year: 2029,
          fill_deadline: '2028-11-15',
          review_deadline: '2028-11-30',
        });

      expect(res.status).toBe(403);
    });

    it('Akuntansi dapat membuat periode baru dan menolak duplikasi (409)', async () => {
      // 1. Buat periode 2030 oleh Akuntansi
      const createRes = await request(app)
        .post('/api/periods')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .send({
          company_id: 1,
          year: 2030,
          fill_deadline: '2029-11-15',
          review_deadline: '2029-11-30',
          lock_date: '2029-12-05',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toHaveProperty('period_id');
      const newPeriodId = createRes.body.period_id;

      // 2. Coba buat periode yang sama persis -> 409
      const dupRes = await request(app)
        .post('/api/periods')
        .set('Cookie', aktDya.cookie)
        .set('X-CSRF-Token', aktDya.csrfToken)
        .send({
          company_id: 1,
          year: 2030,
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.message).toMatch(/sudah ada/i);

      // Bersihkan periode uji
      await db.query('DELETE FROM periods WHERE id = $1', [newPeriodId]);
    });
  });

  describe('2. Endpoint Dokumen Anggaran (/api/budget-docs)', () => {
    it('PIC Rina dapat membuat dokumen anggaran BIAYA untuk unit miliknya (Unit 1)', async () => {
      // Bersihkan jika ada dokumen lama
      await db.query(
        'DELETE FROM budget_docs WHERE period_id = $1 AND unit_id = $2 AND type = $3',
        [testPeriodId, testUnit1Id, 'BIAYA']
      );

      const res = await request(app)
        .post('/api/budget-docs')
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          period_id: testPeriodId,
          unit_id: testUnit1Id,
          type: 'BIAYA',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('doc_id');
      expect(res.body.status).toBe('DRAFT');
      testDocUnit1Id = res.body.doc_id;
    });

    it('Membuat dokumen ganda untuk periode, unit, dan jenis yang sama ditolak (409)', async () => {
      const res = await request(app)
        .post('/api/budget-docs')
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          period_id: testPeriodId,
          unit_id: testUnit1Id,
          type: 'BIAYA',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/sudah ada/i);
    });

    it('PIC Rina ditolak (403) saat mencoba membuat dokumen untuk unit yang tidak ditugaskan (Unit 2)', async () => {
      const res = await request(app)
        .post('/api/budget-docs')
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          period_id: testPeriodId,
          unit_id: testUnit2Id,
          type: 'BIAYA',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/akses ditolak/i);
    });

    it('Manager Budi dapat membuat dokumen untuk Unit 2 (Laboratorium)', async () => {
      await db.query(
        'DELETE FROM budget_docs WHERE period_id = $1 AND unit_id = $2 AND type = $3',
        [testPeriodId, testUnit2Id, 'BIAYA']
      );

      const res = await request(app)
        .post('/api/budget-docs')
        .set('Cookie', mgrBudi.cookie)
        .set('X-CSRF-Token', mgrBudi.csrfToken)
        .send({
          period_id: testPeriodId,
          unit_id: testUnit2Id,
          type: 'BIAYA',
        });

      expect(res.status).toBe(201);
      testDocUnit2Id = res.body.doc_id;
    });

    it('Manager Budi ditolak (403) saat mencoba membuat dokumen untuk Unit 3 (bukan cakupannya)', async () => {
      const res = await request(app)
        .post('/api/budget-docs')
        .set('Cookie', mgrBudi.cookie)
        .set('X-CSRF-Token', mgrBudi.csrfToken)
        .send({
          period_id: testPeriodId,
          unit_id: testUnit3Id,
          type: 'BIAYA',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('3. Bulk Upsert Baris Biaya & Akurasi Agregasi 100 Baris', () => {
    it('Menyimpan 100 baris biaya dan memverifikasi kalkulasi total per COA serta total unit secara tepat', async () => {
      // 50 item @ Rp 10.000 x 2 = Rp 20.000 (total COA 1 = Rp 1.000.000)
      // 50 item @ Rp 25.000 x 4 = Rp 100.000 (total COA 2 = Rp 5.000.000)
      // Grand Total = Rp 6.000.000
      const linesPayload = testItemIds.map((item) => ({
        item_id: item.id,
        qty: item.qty,
        note: `Justifikasi item ${item.code}`,
      }));

      const putRes = await request(app)
        .put(`/api/budget-docs/${testDocUnit1Id}/expense-lines`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({ lines: linesPayload });

      expect(putRes.status).toBe(200);
      expect(putRes.body.saved).toBe(100);
      expect(putRes.body.total_amount).toBe(6000000);

      // Verifikasi detail dokumen via GET /api/budget-docs/:id
      const getDocRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}`)
        .set('Cookie', picRina.cookie);

      expect(getDocRes.status).toBe(200);
      expect(getDocRes.body.total_amount).toBe(6000000);
      expect(Array.isArray(getDocRes.body.totals_by_coa)).toBe(true);
      expect(getDocRes.body.totals_by_coa.length).toBe(2);

      const coa1Summary = getDocRes.body.totals_by_coa.find((c) => c.coa_id === testCoa1Id);
      const coa2Summary = getDocRes.body.totals_by_coa.find((c) => c.coa_id === testCoa2Id);

      expect(coa1Summary).toBeDefined();
      expect(coa1Summary.amount).toBe(1000000);

      expect(coa2Summary).toBeDefined();
      expect(coa2Summary.amount).toBe(5000000);
    });

    it('Filter pada GET /api/budget-docs/:id/expense-lines berjalan akurat (hanya yang terisi & cari)', async () => {
      // 1. Filter cari barang spesifik
      const searchRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}/expense-lines?search=042`)
        .set('Cookie', picRina.cookie);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBe(1);
      expect(searchRes.body.data[0].item_code).toBe('TEST-EXP-042');

      // 2. Filter coa_id
      const coaRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}/expense-lines?coa_id=${testCoa1Id}&per_page=100`)
        .set('Cookie', picRina.cookie);

      expect(coaRes.status).toBe(200);
      expect(coaRes.body.data.length).toBe(50);
      coaRes.body.data.forEach((line) => {
        expect(line.coa_id).toBe(testCoa1Id);
      });
    });
  });

  describe('4. Snapshot Harga Immutability (BR-03)', () => {
    it('Harga snapshot tetap saat harga master di item_prices diubah', async () => {
      const targetItem = testItemIds[0]; // TEST-EXP-001, initial price 10.000

      // Ubah harga master menjadi Rp 999.000 di item_prices
      await db.query(
        'UPDATE item_prices SET price = 999000 WHERE item_id = $1 AND company_id = 1',
        [targetItem.id]
      );

      // Baca baris biaya di dokumen via API
      const linesRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}/expense-lines?search=${targetItem.code}`)
        .set('Cookie', picRina.cookie);

      expect(linesRes.status).toBe(200);
      expect(linesRes.body.data.length).toBe(1);

      const line = linesRes.body.data[0];
      // Harga snapshot tetap 10.000, jumlah tetap 20.000
      expect(line.price).toBe(10000);
      expect(line.amount).toBe(20000);

      // Verifikasi grand total dokumen tetap Rp 6.000.000
      const docRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}`)
        .set('Cookie', picRina.cookie);

      expect(docRes.status).toBe(200);
      expect(docRes.body.total_amount).toBe(6000000);
    });

    it('POST /api/budget-docs/:id/refresh-prices memperbarui price_snapshot dengan harga master terbaru dan menghitung ulang jumlah', async () => {
      const targetItem = testItemIds[0]; // TEST-EXP-001, harga master sudah 999.000

      // Eksekusi refresh-prices
      const refreshRes = await request(app)
        .post(`/api/budget-docs/${testDocUnit1Id}/refresh-prices`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.updated_lines).toBe(1);

      // Verifikasi price_snapshot kini berubah menjadi 999.000 dan amount menjadi 1.998.000
      const linesRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}/expense-lines?search=${targetItem.code}`)
        .set('Cookie', picRina.cookie);

      expect(linesRes.status).toBe(200);
      const line = linesRes.body.data[0];
      expect(line.price).toBe(999000);
      expect(line.amount).toBe(1998000);

      // Verifikasi total dokumen baru = 6.000.000 - 20.000 + 1.998.000 = 7.978.000
      const docRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}`)
        .set('Cookie', picRina.cookie);

      expect(docRes.status).toBe(200);
      expect(docRes.body.total_amount).toBe(7978000);

      // Verifikasi catatan audit log
      const auditRes = await db.query(
        "SELECT * FROM audit_logs WHERE entity = 'budget_docs' AND entity_id = $1 AND action = 'REFRESH_DOC_PRICES' ORDER BY id DESC LIMIT 1",
        [testDocUnit1Id]
      );
      expect(auditRes.rows.length).toBe(1);

      // Kembalikan harga master item 0 kembali ke 10.000 dan refresh kembali agar total kembali ke 6.000.000
      await db.query(
        'UPDATE item_prices SET price = 10000 WHERE item_id = $1 AND company_id = 1',
        [targetItem.id]
      );
      await request(app)
        .post(`/api/budget-docs/${testDocUnit1Id}/refresh-prices`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken);
    });

    it('POST /api/budget-docs/:id/refresh-prices menolak jika user tidak memiliki akses unit atau dokumen bukan DRAFT', async () => {
      // 1. PIC Rina mencoba me-refresh dokumen Unit 2 (Laboratorium) -> 403 Forbidden
      const unauthorizedRes = await request(app)
        .post(`/api/budget-docs/${testDocUnit2Id}/refresh-prices`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken);

      expect(unauthorizedRes.status).toBe(403);
      expect(unauthorizedRes.body.message).toMatch(/akses ditolak/i);

      // 2. Dokumen berstatus selain DRAFT (misal: FINAL) ditolak (403)
      await db.query("UPDATE budget_docs SET status = 'FINAL' WHERE id = $1", [testDocUnit1Id]);

      const notDraftRes = await request(app)
        .post(`/api/budget-docs/${testDocUnit1Id}/refresh-prices`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken);

      expect(notDraftRes.status).toBe(403);
      expect(notDraftRes.body.message).toMatch(/tidak dapat diubah pada status FINAL/i);

      // Kembalikan status dokumen ke DRAFT
      await db.query("UPDATE budget_docs SET status = 'DRAFT' WHERE id = $1", [testDocUnit1Id]);
    });
  });

  describe('5. Optimistic Locking & Validasi Integritas', () => {
    it('Bentrok versi ditolak dengan status 409 dan pesan jelas', async () => {
      const targetItem = testItemIds[1]; // TEST-EXP-002

      // Ambil versi saat ini dari database
      const lineRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}/expense-lines?search=${targetItem.code}`)
        .set('Cookie', picRina.cookie);

      expect(lineRes.status).toBe(200);
      const currentLine = lineRes.body.data[0];

      // Kirim versi lama (misal: currentLine.version + 999)
      const conflictRes = await request(app)
        .put(`/api/budget-docs/${testDocUnit1Id}/expense-lines`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          lines: [
            {
              id: currentLine.id,
              item_id: currentLine.item_id,
              qty: 15,
              version: currentLine.version + 999, // Stale version
            },
          ],
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.message).toMatch(/telah diubah oleh sesi lain/i);
      expect(conflictRes.body.message).toContain(targetItem.name);
    });

    it('Barang tanpa harga master ditolak dengan status 422', async () => {
      const res = await request(app)
        .put(`/api/budget-docs/${testDocUnit1Id}/expense-lines`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          lines: [
            {
              item_id: noPriceItemId,
              qty: 5,
            },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/belum memiliki harga/i);
    });
  });

  describe('6. Otorisasi Akses Lintas Unit (Gagal Tertutup 403)', () => {
    it('PIC Rina ditolak (403) saat mencoba membaca dokumen Unit 2 lewat ID', async () => {
      const res = await request(app)
        .get(`/api/budget-docs/${testDocUnit2Id}`)
        .set('Cookie', picRina.cookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/akses ditolak/i);
    });

    it('PIC Rina ditolak (403) saat mencoba membaca baris biaya Unit 2', async () => {
      const res = await request(app)
        .get(`/api/budget-docs/${testDocUnit2Id}/expense-lines`)
        .set('Cookie', picRina.cookie);

      expect(res.status).toBe(403);
    });

    it('PIC Rina ditolak (403) saat mencoba mengubah baris biaya Unit 2', async () => {
      const res = await request(app)
        .put(`/api/budget-docs/${testDocUnit2Id}/expense-lines`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          lines: [{ item_id: testItemIds[0].id, qty: 5 }],
        });

      expect(res.status).toBe(403);
    });

    it('Manager Budi (memiliki akses Unit 2) diizinkan membaca dokumen Unit 2', async () => {
      const res = await request(app)
        .get(`/api/budget-docs/${testDocUnit2Id}`)
        .set('Cookie', mgrBudi.cookie);

      expect(res.status).toBe(200);
      expect(res.body.unit_id).toBe(testUnit2Id);
    });
  });

  describe('7. Tambah dari Master & Hapus Baris Biaya', () => {
    it('GET /api/items?available_for_doc mengecualikan barang yang sudah ada di dokumen', async () => {
      const res = await request(app)
        .get(`/api/items?available_for_doc=${testDocUnit1Id}`)
        .set('Cookie', picRina.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Pastikan item yang sudah ada di dokumen (100 barang) tidak muncul
      const existingIds = new Set(testItemIds.map((i) => i.id));
      res.body.data.forEach((item) => {
        expect(existingIds.has(item.id)).toBe(false);
      });
    });

    it('DELETE /api/expense-lines/:id menghapus baris dan merekrasi total dokumen', async () => {
      // Ambil satu baris dari dokumen unit 1
      const linesRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}/expense-lines?search=001`)
        .set('Cookie', picRina.cookie);

      const targetLine = linesRes.body.data[0];
      const deletedAmount = targetLine.amount; // 20.000

      // Hapus baris
      const delRes = await request(app)
        .delete(`/api/expense-lines/${targetLine.id}`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken);

      expect(delRes.status).toBe(200);
      expect(delRes.body.message).toMatch(/deleted/i);

      // Verifikasi grand total berkurang tepat sebesar amount yang dihapus (6.000.000 - 20.000 = 5.980.000)
      const docRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit1Id}`)
        .set('Cookie', picRina.cookie);

      expect(docRes.status).toBe(200);
      expect(docRes.body.total_amount).toBe(6000000 - deletedAmount);
    });

    it('PIC Rina ditolak (403) saat mencoba menghapus baris pada dokumen Unit 2', async () => {
      // Buat satu baris di Unit 2 oleh Manager Budi
      const addRes = await request(app)
        .put(`/api/budget-docs/${testDocUnit2Id}/expense-lines`)
        .set('Cookie', mgrBudi.cookie)
        .set('X-CSRF-Token', mgrBudi.csrfToken)
        .send({
          lines: [{ item_id: testItemIds[10].id, qty: 1 }],
        });
      expect(addRes.status).toBe(200);

      const listRes = await request(app)
        .get(`/api/budget-docs/${testDocUnit2Id}/expense-lines`)
        .set('Cookie', mgrBudi.cookie);
      const lineUnit2 = listRes.body.data[0];

      // PIC Rina mencoba menghapus baris Unit 2
      const delRes = await request(app)
        .delete(`/api/expense-lines/${lineUnit2.id}`)
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken);

      expect(delRes.status).toBe(403);
    });
  });

  describe('8. Integritas Catatan Jejak Audit (AuditService)', () => {
    it('Setiap mutasi (pembuatan dokumen, simpan baris, hapus baris) tercatat di audit_logs', async () => {
      const logsRes = await db.query(
        `SELECT action FROM audit_logs 
         WHERE entity IN ('budget_docs', 'expense_lines') 
         ORDER BY id DESC LIMIT 20`
      );

      const actions = logsRes.rows.map((r) => r.action);
      expect(actions).toContain('CREATE_BUDGET_DOC');
      expect(actions).toContain('SAVE_EXPENSE_LINES');
      expect(actions).toContain('DELETE_EXPENSE_LINE');
    });
  });
});
