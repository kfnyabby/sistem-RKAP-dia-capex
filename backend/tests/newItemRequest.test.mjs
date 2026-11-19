import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('New Item Request Test Suite (Fase 3b - BR-17, BR-18, FR-B9, FR-M13)', () => {
  let picRina; // PIC unit 1
  let mgrBudi; // Manager unit 1 & 2
  let aktDya; // Akuntansi (all units)

  let testPeriodId; // Periode terisolasi khusus tes ini (Tahun 2099)
  let testUnit1Id = 1; // Unit 1 (MCU - accessible by Rina)
  let testUnit2Id = 2; // Unit 2 (Laboratorium - accessible by Budi, NOT Rina)
  let testDocUnit1Id;
  let testDocUnit2Id;
  let testCoaId;

  const createdItemCodes = [];
  const createdRequestIds = [];

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
    // 1. Login user
    picRina = await loginAs('rina@ptcn.id');
    mgrBudi = await loginAs('budi@ptcn.id');
    aktDya = await loginAs('dya@ptcn.id');

    // 2. Ambil COA biaya dari database
    const coaRes = await db.query(
      "SELECT id, code FROM coas WHERE category = 'biaya' ORDER BY id ASC LIMIT 1"
    );
    testCoaId = coaRes.rows[0].id;

    // 3. Buat periode terisolasi untuk tes ini (2099) agar tidak bertabrakan dengan expense.test.mjs
    const periodRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state)
       VALUES (1, 2099, 'PENGISIAN', NOW() + INTERVAL '30 days', NOW() + INTERVAL '60 days', NOW() + INTERVAL '90 days', 'BUKA')
       ON CONFLICT (company_id, year) DO UPDATE SET status = 'PENGISIAN'
       RETURNING id`
    );
    testPeriodId = periodRes.rows[0].id;

    // 4. Pastikan ada dokumen anggaran untuk Unit 1 berstatus DRAFT
    const existingDoc1 = await db.query(
      "SELECT id FROM budget_docs WHERE unit_id = $1 AND period_id = $2 AND type = 'BIAYA'",
      [testUnit1Id, testPeriodId]
    );
    if (existingDoc1.rows.length > 0) {
      testDocUnit1Id = existingDoc1.rows[0].id;
      await db.query("UPDATE budget_docs SET status = 'DRAFT' WHERE id = $1", [testDocUnit1Id]);
    } else {
      const doc1Res = await request(app)
        .post('/api/budget-docs')
        .set('Cookie', picRina.cookie)
        .set('X-CSRF-Token', picRina.csrfToken)
        .send({
          unit_id: testUnit1Id,
          period_id: testPeriodId,
          type: 'BIAYA',
        });
      testDocUnit1Id = doc1Res.body.doc_id || doc1Res.body.id;
    }

    // 5. Pastikan ada dokumen anggaran untuk Unit 2 berstatus DRAFT
    const existingDoc2 = await db.query(
      "SELECT id FROM budget_docs WHERE unit_id = $1 AND period_id = $2 AND type = 'BIAYA'",
      [testUnit2Id, testPeriodId]
    );
    if (existingDoc2.rows.length > 0) {
      testDocUnit2Id = existingDoc2.rows[0].id;
      await db.query("UPDATE budget_docs SET status = 'DRAFT' WHERE id = $1", [testDocUnit2Id]);
    } else {
      const doc2Res = await request(app)
        .post('/api/budget-docs')
        .set('Cookie', mgrBudi.cookie)
        .set('X-CSRF-Token', mgrBudi.csrfToken)
        .send({
          unit_id: testUnit2Id,
          period_id: testPeriodId,
          type: 'BIAYA',
        });
      testDocUnit2Id = doc2Res.body.doc_id || doc2Res.body.id;
    }
  });

  afterAll(async () => {
    // Bersihkan data uji
    if (createdRequestIds.length > 0) {
      await db.query('DELETE FROM new_item_requests WHERE id = ANY($1::int[])', [
        createdRequestIds,
      ]);
    }
    if (createdItemCodes.length > 0) {
      await db.query(
        'DELETE FROM expense_lines WHERE item_id IN (SELECT id FROM items WHERE code = ANY($1::text[]))',
        [createdItemCodes]
      );
      await db.query(
        'DELETE FROM item_price_history WHERE item_id IN (SELECT id FROM items WHERE code = ANY($1::text[]))',
        [createdItemCodes]
      );
      await db.query(
        'DELETE FROM item_prices WHERE item_id IN (SELECT id FROM items WHERE code = ANY($1::text[]))',
        [createdItemCodes]
      );
      await db.query('DELETE FROM items WHERE code = ANY($1::text[])', [createdItemCodes]);
    }

    // Bersihkan dokumen anggaran dan periode uji 2099
    if (testPeriodId) {
      await db.query('DELETE FROM budget_docs WHERE period_id = $1', [testPeriodId]);
      await db.query('DELETE FROM periods WHERE id = $1', [testPeriodId]);
    }
  });

  it('1. PIC berhasil membuat draft permintaan barang baru', async () => {
    const res = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/new-item-requests`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        name: 'Stetoskop Digital Pro',
        spec: 'Bluetooth 5.0, Noise cancelling 40dB',
        uom: 'Unit',
        qty: 2,
        est_price: 3500000,
        reason: 'Penggantian alat MCU lama yang rusak',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('Stetoskop Digital Pro');
    expect(res.body.data.qty).toBe(2);
    expect(res.body.data.est_price).toBe(3500000);
    expect(res.body.data.amount).toBe(7000000);
    expect(res.body.data.status).toBe('DRAFT');

    createdRequestIds.push(res.body.data.id);
  });

  it('2. PIC dapat mengubah dan menghapus permintaan saat masih status DRAFT', async () => {
    // Buat draft dummy untuk diubah dan dihapus
    const createRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/new-item-requests`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        name: 'Draft Hapus',
        uom: 'Box',
        qty: 5,
        est_price: 10000,
      });
    expect(createRes.status).toBe(201);
    const dummyId = createRes.body.data.id;
    createdRequestIds.push(dummyId);

    // Update draft
    const updateRes = await request(app)
      .put(`/api/new-item-requests/${dummyId}`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        name: 'Draft Diubah',
        qty: 10,
        est_price: 15000,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Draft Diubah');
    expect(updateRes.body.data.qty).toBe(10);
    expect(updateRes.body.data.amount).toBe(150000);

    // Delete draft
    const deleteRes = await request(app)
      .delete(`/api/new-item-requests/${dummyId}`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Pastikan tidak ada lagi
    const verifyRes = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}/new-item-requests`)
      .set('Cookie', picRina.cookie);

    const exists = verifyRes.body.data.some((r) => r.id === dummyId);
    expect(exists).toBe(false);
  });

  it('3. Isolasi unit: PIC Rina ditolak saat melihat permintaan unit 2 yang bukan wewenangnya', async () => {
    const res = await request(app)
      .get(`/api/budget-docs/${testDocUnit2Id}/new-item-requests`)
      .set('Cookie', picRina.cookie);

    expect([403, 404]).toContain(res.status);
  });

  it('4. PIC berhasil mengirimkan permintaan (DRAFT -> MENUNGGU_COA) dan notifikasi terbuat', async () => {
    const draftId = createdRequestIds[0];

    const sendRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/new-item-requests/send`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        request_ids: [draftId],
      });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.success).toBe(true);

    // Verifikasi status berubah menjadi MENUNGGU_COA
    const listRes = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}/new-item-requests`)
      .set('Cookie', picRina.cookie);

    const reqItem = listRes.body.data.find((r) => r.id === draftId);
    expect(reqItem).toBeDefined();
    expect(reqItem.status).toBe('MENUNGGU_COA');

    // Verifikasi ada notifikasi masuk ke Akuntansi (Dya)
    const aktId = aktDya.user.user_id || aktDya.user.id;
    const notifRes = await db.query(
      "SELECT * FROM notifications WHERE user_id = $1 AND title ILIKE '%Permintaan Barang Baru%'",
      [aktId]
    );
    expect(notifRes.rows.length).toBeGreaterThan(0);
  });

  it('5. Permintaan yang sudah dikirim (MENUNGGU_COA) tidak dapat diubah atau dihapus oleh PIC', async () => {
    const draftId = createdRequestIds[0];

    // Coba edit
    const editRes = await request(app)
      .put(`/api/new-item-requests/${draftId}`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        name: 'Coba Ubah Saat Menunggu',
      });
    expect([400, 403]).toContain(editRes.status);

    // Coba delete
    const delRes = await request(app)
      .delete(`/api/new-item-requests/${draftId}`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken);
    expect([400, 403]).toContain(delRes.status);
  });

  it('6. RBAC: PIC tidak berwenang melihat antrean Akuntansi atau menentukan COA (BR-18)', async () => {
    const draftId = createdRequestIds[0];

    // PIC coba buka antrean queue
    const queueRes = await request(app)
      .get('/api/new-item-requests/queue')
      .set('Cookie', picRina.cookie);
    expect(queueRes.status).toBe(403);

    // PIC coba assign COA
    const assignRes = await request(app)
      .post(`/api/new-item-requests/${draftId}/assign-coa`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        coa_id: testCoaId,
      });
    expect(assignRes.status).toBe(403);
  });

  it('7. Akuntansi melihat antrean penentuan COA', async () => {
    const res = await request(app)
      .get('/api/new-item-requests/queue')
      .set('Cookie', aktDya.cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const found = res.body.data.some((r) => r.id === createdRequestIds[0]);
    expect(found).toBe(true);
  });

  it('8. Akuntansi menentukan COA: barang dibuat di master, harga diset, dan baris masuk ke dokumen (BR-17 & BR-18)', async () => {
    const reqId = createdRequestIds[0];

    // Dapatkan total dokumen sebelum assign COA
    const docBefore = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}`)
      .set('Cookie', picRina.cookie);
    const initialTotal = docBefore.body.data.total_amount;

    // Akuntansi menetapkan COA
    const assignRes = await request(app)
      .post(`/api/new-item-requests/${reqId}/assign-coa`)
      .set('Cookie', aktDya.cookie)
      .set('X-CSRF-Token', aktDya.csrfToken)
      .send({
        coa_id: testCoaId,
        item_code: `TEST-NEW-${Date.now()}`,
        price: 3600000, // Akuntansi dapat mengoreksi/menetapkan harga final
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.request.status).toBe('COA_DITENTUKAN');
    expect(assignRes.body.data.request.assigned_coa_id).toBe(testCoaId);
    expect(assignRes.body.data.line_added_to_doc).toBe(true);

    const newItem = assignRes.body.data.item;
    createdItemCodes.push(newItem.code);

    // 1. Verifikasi barang muncul di master items
    const itemInDb = await db.query('SELECT * FROM items WHERE id = $1', [newItem.id]);
    expect(itemInDb.rows.length).toBe(1);
    expect(itemInDb.rows[0].coa_id).toBe(testCoaId);

    // 2. Verifikasi harga perusahaan tercatat di item_prices & item_price_history
    const priceInDb = await db.query('SELECT * FROM item_prices WHERE item_id = $1', [newItem.id]);
    expect(priceInDb.rows.length).toBeGreaterThan(0);
    expect(parseInt(priceInDb.rows[0].price, 10)).toBe(3600000);

    const histInDb = await db.query(
      'SELECT * FROM item_price_history WHERE item_id = $1',
      [newItem.id]
    );
    expect(histInDb.rows.length).toBeGreaterThan(0);
    expect(histInDb.rows[0].source).toBe('manual');

    // 3. Verifikasi baris otomatis masuk ke expense_lines dokumen anggaran (BR-17)
    const linesRes = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}/expense-lines`)
      .set('Cookie', picRina.cookie);

    const addedLine = linesRes.body.data.find((l) => l.item_id === newItem.id);
    expect(addedLine).toBeDefined();
    expect(addedLine.qty).toBe(2);
    expect(addedLine.price).toBe(3600000);
    expect(addedLine.amount).toBe(7200000);

    // 4. Verifikasi total dokumen ter-rekalkulasi (BR-17)
    const docAfter = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}`)
      .set('Cookie', picRina.cookie);
    expect(docAfter.body.data.total_amount).toBe(initialTotal + 7200000);

    // 5. Verifikasi seluruh mutasi tercatat di audit log
    const auditRes = await db.query(
      "SELECT * FROM audit_logs WHERE entity = 'new_item_requests' AND entity_id = $1",
      [reqId]
    );
    expect(auditRes.rows.length).toBeGreaterThanOrEqual(3); // CREATE_DRAFT, SEND_REQUEST, ASSIGN_COA
  });
});
