import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Dashboard & Reporting Test Suite (Fase 7)', () => {
  let picAgent;
  let managerAgent;
  let akuntansiAgent;

  let picUserId;
  let managerUserId;
  let akuntansiUserId;

  let companyCnId;
  let companyCnhId;

  let unit1Id; // CN Unit 1 (MCU) - assigned to PIC & Manager
  let unit2Id; // CN Unit 2 (Laboratorium) - assigned to Manager only
  let unit3Id; // CNH Unit 3 (Bogorejo) - CNH

  let groupCnId;
  let groupCnhId;

  let periodCnId;
  let periodCnhId;
  const testYear = 2029;

  let coaBiaya1Id; // 5.8.3
  let coaBiaya2Id; // 4.1.7
  let coaAssetId;  // 1.2.1.1.4
  let coaDeprId;   // 5.4.2

  let item1Id; // linked to coaBiaya1
  let item2Id; // linked to coaBiaya2

  let categoryMedisId;
  let priorityStrategicId;

  let testBatchCnId;

  beforeAll(async () => {
    picAgent = request.agent(app);
    managerAgent = request.agent(app);
    akuntansiAgent = request.agent(app);

    // 0. Idempotent cleanup sisa run sebelumnya
    await db.query("DELETE FROM budget_docs WHERE period_id IN (SELECT id FROM periods WHERE year = $1)", [testYear]);
    await db.query("DELETE FROM user_unit_access WHERE unit_id IN (SELECT id FROM units WHERE code IN ('9991', '9992', '9993'))");
    await db.query("DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email IN ('pic_f7@ptcn.id', 'manager_f7@ptcn.id', 'akuntansi_f7@ptcn.id'))");
    await db.query("DELETE FROM user_unit_access WHERE user_id IN (SELECT id FROM users WHERE email IN ('pic_f7@ptcn.id', 'manager_f7@ptcn.id', 'akuntansi_f7@ptcn.id'))");
    await db.query("DELETE FROM users WHERE email IN ('pic_f7@ptcn.id', 'manager_f7@ptcn.id', 'akuntansi_f7@ptcn.id')");
    await db.query("DELETE FROM units WHERE code IN ('9991', '9992', '9993')");
    await db.query("DELETE FROM periods WHERE year = $1", [testYear]);
    await db.query("DELETE FROM org_groups WHERE name IN ('Instalasi Penunjang Uji', 'Unit Bisnis Uji')");
    await db.query("DELETE FROM items WHERE code IN ('ITM-TEST-01', 'ITM-TEST-02')");
    await db.query("DELETE FROM investment_categories WHERE name = 'Peralatan Medis Uji'");
    await db.query("DELETE FROM coas WHERE code IN ('5.8.3.99', '4.1.7.99', '5.4.2.99')");

    // 1. Setup Pengguna Uji Mandiri (Terisolasi dari tes lain)
    const baseHashRes = await db.query("SELECT password_hash FROM users WHERE id = 1 LIMIT 1");
    const testHash = baseHashRes.rows[0]?.password_hash;

    const uPicRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('PIC Uji F7', 'pic_f7@ptcn.id', $1, 'pic', true)
       ON CONFLICT (email) DO UPDATE SET is_active = true RETURNING id`,
      [testHash]
    );
    picUserId = uPicRes.rows[0].id;

    const uMgrRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Manager Uji F7', 'manager_f7@ptcn.id', $1, 'manager', true)
       ON CONFLICT (email) DO UPDATE SET is_active = true RETURNING id`,
      [testHash]
    );
    managerUserId = uMgrRes.rows[0].id;

    const uAktRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Akuntansi Uji F7', 'akuntansi_f7@ptcn.id', $1, 'akuntansi', true)
       ON CONFLICT (email) DO UPDATE SET is_active = true RETURNING id`,
      [testHash]
    );
    akuntansiUserId = uAktRes.rows[0].id;

    // 2. Dapatkan Perusahaan
    const compRes = await db.query("SELECT id, code FROM companies WHERE code IN ('CN', 'CNH') ORDER BY code ASC");
    for (const c of compRes.rows) {
      if (c.code === 'CN') companyCnId = c.id;
      if (c.code === 'CNH') companyCnhId = c.id;
    }

    // 3. Setup Periode Uji Tahun 2027
    const pCnRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state)
       VALUES ($1, $2, 'PENGISIAN', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days', 'BUKA')
       ON CONFLICT (company_id, year) DO UPDATE SET status = 'PENGISIAN'
       RETURNING id`,
      [companyCnId, testYear]
    );
    periodCnId = pCnRes.rows[0].id;

    const pCnhRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state)
       VALUES ($1, $2, 'PENGISIAN', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days', 'BUKA')
       ON CONFLICT (company_id, year) DO UPDATE SET status = 'PENGISIAN'
       RETURNING id`,
      [companyCnhId, testYear]
    );
    periodCnhId = pCnhRes.rows[0].id;

    // 4. Setup Kelompok Instalasi / Org Groups
    const groupCnRes = await db.query(
      `INSERT INTO org_groups (company_id, name, type)
       VALUES ($1, 'Instalasi Penunjang Uji', 'instalasi')
       RETURNING id`,
      [companyCnId]
    );
    groupCnId = groupCnRes.rows[0].id;

    const groupCnhRes = await db.query(
      `INSERT INTO org_groups (company_id, name, type)
       VALUES ($1, 'Unit Bisnis Uji', 'unit_bisnis')
       RETURNING id`,
      [companyCnhId]
    );
    groupCnhId = groupCnhRes.rows[0].id;

    // 5. Setup Unit Kerja Uji
    const u1Res = await db.query(
      `INSERT INTO units (company_id, group_id, code, name, classification, is_active)
       VALUES ($1, $2, '9991', 'Unit Uji MCU', 'PENUNJANG MEDIK', true)
       RETURNING id`,
      [companyCnId, groupCnId]
    );
    unit1Id = u1Res.rows[0].id;

    const u2Res = await db.query(
      `INSERT INTO units (company_id, group_id, code, name, classification, is_active)
       VALUES ($1, $2, '9992', 'Unit Uji Laboratorium', 'PENUNJANG DIAGNOSTIK', true)
       RETURNING id`,
      [companyCnId, groupCnId]
    );
    unit2Id = u2Res.rows[0].id;

    const u3Res = await db.query(
      `INSERT INTO units (company_id, group_id, code, name, classification, is_active)
       VALUES ($1, $2, '9993', 'Unit Uji CNH Bogorejo', 'KLINIK PRATAMA', true)
       RETURNING id`,
      [companyCnhId, groupCnhId]
    );
    unit3Id = u3Res.rows[0].id;

    // 6. Penugasan Unit (user_unit_access)
    // PIC hanya unit 1
    await db.query(`DELETE FROM user_unit_access WHERE user_id = $1`, [picUserId]);
    await db.query(`INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2)`, [picUserId, unit1Id]);

    // Manager unit 1 & unit 2
    await db.query(`DELETE FROM user_unit_access WHERE user_id = $1`, [managerUserId]);
    await db.query(
      `INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2), ($1, $3)`,
      [managerUserId, unit1Id, unit2Id]
    );

    // 7. Setup COA & COA Groups
    const cgRes = await db.query(
      `INSERT INTO coa_groups (code, name) VALUES ('99.1', 'Grup Uji Bahan')
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const testCoaGroupId = cgRes.rows[0].id;

    const coa1Res = await db.query(
      `INSERT INTO coas (code, name, group_id, category, is_active)
       VALUES ('5.8.3.99', 'Biaya Cetak Uji', $1, 'biaya', true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [testCoaGroupId]
    );
    coaBiaya1Id = coa1Res.rows[0].id;

    const coa2Res = await db.query(
      `INSERT INTO coas (code, name, group_id, category, is_active)
       VALUES ('4.1.7.99', 'Biaya Bahan O2 Uji', $1, 'biaya', true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [testCoaGroupId]
    );
    coaBiaya2Id = coa2Res.rows[0].id;

    const coaAssetRes = await db.query(
      `INSERT INTO coas (code, name, category, is_active)
       VALUES ('1.2.1.1.4', 'Aset Tetap Peralatan Medis', 'investasi', true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    coaAssetId = coaAssetRes.rows[0].id;

    const coaDeprRes = await db.query(
      `INSERT INTO coas (code, name, category, is_active)
       VALUES ('5.4.2.99', 'Biaya Penyusutan Medis Uji', 'investasi', true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    coaDeprId = coaDeprRes.rows[0].id;

    // 8. Setup Barang Logistik
    const item1Res = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ('ITM-TEST-01', 'Kertas HVS Uji', 'Rim', $1, true)
       RETURNING id`,
      [coaBiaya1Id]
    );
    item1Id = item1Res.rows[0].id;

    const item2Res = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ('ITM-TEST-02', 'Tabung Oksigen Uji', 'Tabung', $1, true)
       RETURNING id`,
      [coaBiaya2Id]
    );
    item2Id = item2Res.rows[0].id;

    // 9. Setup Kategori Investasi & Prioritas
    const catRes = await db.query(
      `INSERT INTO investment_categories (name, useful_life_months, depreciation_coa_id)
       VALUES ('Peralatan Medis Uji', 60, $1)
       ON CONFLICT (name) DO UPDATE SET depreciation_coa_id = EXCLUDED.depreciation_coa_id RETURNING id`,
      [coaDeprId]
    );
    categoryMedisId = catRes.rows[0].id;

    const prioRes = await db.query("SELECT id FROM priorities LIMIT 1");
    priorityStrategicId = prioRes.rows[0]?.id || 1;

    // 10. Setup Dokumen Anggaran & Baris (Data Terkontrol Hitung Tangan):
    // Unit 1 (CN - MCU):
    // - Biaya: Item 1 = Rp 500.000, Item 2 = Rp 500.000 (Total = Rp 1.000.000)
    // - Investasi: USG Uji = Rp 10.000.000, Depr = Rp 1.600.000
    const docB1 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount)
       VALUES ($1, $2, 'BIAYA', 'DRAFT', 1000000) RETURNING id`,
      [periodCnId, unit1Id]
    );
    await db.query(
      `INSERT INTO expense_lines (doc_id, item_id, qty, price_snapshot, amount)
       VALUES ($1, $2, 10, 50000, 500000), ($1, $3, 5, 100000, 500000)`,
      [docB1.rows[0].id, item1Id, item2Id]
    );

    const docI1 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount)
       VALUES ($1, $2, 'INVESTASI', 'DIAJUKAN', 10000000) RETURNING id`,
      [periodCnId, unit1Id]
    );
    await db.query(
      `INSERT INTO investment_lines (doc_id, category_id, priority_id, coa_id, name, qty, price, amount, plan_month, useful_life_months, depreciation_amount)
       VALUES ($1, $2, $3, $4, 'USG Uji', 1, 10000000, 10000000, 4, 60, 1600000)`,
      [docI1.rows[0].id, categoryMedisId, priorityStrategicId, coaDeprId]
    );

    // Unit 2 (CN - Lab):
    // - Biaya: Item 2 = Rp 1.000.000 (Total = Rp 1.000.000)
    // - Investasi: Tidak ada
    const docB2 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount)
       VALUES ($1, $2, 'BIAYA', 'FINAL', 1000000) RETURNING id`,
      [periodCnId, unit2Id]
    );
    await db.query(
      `INSERT INTO expense_lines (doc_id, item_id, qty, price_snapshot, amount)
       VALUES ($1, $2, 10, 100000, 1000000)`,
      [docB2.rows[0].id, item2Id]
    );

    // Unit 3 (CNH - Bogorejo):
    // - Biaya: Item 1 = Rp 200.000
    // - Investasi: Alat Diagnostik CNH = Rp 15.000.000
    const docB3 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount)
       VALUES ($1, $2, 'BIAYA', 'DISETUJUI', 200000) RETURNING id`,
      [periodCnhId, unit3Id]
    );
    await db.query(
      `INSERT INTO expense_lines (doc_id, item_id, qty, price_snapshot, amount)
       VALUES ($1, $2, 4, 50000, 200000)`,
      [docB3.rows[0].id, item1Id]
    );

    const docI3 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount)
       VALUES ($1, $2, 'INVESTASI', 'FINAL', 15000000) RETURNING id`,
      [periodCnhId, unit3Id]
    );
    await db.query(
      `INSERT INTO investment_lines (doc_id, category_id, priority_id, coa_id, name, qty, price, amount, plan_month, useful_life_months, depreciation_amount)
       VALUES ($1, $2, $3, $4, 'Diagnostik CNH', 1, 15000000, 15000000, 6, 60, 1500000)`,
      [docI3.rows[0].id, categoryMedisId, priorityStrategicId, coaDeprId]
    );

    // 11. Setup Batch Realisasi & Journal Lines (CONFIRMED):
    // Batch 1 (CN, 2027):
    // - Unit 1, COA 5.8.3.99: Debet Rp 300.000, Kredit Rp 0 = Rp 300.000 (Usage = 60%, level = 'ok')
    // - Unit 1, COA 4.1.7.99: Debet Rp 600.000, Kredit Rp 100.000 = Rp 500.000 (Usage = 100%, level = 'critical')
    // - Unit 1, COA 1.2.1.1.4: Debet Rp 8.000.000, Kredit Rp 0 = Rp 8.000.000 (BR-05: debet saja; Usage = 80%, level = 'warning')
    // Total Realisasi Biaya CN = Rp 800.000. Total Realisasi Investasi CN = Rp 8.000.000.
    // Unit 2: Tidak ada realisasi (realisasi: null).
    // Unit 3 (CNH): Tidak ada realisasi (realisasi: null).
    const batchRes = await db.query(
      `INSERT INTO import_batches (company_id, kind, file_name, period, uploaded_by, status, mode)
       VALUES ($1, 'realisasi', 'Jurnal_Uji_Test.xlsx', $2, $3, 'CONFIRMED', 'replace_month')
       RETURNING id`,
      [companyCnId, `${testYear}-05`, akuntansiUserId]
    );
    testBatchCnId = batchRes.rows[0].id;

    await db.query(
      `INSERT INTO journal_lines (batch_id, sub_journal_id, trx_date, unit_id, coa_id, debit, credit, status)
       VALUES 
         ($1, 'SJ-TEST-001', $2, $3, $4, 300000, 0, 'CONFIRMED'),
         ($1, 'SJ-TEST-002', $5, $3, $6, 600000, 100000, 'CONFIRMED'),
         ($1, 'SJ-TEST-003', $7, $3, $8, 8000000, 0, 'CONFIRMED')`,
      [
        testBatchCnId,
        `${testYear}-05-10`,
        unit1Id,
        coaBiaya1Id,
        `${testYear}-05-15`,
        coaBiaya2Id,
        `${testYear}-05-20`,
        coaAssetId,
      ]
    );

    // 12. Login Sesi Semua Aktor Uji
    // Akuntansi
    const csrfDya = await akuntansiAgent.get('/api/auth/csrf');
    await akuntansiAgent.post('/api/auth/login').set('X-CSRF-Token', csrfDya.body.csrf_token).send({
      email: 'akuntansi_f7@ptcn.id',
      password: 'password123',
    });

    // Manager
    const csrfBudi = await managerAgent.get('/api/auth/csrf');
    await managerAgent.post('/api/auth/login').set('X-CSRF-Token', csrfBudi.body.csrf_token).send({
      email: 'manager_f7@ptcn.id',
      password: 'password123',
    });

    // PIC
    const csrfRina = await picAgent.get('/api/auth/csrf');
    await picAgent.post('/api/auth/login').set('X-CSRF-Token', csrfRina.body.csrf_token).send({
      email: 'pic_f7@ptcn.id',
      password: 'password123',
    });
  });

  afterAll(async () => {
    // Bersihkan fixture pengujian
    if (testBatchCnId) {
      await db.query('DELETE FROM journal_lines WHERE batch_id = $1', [testBatchCnId]);
      await db.query('DELETE FROM import_batches WHERE id = $1', [testBatchCnId]);
    }
    await db.query('DELETE FROM expense_lines WHERE item_id IN ($1, $2)', [item1Id, item2Id]);
    await db.query('DELETE FROM investment_lines WHERE category_id = $1', [categoryMedisId]);
    await db.query('DELETE FROM budget_docs WHERE unit_id IN ($1, $2, $3)', [unit1Id, unit2Id, unit3Id]);
    await db.query('DELETE FROM user_unit_access WHERE unit_id IN ($1, $2, $3)', [unit1Id, unit2Id, unit3Id]);
    if (picUserId && managerUserId && akuntansiUserId) {
      await db.query('DELETE FROM audit_logs WHERE actor_id IN ($1, $2, $3)', [picUserId, managerUserId, akuntansiUserId]);
      await db.query('DELETE FROM user_unit_access WHERE user_id IN ($1, $2, $3)', [picUserId, managerUserId, akuntansiUserId]);
      await db.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [picUserId, managerUserId, akuntansiUserId]);
    }
    await db.query('DELETE FROM units WHERE id IN ($1, $2, $3)', [unit1Id, unit2Id, unit3Id]);
    if (groupCnId && groupCnhId) {
      await db.query('DELETE FROM org_groups WHERE id IN ($1, $2)', [groupCnId, groupCnhId]);
    }
    await db.query('DELETE FROM items WHERE id IN ($1, $2)', [item1Id, item2Id]);
    if (categoryMedisId) {
      await db.query('DELETE FROM investment_categories WHERE id = $1', [categoryMedisId]);
    }
    await db.query('DELETE FROM coas WHERE id IN ($1, $2, $3)', [coaBiaya1Id, coaBiaya2Id, coaDeprId]);
    await db.query('DELETE FROM coa_groups WHERE code = $1', ['99.1']);
    if (periodCnId && periodCnhId) {
      await db.query('DELETE FROM periods WHERE id IN ($1, $2)', [periodCnId, periodCnhId]);
    }
  });

  describe('1. GET /api/dashboard/summary (Perhitungan Eksak & Scoping)', () => {
    it('Akuntansi melihat total RKAP & realisasi perusahaan CN secara lengkap', async () => {
      const res = await akuntansiAgent.get(`/api/dashboard/summary?company_id=${companyCnId}&period_id=${periodCnId}`);
      expect(res.status).toBe(200);

      // Hitungan Tangan CN:
      // RKAP Biaya: Unit 1 (1.000.000) + Unit 2 (1.000.000) = 2.000.000
      // RKAP Investasi: Unit 1 = 10.000.000
      // Realisasi Biaya: 300.000 + (600.000 - 100.000) = 800.000
      // Usage Biaya %: (800.000 / 2.000.000) * 100 = 40%
      // Realisasi Investasi: 8.000.000 (satu sisi debet akun aset tetap BR-05)
      // Usage Investasi %: (8.000.000 / 10.000.000) * 100 = 80%
      expect(res.body.rkap_biaya).toBe(2000000);
      expect(res.body.rkap_investasi).toBe(10000000);
      expect(res.body.realisasi_biaya).toBe(800000);
      expect(res.body.usage_biaya_percent).toBe(40);
      expect(res.body.realisasi_investasi).toBe(8000000);
      expect(res.body.usage_investasi_percent).toBe(80);
      expect(res.body.threshold).toEqual({ warning: 80, critical: 100 });
    });

    it('PIC Unit 1 hanya melihat data unit yang ditugaskan kepadanya', async () => {
      const res = await picAgent.get(`/api/dashboard/summary?company_id=${companyCnId}&period_id=${periodCnId}`);
      expect(res.status).toBe(200);

      // Hitungan Tangan Unit 1 saja:
      // RKAP Biaya Unit 1: 1.000.000 (tidak termasuk 1.000.000 milik Unit 2)
      // RKAP Investasi: 10.000.000
      // Realisasi Biaya Unit 1: 800.000
      // Usage Biaya %: 80%
      expect(res.body.rkap_biaya).toBe(1000000);
      expect(res.body.rkap_investasi).toBe(10000000);
      expect(res.body.realisasi_biaya).toBe(800000);
      expect(res.body.usage_biaya_percent).toBe(80);
      expect(res.body.realisasi_investasi).toBe(8000000);
      expect(res.body.usage_investasi_percent).toBe(80);
    });

    it('Periode tanpa realisasi mengembalikan realisasi null dan usage percent null (bukan 0)', async () => {
      const res = await akuntansiAgent.get(`/api/dashboard/summary?company_id=${companyCnhId}&period_id=${periodCnhId}`);
      expect(res.status).toBe(200);

      // CNH belum ada import jurnal realisasi:
      expect(res.body.rkap_biaya).toBe(200000);
      expect(res.body.rkap_investasi).toBe(15000000);
      expect(res.body.realisasi_biaya).toBeNull();
      expect(res.body.usage_biaya_percent).toBeNull();
      expect(res.body.realisasi_investasi).toBeNull();
      expect(res.body.usage_investasi_percent).toBeNull();
    });
  });

  describe('2. GET /api/dashboard/progress (Status Unit & Unit Terlambat)', () => {
    it('Menghitung jumlah unit per status dokumen secara akurat', async () => {
      const res = await akuntansiAgent.get(`/api/dashboard/progress?company_id=${companyCnId}&period_id=${periodCnId}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.draft).toBe('number');
      expect(typeof res.body.diajukan).toBe('number');
      expect(typeof res.body.final).toBe('number');
      expect(Array.isArray(res.body.late_units)).toBe(true);
    });

    it('Mendukung filter berdasarkan jenis dokumen (?type=BIAYA)', async () => {
      const res = await akuntansiAgent.get(`/api/dashboard/progress?company_id=${companyCnId}&period_id=${periodCnId}&type=BIAYA`);
      expect(res.status).toBe(200);
      expect(res.body.draft).toBeGreaterThanOrEqual(1); // Unit 1 Biaya is DRAFT
      expect(res.body.final).toBeGreaterThanOrEqual(1); // Unit 2 Biaya is FINAL
    });
  });

  describe('3. GET /api/dashboard/budget-vs-realization (Drill-down & Status Ambang)', () => {
    it('Agregasi per COA menghitung rkap, realisasi, persentase, dan level peringatan', async () => {
      const res = await akuntansiAgent.get(
        `/api/dashboard/budget-vs-realization?company_id=${companyCnId}&period_id=${periodCnId}&group_by=coa`
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const coa1 = res.body.find((c) => c.coa_code === '5.8.3.99');
      expect(coa1).toBeDefined();
      expect(coa1.rkap).toBe(500000);
      expect(coa1.realisasi).toBe(300000);
      expect(coa1.usage_percent).toBe(60);
      expect(coa1.level).toBe('ok'); // 60% < 80%

      const coa2 = res.body.find((c) => c.coa_code === '4.1.7.99');
      expect(coa2).toBeDefined();
      expect(coa2.rkap).toBe(1500000); // Unit 1 (500k) + Unit 2 (1.000k)
      expect(coa2.realisasi).toBe(500000);
      expect(coa2.usage_percent).toBe(33);
      expect(coa2.level).toBe('ok');

      const coaAsset = res.body.find((c) => c.coa_code === '1.2.1.1.4');
      if (coaAsset) {
        expect(coaAsset.realisasi).toBe(8000000);
      }
    });

    it('Agregasi per Unit menghitung total unit dan mengembalikan null bila belum ada realisasi', async () => {
      const res = await akuntansiAgent.get(
        `/api/dashboard/budget-vs-realization?company_id=${companyCnId}&period_id=${periodCnId}&group_by=unit`
      );
      expect(res.status).toBe(200);

      const u1 = res.body.find((u) => u.unit_id === unit1Id);
      expect(u1).toBeDefined();
      expect(u1.rkap).toBe(11000000); // 1.000.000 biaya + 10.000.000 investasi
      expect(u1.realisasi).toBe(8800000); // 800.000 biaya + 8.000.000 investasi
      expect(u1.usage_percent).toBe(80);
      expect(u1.level).toBe('warning'); // 80% >= 80% warning

      const u2 = res.body.find((u) => u.unit_id === unit2Id);
      expect(u2).toBeDefined();
      expect(u2.rkap).toBe(1000000);
      expect(u2.realisasi).toBeNull();
      expect(u2.usage_percent).toBeNull();
      expect(u2.level).toBeNull();
    });

    it('PIC hanya melihat unit miliknya saat query per unit', async () => {
      const res = await picAgent.get(
        `/api/dashboard/budget-vs-realization?company_id=${companyCnId}&period_id=${periodCnId}&group_by=unit`
      );
      expect(res.status).toBe(200);
      const unitIds = res.body.map((u) => u.unit_id);
      expect(unitIds).toContain(unit1Id);
      expect(unitIds).not.toContain(unit2Id);
      expect(unitIds).not.toContain(unit3Id);
    });
  });

  describe('4. GET /api/reports/expense-by-coa', () => {
    it('Mengembalikan rekapitulasi biaya per COA dengan kalkulasi SQL yang presisi', async () => {
      const res = await akuntansiAgent.get(
        `/api/reports/expense-by-coa?company_id=${companyCnId}&period_id=${periodCnId}`
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const itemCoa1 = res.body.find((c) => c.coa_code === '5.8.3.99');
      expect(itemCoa1).toBeDefined();
      expect(itemCoa1.amount).toBe(500000);

      const itemCoa2 = res.body.find((c) => c.coa_code === '4.1.7.99');
      expect(itemCoa2).toBeDefined();
      expect(itemCoa2.amount).toBe(1500000);
    });
  });

  describe('5. GET /api/reports/investment-summary', () => {
    it('Mengelompokkan investasi berdasarkan kategori (type)', async () => {
      const res = await akuntansiAgent.get(
        `/api/reports/investment-summary?company_id=${companyCnId}&period_id=${periodCnId}&group_by=type`
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const item = res.body.find((c) => c.category_name === 'Peralatan Medis Uji');
      expect(item).toBeDefined();
      expect(item.count).toBe(1);
      expect(item.amount).toBe(10000000);
      expect(item.depreciation_amount).toBe(1600000);
    });

    it('Mengelompokkan investasi berdasarkan bulan rencana (?group_by=month)', async () => {
      const res = await akuntansiAgent.get(
        `/api/reports/investment-summary?company_id=${companyCnId}&period_id=${periodCnId}&group_by=month`
      );
      expect(res.status).toBe(200);
      const month4 = res.body.find((m) => m.month === 4);
      expect(month4).toBeDefined();
      expect(month4.amount).toBe(10000000);
    });
  });

  describe('6. GET /api/reports/consolidated (Rekap Gabungan CN & CNH)', () => {
    it('Mengembalikan struktur hierarkis lengkap dengan subtotal unit, subtotal perusahaan, dan grand total', async () => {
      const res = await akuntansiAgent.get(`/api/reports/consolidated?period_year=${testYear}`);
      expect(res.status).toBe(200);
      expect(res.body.period_year).toBe(testYear);
      expect(Array.isArray(res.body.companies)).toBe(true);

      // Cari perusahaan CN
      const compCn = res.body.companies.find((c) => c.company_code === 'CN');
      expect(compCn).toBeDefined();

      // Cari Unit 1 di CN
      const u1 = compCn.units.find((u) => u.unit_id === unit1Id);
      expect(u1).toBeDefined();
      expect(u1.subtotal.rkap).toBe(11000000); // 1.000.000 + 10.000.000
      expect(u1.subtotal.realisasi).toBe(8800000); // 800.000 + 8.000.000

      // Cari Unit 2 di CN
      const u2 = compCn.units.find((u) => u.unit_id === unit2Id);
      expect(u2).toBeDefined();
      expect(u2.subtotal.rkap).toBe(1000000);
      expect(u2.subtotal.realisasi).toBeNull();

      // Subtotal CN
      expect(compCn.subtotal.rkap).toBe(12000000);
      expect(compCn.subtotal.realisasi).toBe(8800000);

      // Cari perusahaan CNH
      const compCnh = res.body.companies.find((c) => c.company_code === 'CNH');
      expect(compCnh).toBeDefined();
      expect(compCnh.subtotal.rkap).toBe(15200000); // 200.000 + 15.000.000
      expect(compCnh.subtotal.realisasi).toBeNull();

      // Grand Total Gabungan: 12.000.000 + 15.200.000 = 27.200.000
      expect(res.body.grand_total.rkap).toBe(27200000);
      expect(res.body.grand_total.realisasi).toBe(8800000);
    });

    it('Manager hanya melihat unit dalam cakupannya pada rekap konsolidasi', async () => {
      const res = await managerAgent.get(`/api/reports/consolidated?period_year=${testYear}`);
      expect(res.status).toBe(200);

      // Manager hanya punya akses ke Unit 1 & Unit 2 (CN), tidak memiliki akses ke Unit 3 (CNH)
      const compCodes = res.body.companies.map((c) => c.company_code);
      expect(compCodes).toContain('CN');
      expect(compCodes).not.toContain('CNH');

      // Grand total bagi Manager hanya mencakup unit miliknya (Rp 12.000.000)
      expect(res.body.grand_total.rkap).toBe(12000000);
    });
  });

  describe('7. GET /api/reports/matrix (Matriks Unit x COA)', () => {
    it('Menyajikan kolom COA terkelompok, nilai sel unit, subtotal instalasi, subtotal perusahaan, dan grand total', async () => {
      const res = await akuntansiAgent.get(`/api/reports/matrix?period_year=${testYear}&hide_empty=true`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.columns)).toBe(true);
      expect(Array.isArray(res.body.companies)).toBe(true);

      // Verifikasi kolom muncul
      const allCoaCodes = [];
      res.body.columns.forEach((g) => {
        g.coas.forEach((c) => allCoaCodes.push(c.code));
      });
      expect(allCoaCodes).toContain('5.8.3.99');
      expect(allCoaCodes).toContain('4.1.7.99');

      // Verifikasi Unit 1 di CN
      const compCn = res.body.companies.find((c) => c.code === 'CN');
      expect(compCn).toBeDefined();

      const inst = compCn.instalasi.find((i) => i.name === 'Instalasi Penunjang Uji');
      expect(inst).toBeDefined();

      const u1 = inst.units.find((u) => u.unit_id === unit1Id);
      expect(u1).toBeDefined();
      expect(u1.values['5.8.3.99']).toBe(500000);
      expect(u1.values['4.1.7.99']).toBe(500000);
      expect(u1.total).toBe(1000000);

      // Subtotal Instalasi untuk 4.1.7.99: Unit 1 (500k) + Unit 2 (1.000k) = 1.500.000
      expect(inst.subtotal.values['4.1.7.99']).toBe(1500000);
      expect(inst.subtotal.total).toBe(2000000);

      // Grand Total Matriks Gabungan Biaya: CN (2.000.000) + CNH (200.000) = 2.200.000
      expect(res.body.grand_total.total).toBe(2200000);
    });

    it('Parameter hide_empty=false menampilkan seluruh COA master', async () => {
      const res = await akuntansiAgent.get(`/api/reports/matrix?period_year=${testYear}&hide_empty=false`);
      expect(res.status).toBe(200);
      expect(res.body.columns.length).toBeGreaterThan(0);
    });
  });

  describe('8. GET /api/reports/export (Ekspor Excel via ExcelJS)', () => {
    const binaryParser = (res, callback) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(data)));
    };

    it('Berhasil mengunduh file .xlsx untuk laporan rekap gabungan konsolidasi', async () => {
      const res = await akuntansiAgent
        .get(`/api/reports/export?report=consolidated&format=xlsx&period_year=${testYear}`)
        .buffer(true)
        .parse(binaryParser);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.headers['content-disposition']).toContain('.xlsx');
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(1000); // File Excel berisi konten binary valid
    });

    it('Berhasil mengunduh file .xlsx untuk matriks unit x COA', async () => {
      const res = await akuntansiAgent
        .get(`/api/reports/export?report=matrix&format=xlsx&period_year=${testYear}`)
        .buffer(true)
        .parse(binaryParser);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(res.body.length).toBeGreaterThan(1000);
    });

    it('Berhasil mengunduh file .xlsx untuk expense-by-coa', async () => {
      const res = await akuntansiAgent
        .get(
          `/api/reports/export?report=expense-by-coa&format=xlsx&company_id=${companyCnId}&period_id=${periodCnId}`
        )
        .buffer(true)
        .parse(binaryParser);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(1000);
    });

    it('Menolak permohonan format PDF dengan 422 PDF_EXPORT_DEFERRED', async () => {
      const res = await akuntansiAgent.get(
        `/api/reports/export?report=consolidated&format=pdf&period_year=${testYear}`
      );
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('PDF_EXPORT_DEFERRED');
    });

    it('Menolak jenis laporan tidak valid dengan 400', async () => {
      const res = await akuntansiAgent.get(
        `/api/reports/export?report=laporan_palsu&format=xlsx`
      );
      expect(res.status).toBe(400);
    });
  });
});
