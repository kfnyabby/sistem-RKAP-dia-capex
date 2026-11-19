import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Investment Budget Test Suite (Fase 4 - BR-01, BR-15, BR-16, FR-I1 s.d. FR-I7)', () => {
  let picRina; // PIC unit 1
  let mgrBudi; // Manager unit 1 & 2
  let aktDya; // Akuntansi (all units)

  let testPeriodId; // Periode terisolasi khusus tes ini (Tahun 2098)
  let testUnit1Id = 1; // Unit 1 (MCU - accessible by Rina)
  let testUnit2Id = 2; // Unit 2 (Laboratorium - accessible by Budi, NOT Rina)
  let testDocUnit1Id;
  let testDocUnit2Id;

  let catMedisId; // Peralatan Medis (useful life 60)
  let catBangunanId; // Bangunan (useful life 120 / no depreciation coa)
  let catLaptopId; // PC/Laptop (useful life 60)
  let priorityStrategicId;

  const createdLineIds = [];

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

    // 2. Ambil master kategori investasi
    const catRes = await db.query(
      'SELECT id, name, useful_life_months FROM investment_categories ORDER BY id ASC'
    );
    const catMedis = catRes.rows.find((c) => c.name.toUpperCase().includes('MEDIS'));
    const catBangunan = catRes.rows.find((c) => c.name.toUpperCase().includes('BANGUNAN'));
    const catLaptop = catRes.rows.find((c) => c.name.toUpperCase().includes('PC'));

    catMedisId = catMedis.id;
    catBangunanId = catBangunan.id;
    catLaptopId = catLaptop.id;

    // 3. Ambil prioritas
    const prioRes = await db.query('SELECT id, name FROM priorities LIMIT 1');
    priorityStrategicId = prioRes.rows[0].id;

    // 4. Buat periode terisolasi tahun 2098
    const periodRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state)
       VALUES (1, 2098, 'PENGISIAN', NOW() + INTERVAL '30 days', NOW() + INTERVAL '60 days', NOW() + INTERVAL '90 days', 'BUKA')
       ON CONFLICT (company_id, year) DO UPDATE SET status = 'PENGISIAN'
       RETURNING id`
    );
    testPeriodId = periodRes.rows[0].id;

    // 5. Buat dokumen anggaran INVESTASI untuk Unit 1
    const doc1Res = await request(app)
      .post('/api/budget-docs')
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        unit_id: testUnit1Id,
        period_id: testPeriodId,
        type: 'INVESTASI',
      });
    testDocUnit1Id = doc1Res.body.doc_id || doc1Res.body.id || doc1Res.body.data?.id;

    // 6. Buat dokumen anggaran INVESTASI untuk Unit 2
    const doc2Res = await request(app)
      .post('/api/budget-docs')
      .set('Cookie', mgrBudi.cookie)
      .set('X-CSRF-Token', mgrBudi.csrfToken)
      .send({
        unit_id: testUnit2Id,
        period_id: testPeriodId,
        type: 'INVESTASI',
      });
    testDocUnit2Id = doc2Res.body.doc_id || doc2Res.body.id || doc2Res.body.data?.id;
  });

  afterAll(async () => {
    // 1. Bersihkan baris investasi uji
    if (createdLineIds.length > 0) {
      await db.query('DELETE FROM investment_lines WHERE id = ANY($1::int[])', [createdLineIds]);
    }

    // 2. Bersihkan dokumen anggaran dan periode uji 2098
    if (testPeriodId) {
      await db.query('DELETE FROM budget_docs WHERE period_id = $1', [testPeriodId]);
      await db.query('DELETE FROM periods WHERE id = $1', [testPeriodId]);
    }

    // 3. Pastikan setting investment_threshold_basis dikembalikan ke unit_price
    await db.query(
      "UPDATE settings SET value = '\"unit_price\"' WHERE key = 'investment_threshold_basis'"
    );
  });

  it('1. Rumus Penyusutan Otomatis (BR-16): 185.000.000 / 60 * (12 - 4) = 24.666.667', async () => {
    const res = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catMedisId, // Masa manfaat 60 bulan
        priority_id: priorityStrategicId,
        name: 'USG 4D Live Doppler',
        qty: 1,
        price: 185000000,
        plan_month: 4, // Bulan April (12 - 4 = 8 bulan penyusutan)
        strategic_objective: 'Peningkatan akurasi diagnosa poli obgyn',
        kpi: 'Waktu tunggu USG turun 30%',
        work_program: 'Modernisasi alat penunjang medis',
        strategic_action: 'Pengadaan USG 4D dan pelatihan operator',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const line = res.body.data;
    createdLineIds.push(line.id);

    // Verifikasi nilai penyusutan bulat
    expect(line.price).toBe(185000000);
    expect(line.amount).toBe(185000000);
    expect(line.useful_life_months).toBe(60);
    expect(line.plan_month).toBe(4);
    expect(line.depreciation_amount).toBe(24666667); // Sesuai contoh PRD: 185.000.000 / 60 * 8 = 24.666.666,67 -> 24.666.667

    // Verifikasi COA terisi otomatis dari kategori (BR-15)
    expect(line.coa_id).toBeDefined();

    // Verifikasi grand total dokumen ter-rekalkulasi
    const docRes = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}`)
      .set('Cookie', picRina.cookie);
    expect(docRes.body.data.total_amount).toBe(185000000);
  });

  it('2. Penyusutan bernilai 0 jika bulan rencana Desember (12) atau pengujian kategori bangunan', async () => {
    // A. Bulan 12 (Desember): 12 - 12 = 0 bulan
    const decRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catMedisId,
        priority_id: priorityStrategicId,
        name: 'Alat Medis Akhir Tahun',
        qty: 1,
        price: 10000000,
        plan_month: 12, // Desember
      });
    expect(decRes.status).toBe(201);
    expect(decRes.body.data.depreciation_amount).toBe(0);
    createdLineIds.push(decRes.body.data.id);

    // B. Kategori Bangunan
    const bgnRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catBangunanId,
        priority_id: priorityStrategicId,
        name: 'Renovasi Atap Gedung MCU',
        qty: 1,
        price: 50000000,
        plan_month: 6,
      });
    expect(bgnRes.status).toBe(201);
    createdLineIds.push(bgnRes.body.data.id);
  });

  it('3. Ambang batas investasi BR-01 pada dasar unit_price (default)', async () => {
    // Pastikan basis = unit_price
    await db.query(
      "UPDATE settings SET value = '\"unit_price\"' WHERE key = 'investment_threshold_basis'"
    );

    // A. Harga satuan Rp 6.000.000 (> 5.000.000) -> Diterima (201)
    const validRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catLaptopId,
        priority_id: priorityStrategicId,
        name: 'Laptop Analis Data',
        qty: 1,
        price: 6000000,
        plan_month: 2,
      });
    expect(validRes.status).toBe(201);
    createdLineIds.push(validRes.body.data.id);

    // B. Harga satuan pas Rp 5.000.000 (tidak > 5.000.000) -> Ditolak (422)
    const edgeRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catLaptopId,
        priority_id: priorityStrategicId,
        name: 'Laptop Pas 5 Juta',
        qty: 1,
        price: 5000000,
        plan_month: 2,
      });
    expect(edgeRes.status).toBe(422);
    expect(edgeRes.body.message).toMatch(/Anggaran Biaya/i);

    // C. Harga satuan Rp 3.000.000 x 2 = Rp 6.000.000 -> Ditolak karena dasar unit_price (Rp 3jt <= 5jt)
    const qtyTwoRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catLaptopId,
        priority_id: priorityStrategicId,
        name: 'Printer Kantor 2 Unit',
        qty: 2,
        price: 3000000,
        plan_month: 3,
      });
    expect(qtyTwoRes.status).toBe(422);
  });

  it('4. Ambang batas investasi BR-01 pada dasar line_total', async () => {
    // Ubah basis ke line_total
    await db.query(
      "UPDATE settings SET value = '\"line_total\"' WHERE key = 'investment_threshold_basis'"
    );

    // A. Harga satuan Rp 3.000.000 x 2 = Rp 6.000.000 (total > 5.000.000) -> Diterima (201)
    const lineTotalRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catLaptopId,
        priority_id: priorityStrategicId,
        name: 'Printer Jaringan Kantor',
        qty: 2,
        price: 3000000,
        plan_month: 3,
      });
    expect(lineTotalRes.status).toBe(201);
    createdLineIds.push(lineTotalRes.body.data.id);

    // B. Total Rp 2.000.000 x 2 = Rp 4.000.000 (total <= 5.000.000) -> Ditolak (422)
    const lowTotalRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catLaptopId,
        priority_id: priorityStrategicId,
        name: 'Scanner Kecil',
        qty: 2,
        price: 2000000,
        plan_month: 3,
      });
    expect(lowTotalRes.status).toBe(422);

    // Kembalikan basis ke unit_price
    await db.query(
      "UPDATE settings SET value = '\"unit_price\"' WHERE key = 'investment_threshold_basis'"
    );
  });

  it('5. Batas karakter 300 pada 4 kotak isian teks panjang', async () => {
    const text300 = 'A'.repeat(300);
    const text301 = 'B'.repeat(301);

    // A. Isian tepat 300 karakter -> Berhasil (201)
    const okRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catMedisId,
        priority_id: priorityStrategicId,
        name: 'EKG Mesin 12 Lead',
        qty: 1,
        price: 25000000,
        plan_month: 5,
        strategic_objective: text300,
      });
    expect(okRes.status).toBe(201);
    createdLineIds.push(okRes.body.data.id);

    // B. Isian 301 karakter -> Ditolak (400)
    const overRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catMedisId,
        priority_id: priorityStrategicId,
        name: 'EKG Mesin 12 Lead Over',
        qty: 1,
        price: 25000000,
        plan_month: 5,
        kpi: text301,
      });
    expect(overRes.status).toBe(400);
    expect(overRes.body.message).toMatch(/melebihi batas maksimum 300 karakter/i);
  });

  it('6. Saran isian hanya menampilkan riwayat dari unit yang bersangkutan (Isolasi Unit)', async () => {
    // 1. Dapatkan saran field strategic_objective untuk Unit 1
    const sugg1Res = await request(app)
      .get(
        `/api/budget-docs/${testDocUnit1Id}/investment-lines/suggestions?field=strategic_objective`
      )
      .set('Cookie', picRina.cookie);

    expect(sugg1Res.status).toBe(200);
    expect(sugg1Res.body.success).toBe(true);
    expect(sugg1Res.body.data).toContain('Peningkatan akurasi diagnosa poli obgyn');

    // 2. Unit 2 (Laboratorium) meminta saran field yang sama -> Tidak boleh mengandung saran Unit 1
    const sugg2Res = await request(app)
      .get(
        `/api/budget-docs/${testDocUnit2Id}/investment-lines/suggestions?field=strategic_objective`
      )
      .set('Cookie', mgrBudi.cookie);

    expect(sugg2Res.status).toBe(200);
    expect(sugg2Res.body.data).not.toContain('Peningkatan akurasi diagnosa poli obgyn');

    // 3. Tes endpoint salin teks terakhir (last-text)
    const lastTextRes = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}/investment-lines/last-text`)
      .set('Cookie', picRina.cookie);

    expect(lastTextRes.status).toBe(200);
    expect(lastTextRes.body.data).toBeDefined();
  });

  it('7. Optimistic Locking: bentrok versi ditolak dengan status 409 Conflict', async () => {
    const lineId = createdLineIds[0];

    // Ambil data baris saat ini
    const getRes = await request(app)
      .get(`/api/budget-docs/${testDocUnit1Id}/investment-lines`)
      .set('Cookie', picRina.cookie);

    const currentLine = getRes.body.data.find((l) => l.id === lineId);
    expect(currentLine).toBeDefined();

    // Kirim versi lama (misal currentLine.version + 999)
    const conflictRes = await request(app)
      .put(`/api/investment-lines/${lineId}`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        name: 'Nama Bentrok',
        qty: 1,
        price: 185000000,
        version: currentLine.version + 999,
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.message).toMatch(/telah diubah oleh pengguna lain/i);
  });

  it('8. RBAC & Akses Lintas Unit Laptop & PC (FR-I7 & Mockup 15-laptop-pc)', async () => {
    // 1. PIC Rina mencoba akses tampilan lintas unit -> 403 Forbidden
    const picCrossRes = await request(app)
      .get('/api/investment-lines')
      .set('Cookie', picRina.cookie);
    expect(picCrossRes.status).toBe(403);

    // 2. PIC Rina mencoba manipulasi dokumen Unit 2 -> 403/404
    const picHackedRes = await request(app)
      .post(`/api/budget-docs/${testDocUnit2Id}/investment-lines`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken)
      .send({
        category_id: catLaptopId,
        priority_id: priorityStrategicId,
        name: 'Hacked Item',
        qty: 1,
        price: 10000000,
        plan_month: 1,
      });
    expect([403, 404]).toContain(picHackedRes.status);

    // 3. Manager Budi mengakses tampilan lintas unit -> Hanya melihat unit 1 dan 2
    const mgrCrossRes = await request(app)
      .get('/api/investment-lines')
      .set('Cookie', mgrBudi.cookie);
    expect(mgrCrossRes.status).toBe(200);
    expect(Array.isArray(mgrCrossRes.body.data)).toBe(true);

    // 4. Akuntansi Dya mengakses tampilan lintas unit -> Akses seluruh unit
    const aktCrossRes = await request(app)
      .get('/api/investment-lines')
      .set('Cookie', aktDya.cookie);
    expect(aktCrossRes.status).toBe(200);
    expect(Array.isArray(aktCrossRes.body.data)).toBe(true);
  });

  it('9. Hapus baris investasi dan verifikasi mutasi tercatat lengkap di audit log', async () => {
    const lineId = createdLineIds[0];

    // Hapus baris
    const delRes = await request(app)
      .delete(`/api/investment-lines/${lineId}`)
      .set('Cookie', picRina.cookie)
      .set('X-CSRF-Token', picRina.csrfToken);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verifikasi audit log
    const auditRes = await db.query(
      "SELECT * FROM audit_logs WHERE entity = 'investment_lines' AND entity_id = $1",
      [lineId]
    );
    expect(auditRes.rows.length).toBeGreaterThanOrEqual(2); // CREATE_LINE, DELETE_LINE
  });
});
