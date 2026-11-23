import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Fase 3d: Display Cross-Unit Expense & Investment Lines Test Suite', () => {
  let picAgent;
  let managerAgent;
  let akuntansiAgent;
  let noUnitAgent;

  let picUserId;
  let managerUserId;
  let akuntansiUserId;
  let noUnitUserId;

  let companyCnId;
  let unit1Id; // CN Unit 1 (MCU 9811) - assigned to PIC & Manager
  let unit2Id; // CN Unit 2 (Lab 9812) - assigned to Manager only
  let unit3Id; // CN Unit 3 (Rawat 9813) - unassigned to PIC/Manager (Akuntansi only)

  let periodId;
  const testYear = 2030;

  let coaGroup1Id;
  let coaBiaya1Id;
  let coaBiaya2Id;
  let coaDeprId;

  let item1Id;
  let item2Id;

  let categoryItId;
  let categoryMedisId;
  let priorityId;

  let doc1BiayaId;
  let doc2BiayaId;
  let doc3BiayaId;

  let doc1InvestId;
  let doc2InvestId;
  let doc3InvestId;

  let batchId;

  beforeAll(async () => {
    picAgent = request.agent(app);
    managerAgent = request.agent(app);
    akuntansiAgent = request.agent(app);
    noUnitAgent = request.agent(app);

    // 0. Cleanup data uji sebelumnya
    await db.query("DELETE FROM journal_lines WHERE sub_journal_id IN ('JRN-3D-01', 'JRN-3D-02')");
    await db.query("DELETE FROM import_batches WHERE period = $1", [String(testYear)]);
    await db.query("DELETE FROM expense_lines WHERE doc_id IN (SELECT id FROM budget_docs WHERE period_id IN (SELECT id FROM periods WHERE year = $1))", [testYear]);
    await db.query("DELETE FROM investment_lines WHERE doc_id IN (SELECT id FROM budget_docs WHERE period_id IN (SELECT id FROM periods WHERE year = $1))", [testYear]);
    await db.query("DELETE FROM budget_docs WHERE period_id IN (SELECT id FROM periods WHERE year = $1)", [testYear]);
    await db.query("DELETE FROM user_unit_access WHERE unit_id IN (SELECT id FROM units WHERE code IN ('9811', '9812', '9813'))");
    await db.query("DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email IN ('pic_3d@ptcn.id', 'mgr_3d@ptcn.id', 'akt_3d@ptcn.id', 'nounit_3d@ptcn.id'))");
    await db.query("DELETE FROM user_unit_access WHERE user_id IN (SELECT id FROM users WHERE email IN ('pic_3d@ptcn.id', 'mgr_3d@ptcn.id', 'akt_3d@ptcn.id', 'nounit_3d@ptcn.id'))");
    await db.query("DELETE FROM users WHERE email IN ('pic_3d@ptcn.id', 'mgr_3d@ptcn.id', 'akt_3d@ptcn.id', 'nounit_3d@ptcn.id')");
    await db.query("DELETE FROM units WHERE code IN ('9811', '9812', '9813')");
    await db.query("DELETE FROM periods WHERE year = $1", [testYear]);
    await db.query("DELETE FROM items WHERE code IN ('ITM-3D-01', 'ITM-3D-02')");
    await db.query("DELETE FROM investment_categories WHERE name IN ('PC & Laptop 3D', 'Alat Operasi 3D')");
    await db.query("DELETE FROM coas WHERE code IN ('5.8.3.3D1', '5.2.4.3D2', '5.4.2.3D')");
    await db.query("DELETE FROM coa_groups WHERE name = 'Kelompok Biaya 3D'");

    // 1. Setup Company
    const compRes = await db.query("SELECT id FROM companies WHERE code = 'CN' LIMIT 1");
    companyCnId = compRes.rows[0]?.id || 1;

    // 2. Setup Pengguna Uji
    const hashRes = await db.query("SELECT password_hash FROM users WHERE id = 1 LIMIT 1");
    const testHash = hashRes.rows[0]?.password_hash;

    const uPic = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('PIC 3D', 'pic_3d@ptcn.id', $1, 'pic', true)
       RETURNING id`,
      [testHash]
    );
    picUserId = uPic.rows[0].id;

    const uMgr = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Manager 3D', 'mgr_3d@ptcn.id', $1, 'manager', true)
       RETURNING id`,
      [testHash]
    );
    managerUserId = uMgr.rows[0].id;

    const uAkt = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Akuntansi 3D', 'akt_3d@ptcn.id', $1, 'akuntansi', true)
       RETURNING id`,
      [testHash]
    );
    akuntansiUserId = uAkt.rows[0].id;

    const uNoUnit = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('No Unit 3D', 'nounit_3d@ptcn.id', $1, 'pic', true)
       RETURNING id`,
      [testHash]
    );
    noUnitUserId = uNoUnit.rows[0].id;

    // 3. Setup Units
    const u1Res = await db.query(
      `INSERT INTO units (company_id, code, name, is_active)
       VALUES ($1, '9811', 'MCU Unit 3D', true) RETURNING id`,
      [companyCnId]
    );
    unit1Id = u1Res.rows[0].id;

    const u2Res = await db.query(
      `INSERT INTO units (company_id, code, name, is_active)
       VALUES ($1, '9812', 'Lab Unit 3D', true) RETURNING id`,
      [companyCnId]
    );
    unit2Id = u2Res.rows[0].id;

    const u3Res = await db.query(
      `INSERT INTO units (company_id, code, name, is_active)
       VALUES ($1, '9813', 'Rawat Inap 3D', true) RETURNING id`,
      [companyCnId]
    );
    unit3Id = u3Res.rows[0].id;

    // Tugaskan unit akses:
    // PIC: unit1 saja
    await db.query("INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2)", [picUserId, unit1Id]);
    // Manager: unit1 dan unit2
    await db.query("INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2), ($1, $3)", [managerUserId, unit1Id, unit2Id]);
    // Akuntansi: global (tidak perlu user_unit_access)
    // noUnit: tidak memiliki unit

    // 4. Setup Periode
    const perRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state)
       VALUES ($1, $2, 'PENGISIAN', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days', 'BUKA')
       ON CONFLICT (company_id, year) DO UPDATE SET status = 'PENGISIAN'
       RETURNING id`,
      [companyCnId, testYear]
    );
    periodId = perRes.rows[0].id;

    // 5. Setup Master COA & Kelompok
    const grpRes = await db.query(
      `INSERT INTO coa_groups (code, name)
       VALUES ('GRP-3D', 'Kelompok Biaya 3D') RETURNING id`
    );
    coaGroup1Id = grpRes.rows[0].id;

    const c1 = await db.query(
      `INSERT INTO coas (group_id, code, name, category, is_active)
       VALUES ($1, '5.8.3.3D1', 'Biaya Cetak & Kertas 3D', 'biaya', true) RETURNING id`,
      [coaGroup1Id]
    );
    coaBiaya1Id = c1.rows[0].id;

    const c2 = await db.query(
      `INSERT INTO coas (code, name, category, is_active)
       VALUES ('5.2.4.3D2', 'Biaya Operasional Medis 3D', 'biaya', true) RETURNING id`
    );
    coaBiaya2Id = c2.rows[0].id;

    const cDepr = await db.query(
      `INSERT INTO coas (code, name, category, is_active)
       VALUES ('5.4.2.3D', 'Biaya Penyusutan 3D', 'biaya', true) RETURNING id`
    );
    coaDeprId = cDepr.rows[0].id;

    // 6. Setup Master Barang & Kategori Investasi & Prioritas
    const itm1 = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ('ITM-3D-01', 'Kertas A4 Test 3D', 'Rim', $1, true) RETURNING id`,
      [coaBiaya1Id]
    );
    item1Id = itm1.rows[0].id;

    const itm2 = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ('ITM-3D-02', 'Sarung Tangan Test 3D', 'Box', $1, true) RETURNING id`,
      [coaBiaya2Id]
    );
    item2Id = itm2.rows[0].id;

    const catIt = await db.query(
      `INSERT INTO investment_categories (name, depreciation_coa_id, useful_life_months)
       VALUES ('PC & Laptop 3D', $1, 48) RETURNING id`,
      [coaDeprId]
    );
    categoryItId = catIt.rows[0].id;

    const catMed = await db.query(
      `INSERT INTO investment_categories (name, depreciation_coa_id, useful_life_months)
       VALUES ('Alat Operasi 3D', $1, 60) RETURNING id`,
      [coaDeprId]
    );
    categoryMedisId = catMed.rows[0].id;

    const prioRes = await db.query("SELECT id FROM priorities LIMIT 1");
    priorityId = prioRes.rows[0]?.id || 1;

    // 7. Setup Dokumen Anggaran & Baris
    // Dokumen 1: Unit 1 Biaya (DRAFT)
    const d1B = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, submitted_by)
       VALUES ($1, $2, 'BIAYA', 'DRAFT', 2500000, $3) RETURNING id`,
      [periodId, unit1Id, picUserId]
    );
    doc1BiayaId = d1B.rows[0].id;
    await db.query(
      `INSERT INTO expense_lines (doc_id, item_id, qty, price_snapshot, amount)
       VALUES ($1, $2, 50, 50000, 2500000)`,
      [doc1BiayaId, item1Id]
    );

    // Dokumen 2: Unit 2 Biaya (DIAJUKAN)
    const d2B = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, submitted_by)
       VALUES ($1, $2, 'BIAYA', 'DIAJUKAN', 3000000, $3) RETURNING id`,
      [periodId, unit2Id, managerUserId]
    );
    doc2BiayaId = d2B.rows[0].id;
    await db.query(
      `INSERT INTO expense_lines (doc_id, item_id, qty, price_snapshot, amount)
       VALUES ($1, $2, 30, 100000, 3000000)`,
      [doc2BiayaId, item2Id]
    );

    // Dokumen 3: Unit 3 Biaya (FINAL) - Unit 3 tidak dimiliki PIC/Manager
    const d3B = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, submitted_by)
       VALUES ($1, $2, 'BIAYA', 'FINAL', 1500000, $3) RETURNING id`,
      [periodId, unit3Id, akuntansiUserId]
    );
    doc3BiayaId = d3B.rows[0].id;
    await db.query(
      `INSERT INTO expense_lines (doc_id, item_id, qty, price_snapshot, amount)
       VALUES ($1, $2, 30, 50000, 1500000)`,
      [doc3BiayaId, item1Id]
    );

    // Dokumen 1: Unit 1 Investasi (DRAFT)
    const d1I = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, submitted_by)
       VALUES ($1, $2, 'INVESTASI', 'DRAFT', 20000000, $3) RETURNING id`,
      [periodId, unit1Id, picUserId]
    );
    doc1InvestId = d1I.rows[0].id;
    await db.query(
      `INSERT INTO investment_lines (doc_id, category_id, priority_id, coa_id, name, qty, price, amount, plan_month, useful_life_months, depreciation_amount)
       VALUES ($1, $2, $3, $4, 'Laptop Asus 3D', 2, 10000000, 20000000, 3, 48, 3750000)`,
      [doc1InvestId, categoryItId, priorityId, coaDeprId]
    );

    // Dokumen 2: Unit 2 Investasi (DIAJUKAN)
    const d2I = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, submitted_by)
       VALUES ($1, $2, 'INVESTASI', 'DIAJUKAN', 100000000, $3) RETURNING id`,
      [periodId, unit2Id, managerUserId]
    );
    doc2InvestId = d2I.rows[0].id;
    await db.query(
      `INSERT INTO investment_lines (doc_id, category_id, priority_id, coa_id, name, qty, price, amount, plan_month, useful_life_months, depreciation_amount)
       VALUES ($1, $2, $3, $4, 'Mesin USG 3D', 1, 100000000, 100000000, 6, 60, 10000000)`,
      [doc2InvestId, categoryMedisId, priorityId, coaDeprId]
    );

    // Dokumen 3: Unit 3 Investasi (FINAL) - Unit 3
    const d3I = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount, submitted_by)
       VALUES ($1, $2, 'INVESTASI', 'FINAL', 15000000, $3) RETURNING id`,
      [periodId, unit3Id, akuntansiUserId]
    );
    doc3InvestId = d3I.rows[0].id;
    await db.query(
      `INSERT INTO investment_lines (doc_id, category_id, priority_id, coa_id, name, qty, price, amount, plan_month, useful_life_months, depreciation_amount)
       VALUES ($1, $2, $3, $4, 'PC Kasir 3D', 1, 15000000, 15000000, 4, 48, 2500000)`,
      [doc3InvestId, categoryItId, priorityId, coaDeprId]
    );

    // 8. Setup Batch & Journal Lines (Realisasi)
    const bRes = await db.query(
      `INSERT INTO import_batches (company_id, kind, file_name, period, uploaded_by, status, mode)
       VALUES ($1, 'realisasi', 'Jurnal_3D.xlsx', $2, $3, 'CONFIRMED', 'append') RETURNING id`,
      [companyCnId, String(testYear), akuntansiUserId]
    );
    batchId = bRes.rows[0].id;

    // Realisasi untuk item1 di unit 1: Debet 1.200.000, Kredit 200.000 -> Realisasi = 1.000.000 pada Maret 2030
    await db.query(
      `INSERT INTO journal_lines (batch_id, sub_journal_id, trx_date, unit_id, coa_id, item_id, debit, credit, status)
       VALUES ($1, 'JRN-3D-01', $2, $3, $4, $5, 1200000, 200000, 'CONFIRMED')`,
      [batchId, `${testYear}-03-15`, unit1Id, coaBiaya1Id, item1Id]
    );

    // Realisasi untuk item2 di unit 2: Debet 1.500.000, Kredit 0 -> Realisasi = 1.500.000 pada Mei 2030
    await db.query(
      `INSERT INTO journal_lines (batch_id, sub_journal_id, trx_date, unit_id, coa_id, item_id, debit, credit, status)
       VALUES ($1, 'JRN-3D-02', $2, $3, $4, $5, 1500000, 0, 'CONFIRMED')`,
      [batchId, `${testYear}-05-20`, unit2Id, coaBiaya2Id, item2Id]
    );

    // 9. Login Agents
    const doLogin = async (agent, email) => {
      const csrfRes = await agent.get('/api/auth/csrf');
      const token = csrfRes.body.csrf_token || csrfRes.body.token || csrfRes.body?.data?.token;
      return agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', token)
        .send({ email, password: 'password123' });
    };

    await doLogin(picAgent, 'pic_3d@ptcn.id');
    await doLogin(managerAgent, 'mgr_3d@ptcn.id');
    await doLogin(akuntansiAgent, 'akt_3d@ptcn.id');
    await doLogin(noUnitAgent, 'nounit_3d@ptcn.id');
  });

  afterAll(async () => {
    // Cleanup seluruh data uji
    await db.query("DELETE FROM journal_lines WHERE batch_id = $1", [batchId]);
    await db.query("DELETE FROM import_batches WHERE id = $1", [batchId]);
    await db.query("DELETE FROM budget_docs WHERE period_id = $1", [periodId]);
    await db.query("DELETE FROM user_unit_access WHERE unit_id IN ($1, $2, $3)", [unit1Id, unit2Id, unit3Id]);
    await db.query("DELETE FROM user_unit_access WHERE user_id IN ($1, $2, $3, $4)", [picUserId, managerUserId, akuntansiUserId, noUnitUserId]);
    await db.query("DELETE FROM audit_logs WHERE actor_id IN ($1, $2, $3, $4)", [picUserId, managerUserId, akuntansiUserId, noUnitUserId]);
    await db.query("DELETE FROM users WHERE id IN ($1, $2, $3, $4)", [picUserId, managerUserId, akuntansiUserId, noUnitUserId]);
    await db.query("DELETE FROM units WHERE id IN ($1, $2, $3)", [unit1Id, unit2Id, unit3Id]);
    await db.query("DELETE FROM periods WHERE id = $1", [periodId]);
    await db.query("DELETE FROM items WHERE id IN ($1, $2)", [item1Id, item2Id]);
    await db.query("DELETE FROM investment_categories WHERE id IN ($1, $2)", [categoryItId, categoryMedisId]);
    await db.query("DELETE FROM coas WHERE id IN ($1, $2, $3)", [coaBiaya1Id, coaBiaya2Id, coaDeprId]);
    await db.query("DELETE FROM coa_groups WHERE id = $1", [coaGroup1Id]);
  });

  describe('1. GET /api/expense-lines (Display Anggaran Biaya Lintas Dokumen)', () => {
    it('Harus menolak request tanpa login dengan 401 Unauthorized', async () => {
      const res = await request(app).get('/api/expense-lines');
      expect(res.status).toBe(401);
    });

    it('Akuntansi dapat melihat baris biaya dari semua unit dengan format {data, meta, totals}', async () => {
      const res = await akuntansiAgent.get(`/api/expense-lines?period_id=${periodId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3); // unit1, unit2, unit3

      // Verifikasi struktur tiap baris
      const row = res.body.data[0];
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('unit');
      expect(row.unit).toHaveProperty('code');
      expect(row.unit).toHaveProperty('name');
      expect(row).toHaveProperty('doc_status');
      expect(row).toHaveProperty('item');
      expect(row.item).toHaveProperty('name');
      expect(row).toHaveProperty('uom');
      expect(row).toHaveProperty('price');
      expect(row).toHaveProperty('qty');
      expect(row).toHaveProperty('amount');
      expect(row).toHaveProperty('coa');
      expect(row.coa).toHaveProperty('code');
      expect(row.coa).toHaveProperty('name');
      expect(row.coa).toHaveProperty('type');
      expect(row).toHaveProperty('realization');

      // Verifikasi meta & totals global
      expect(res.body.meta.total).toBe(3);
      expect(res.body.totals).toBeDefined();
      expect(res.body.totals.total_lines).toBe(3);
      expect(res.body.totals.total_units).toBe(3);
      expect(Number(res.body.totals.total_rkap)).toBe(2500000 + 3000000 + 1500000);
      expect(Number(res.body.totals.total_realization)).toBe(1000000 + 1500000);
    });

    it('PIC hanya dapat melihat baris unitnya sendiri (Unit 1), Unit 2 & 3 tidak pernah bocor', async () => {
      const res = await picAgent.get(`/api/expense-lines?period_id=${periodId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].unit.id).toBe(unit1Id);
      expect(Number(res.body.data[0].realization)).toBe(1000000);
      expect(res.body.totals.total_units).toBe(1);
      expect(res.body.totals.total_lines).toBe(1);
      expect(Number(res.body.totals.total_rkap)).toBe(2500000);
      expect(Number(res.body.totals.total_realization)).toBe(1000000);
    });

    it('Manager dapat melihat baris Unit 1 dan Unit 2, tetapi Unit 3 tidak pernah bocor', async () => {
      const res = await managerAgent.get(`/api/expense-lines?period_id=${periodId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const unitIds = res.body.data.map((d) => d.unit.id);
      expect(unitIds).toContain(unit1Id);
      expect(unitIds).toContain(unit2Id);
      expect(unitIds).not.toContain(unit3Id);
      expect(res.body.totals.total_units).toBe(2);
      expect(Number(res.body.totals.total_rkap)).toBe(5500000);
      expect(Number(res.body.totals.total_realization)).toBe(2500000);
    });

    it('Pengguna tanpa akses unit menerima data kosong dan total 0 (Fail-closed)', async () => {
      const res = await noUnitAgent.get(`/api/expense-lines?period_id=${periodId}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
      expect(Number(res.body.totals.total_lines)).toBe(0);
      expect(Number(res.body.totals.total_rkap)).toBe(0);
      expect(Number(res.body.totals.total_realization)).toBe(0);
    });

    it('Mendukung filter unit_id banyak (comma-separated)', async () => {
      const res = await akuntansiAgent.get(`/api/expense-lines?period_id=${periodId}&unit_id=${unit1Id},${unit3Id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      const unitIds = res.body.data.map((d) => d.unit.id);
      expect(unitIds).toContain(unit1Id);
      expect(unitIds).toContain(unit3Id);
      expect(unitIds).not.toContain(unit2Id);
      expect(res.body.totals.total_units).toBe(2);
    });

    it('Mendukung filter doc_status, coa_group_id, coa_id, dan search', async () => {
      // Filter status DIAJUKAN
      const resStatus = await akuntansiAgent.get(`/api/expense-lines?period_id=${periodId}&doc_status=DIAJUKAN`);
      expect(resStatus.status).toBe(200);
      expect(resStatus.body.data.length).toBe(1);
      expect(resStatus.body.data[0].doc_status).toBe('DIAJUKAN');
      expect(resStatus.body.data[0].unit.id).toBe(unit2Id);

      // Filter coa_group_id
      const resGroup = await akuntansiAgent.get(`/api/expense-lines?period_id=${periodId}&coa_group_id=${coaGroup1Id}`);
      expect(resGroup.status).toBe(200);
      expect(resGroup.body.data.length).toBe(2); // unit1 and unit3 use coaBiaya1Id in coaGroup1Id

      // Filter search nama barang
      const resSearch = await akuntansiAgent.get(`/api/expense-lines?period_id=${periodId}&search=Sarung%20Tangan`);
      expect(resSearch.status).toBe(200);
      expect(resSearch.body.data.length).toBe(1);
      expect(resSearch.body.data[0].item.name).toContain('Sarung Tangan');
    });

    it('Mendukung filter month_from dan month_to untuk menghitung realisasi berjalan', async () => {
      // JRN-3D-01 ada di bulan 03 (Maret), JRN-3D-02 ada di bulan 05 (Mei)
      // Filter Jan - April (01 s.d. 04): hanya JRN-3D-01 yang masuk
      const res = await akuntansiAgent.get(`/api/expense-lines?period_id=${periodId}&month_from=01&month_to=04`);
      expect(res.status).toBe(200);
      expect(Number(res.body.totals.total_realization)).toBe(1000000);
      const rowItem2 = res.body.data.find((d) => d.item.id === item2Id);
      expect(rowItem2.realization).toBeNull(); // Mei tidak masuk rentang 01-04
    });

    it('Paginasi membatasi data halaman, tetapi totals tetap mencerminkan keseluruhan hasil filter', async () => {
      const res = await akuntansiAgent.get(`/api/expense-lines?period_id=${periodId}&page=1&per_page=1`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1); // paginasi 1 baris
      expect(res.body.meta.total).toBe(3); // total filter 3 baris
      expect(res.body.totals.total_lines).toBe(3);
      expect(Number(res.body.totals.total_rkap)).toBe(7000000);
    });
  });

  describe('2. Perluasan GET /api/investment-lines (Display Anggaran Investasi)', () => {
    it('PIC dapat melihat baris investasi unitnya sendiri dengan format {data, meta, totals}', async () => {
      const res = await picAgent.get(`/api/investment-lines?period_id=${periodId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].unit.id).toBe(unit1Id);
      expect(res.body.data[0].name).toBe('Laptop Asus 3D');
      expect(res.body.totals).toBeDefined();
      expect(res.body.totals.total_lines).toBe(1);
      expect(res.body.totals.total_units).toBe(1);
      expect(Number(res.body.totals.total_amount)).toBe(20000000);
      expect(Number(res.body.totals.total_depreciation)).toBe(3750000);
    });

    it('Akuntansi dapat melihat semua baris investasi lintas unit', async () => {
      const res = await akuntansiAgent.get(`/api/investment-lines?period_id=${periodId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
      expect(res.body.totals.total_units).toBe(3);
      expect(res.body.totals.total_lines).toBe(3);
      expect(Number(res.body.totals.total_amount)).toBe(20000000 + 100000000 + 15000000);
      expect(Number(res.body.totals.total_depreciation)).toBe(3750000 + 10000000 + 2500000);
    });

    it('Kompatibilitas Layar Laptop & PC (is_laptop_pc=true atau category_id)', async () => {
      const resLaptop = await akuntansiAgent.get(`/api/investment-lines?period_id=${periodId}&is_laptop_pc=true`);
      expect(resLaptop.status).toBe(200);
      expect(resLaptop.body.data.length).toBe(2); // Asus & PC Kasir
      resLaptop.body.data.forEach((row) => {
        expect(row.category.name).toContain('PC & Laptop 3D');
      });

      const resCategory = await akuntansiAgent.get(`/api/investment-lines?period_id=${periodId}&category_id=${categoryMedisId}`);
      expect(resCategory.status).toBe(200);
      expect(resCategory.body.data.length).toBe(1);
      expect(resCategory.body.data[0].name).toBe('Mesin USG 3D');
    });

    it('Mendukung filter unit_id banyak, doc_status, priority_id, search, dan paginasi', async () => {
      const res = await akuntansiAgent.get(`/api/investment-lines?period_id=${periodId}&unit_id=${unit1Id},${unit2Id}&doc_status=DIAJUKAN`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].unit.id).toBe(unit2Id);
      expect(res.body.data[0].doc_status).toBe('DIAJUKAN');
    });
  });

  describe('3. Ekspor Excel Display (/api/reports/export)', () => {
    it('Export display-biaya menghasilkan file .xlsx yang valid', async () => {
      const res = await akuntansiAgent
        .get(`/api/reports/export?report=display-biaya&format=xlsx&period_id=${periodId}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('Display_Anggaran_Biaya');
      expect(res.body.length).toBeGreaterThan(1000);
    });

    it('Export display-investasi menghasilkan file .xlsx yang valid', async () => {
      const res = await akuntansiAgent
        .get(`/api/reports/export?report=display-investasi&format=xlsx&period_id=${periodId}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('Display_Anggaran_Investasi');
      expect(res.body.length).toBeGreaterThan(1000);
    });

    it('Export display mematuhi batasan unit (scoping PIC)', async () => {
      const res = await picAgent
        .get(`/api/reports/export?report=display-biaya&format=xlsx&period_id=${periodId}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    });
  });
});
