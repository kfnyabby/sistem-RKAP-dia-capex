import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Comprehensive Security & Phase 8 Test Suite', () => {
  let unauthAgent;
  let picAgent;
  let managerAgent;
  let akuntansiAgent;

  let picUserId;
  let managerUserId;
  let akuntansiUserId;

  let companyCnId;
  let companyCnhId;

  let unit1Id; // CN Unit 1 - assigned to PIC & Manager
  let unit2Id; // CN Unit 2 - assigned to Manager only
  let unit3Id; // CNH Unit 3 - CNH (outside PIC & Manager scope)

  let periodCnId;
  let periodCnhId;
  const testYear = 2030; // Tahun terisolasi

  let docUnit1BiayaId;
  let docUnit2BiayaId;
  let docUnit3BiayaId;

  let itemTestId;
  let groupCnId;
  let groupCnhId;

  beforeAll(async () => {
    unauthAgent = request.agent(app);
    picAgent = request.agent(app);
    managerAgent = request.agent(app);
    akuntansiAgent = request.agent(app);

    // 0. Pre-cleanup
    await db.query('DELETE FROM budget_docs WHERE period_id IN (SELECT id FROM periods WHERE year = $1)', [testYear]);
    await db.query("DELETE FROM user_unit_access WHERE unit_id IN (SELECT id FROM units WHERE code IN ('8881', '8882', '8883'))");
    await db.query("DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email IN ('pic_f8@ptcn.id', 'manager_f8@ptcn.id', 'akuntansi_f8@ptcn.id'))");
    await db.query("DELETE FROM user_unit_access WHERE user_id IN (SELECT id FROM users WHERE email IN ('pic_f8@ptcn.id', 'manager_f8@ptcn.id', 'akuntansi_f8@ptcn.id'))");
    await db.query("DELETE FROM users WHERE email IN ('pic_f8@ptcn.id', 'manager_f8@ptcn.id', 'akuntansi_f8@ptcn.id')");
    await db.query("DELETE FROM units WHERE code IN ('8881', '8882', '8883')");
    await db.query('DELETE FROM periods WHERE year = $1', [testYear]);
    await db.query("DELETE FROM org_groups WHERE name IN ('Instalasi SecTest CN', 'Instalasi SecTest CNH')");
    await db.query("DELETE FROM items WHERE code = 'ITM-SEC-01'");

    // 1. Setup User Uji Terisolasi (agar tidak mengganggu user seed asli)
    const baseHashRes = await db.query('SELECT password_hash FROM users WHERE id = 1 LIMIT 1');
    const testHash = baseHashRes.rows[0]?.password_hash;

    const uPicRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('PIC SecTest', 'pic_f8@ptcn.id', $1, 'pic', true) RETURNING id`,
      [testHash]
    );
    picUserId = uPicRes.rows[0].id;

    const uMgrRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Manager SecTest', 'manager_f8@ptcn.id', $1, 'manager', true) RETURNING id`,
      [testHash]
    );
    managerUserId = uMgrRes.rows[0].id;

    const uAktRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Akuntansi SecTest', 'akuntansi_f8@ptcn.id', $1, 'akuntansi', true) RETURNING id`,
      [testHash]
    );
    akuntansiUserId = uAktRes.rows[0].id;

    // 2. Setup Perusahaan & Periode 2030
    const compRes = await db.query("SELECT id, code FROM companies WHERE code IN ('CN', 'CNH') ORDER BY code ASC");
    for (const c of compRes.rows) {
      if (c.code === 'CN') companyCnId = c.id;
      if (c.code === 'CNH') companyCnhId = c.id;
    }

    const pCnRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state)
       VALUES ($1, $2, 'PENGISIAN', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days', 'BUKA')
       RETURNING id`,
      [companyCnId, testYear]
    );
    periodCnId = pCnRes.rows[0].id;

    const pCnhRes = await db.query(
      `INSERT INTO periods (company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state)
       VALUES ($1, $2, 'PENGISIAN', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days', 'BUKA')
       RETURNING id`,
      [companyCnhId, testYear]
    );
    periodCnhId = pCnhRes.rows[0].id;

    // 3. Setup Org Groups & Units
    const gCn = await db.query(
      `INSERT INTO org_groups (company_id, name, type) VALUES ($1, 'Instalasi SecTest CN', 'instalasi') RETURNING id`,
      [companyCnId]
    );
    groupCnId = gCn.rows[0].id;

    const gCnh = await db.query(
      `INSERT INTO org_groups (company_id, name, type) VALUES ($1, 'Instalasi SecTest CNH', 'instalasi') RETURNING id`,
      [companyCnhId]
    );
    groupCnhId = gCnh.rows[0].id;

    const u1 = await db.query(
      `INSERT INTO units (company_id, group_id, code, name, is_active) VALUES ($1, $2, '8881', 'Unit Sec 1 (MCU)', true) RETURNING id`,
      [companyCnId, groupCnId]
    );
    unit1Id = u1.rows[0].id;

    const u2 = await db.query(
      `INSERT INTO units (company_id, group_id, code, name, is_active) VALUES ($1, $2, '8882', 'Unit Sec 2 (Lab)', true) RETURNING id`,
      [companyCnId, groupCnId]
    );
    unit2Id = u2.rows[0].id;

    const u3 = await db.query(
      `INSERT INTO units (company_id, group_id, code, name, is_active) VALUES ($1, $2, '8883', 'Unit Sec 3 (CNH)', true) RETURNING id`,
      [companyCnhId, groupCnhId]
    );
    unit3Id = u3.rows[0].id;

    // 4. Penugasan Unit (user_unit_access)
    // PIC hanya unit 1
    await db.query(`INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2)`, [picUserId, unit1Id]);
    // Manager unit 1 & unit 2
    await db.query(`INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2), ($1, $3)`, [managerUserId, unit1Id, unit2Id]);
    // Akuntansi: semua unit
    await db.query(
      `INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2), ($1, $3), ($1, $4)`,
      [akuntansiUserId, unit1Id, unit2Id, unit3Id]
    );

    // 5. Setup Item Master & Harga
    const itmRes = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ('ITM-SEC-01', 'Kassa SecTest', 'Pack', 1, true) RETURNING id`
    );
    itemTestId = itmRes.rows[0].id;
    await db.query(
      `INSERT INTO item_prices (item_id, company_id, price) VALUES ($1, $2, 25000)`,
      [itemTestId, companyCnId]
    );

    // 6. Setup Dokumen Uji untuk Unit 1, Unit 2, Unit 3
    const d1 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount) VALUES ($1, $2, 'BIAYA', 'DRAFT', 0) RETURNING id`,
      [periodCnId, unit1Id]
    );
    docUnit1BiayaId = d1.rows[0].id;

    const d2 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount) VALUES ($1, $2, 'BIAYA', 'DRAFT', 0) RETURNING id`,
      [periodCnId, unit2Id]
    );
    docUnit2BiayaId = d2.rows[0].id;

    const d3 = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status, total_amount) VALUES ($1, $2, 'BIAYA', 'DRAFT', 0) RETURNING id`,
      [periodCnhId, unit3Id]
    );
    docUnit3BiayaId = d3.rows[0].id;

    // 7. Login Masing-masing Aktor
    const csrfDya = await akuntansiAgent.get('/api/auth/csrf');
    await akuntansiAgent.post('/api/auth/login').set('X-CSRF-Token', csrfDya.body.csrf_token).send({
      email: 'akuntansi_f8@ptcn.id',
      password: 'password123',
    });

    const csrfBudi = await managerAgent.get('/api/auth/csrf');
    await managerAgent.post('/api/auth/login').set('X-CSRF-Token', csrfBudi.body.csrf_token).send({
      email: 'manager_f8@ptcn.id',
      password: 'password123',
    });

    const csrfRina = await picAgent.get('/api/auth/csrf');
    await picAgent.post('/api/auth/login').set('X-CSRF-Token', csrfRina.body.csrf_token).send({
      email: 'pic_f8@ptcn.id',
      password: 'password123',
    });
  });

  afterAll(async () => {
    // Cleanup teratur
    await db.query("UPDATE settings SET value = '80'::jsonb WHERE key = 'warning_percent'");
    await db.query("UPDATE settings SET value = '100'::jsonb WHERE key = 'critical_percent'");
    await db.query("UPDATE settings SET value = '5000000'::jsonb WHERE key = 'investment_threshold'");
    await db.query('DELETE FROM expense_lines WHERE doc_id IN ($1, $2, $3)', [docUnit1BiayaId, docUnit2BiayaId, docUnit3BiayaId]);
    await db.query('DELETE FROM budget_docs WHERE id IN ($1, $2, $3)', [docUnit1BiayaId, docUnit2BiayaId, docUnit3BiayaId]);
    await db.query('DELETE FROM item_prices WHERE item_id = $1', [itemTestId]);
    await db.query('DELETE FROM items WHERE id = $1', [itemTestId]);
    await db.query('DELETE FROM user_unit_access WHERE unit_id IN ($1, $2, $3)', [unit1Id, unit2Id, unit3Id]);
    await db.query('DELETE FROM audit_logs WHERE actor_id IN ($1, $2, $3)', [picUserId, managerUserId, akuntansiUserId]);
    await db.query('DELETE FROM user_unit_access WHERE user_id IN ($1, $2, $3)', [picUserId, managerUserId, akuntansiUserId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [picUserId, managerUserId, akuntansiUserId]);
    await db.query('DELETE FROM units WHERE id IN ($1, $2, $3)', [unit1Id, unit2Id, unit3Id]);
    await db.query('DELETE FROM org_groups WHERE id IN ($1, $2)', [groupCnId, groupCnhId]);
    await db.query('DELETE FROM periods WHERE id IN ($1, $2)', [periodCnId, periodCnhId]);
  });

  describe('1. Hardening HTTP Headers via Helmet & Format Galat Seragam', () => {
    it('Respons menyertakan header keamanan HTTP standar dari Helmet', async () => {
      const res = await unauthAgent.get('/api/auth/csrf');
      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(res.headers).toHaveProperty('x-frame-options');
    });

    it('Format galat mengembalikan struktur seragam { success: false, message, code? }', async () => {
      const res = await unauthAgent.post('/api/auth/login').send({ email: 'unknown@ptcn.id', password: 'wrong' });
      // Tanpa CSRF token ditolak 403
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('2. Matriks Keamanan: Penolakan Akses Tanpa Login (401 Unauthorized)', () => {
    it('Endpoint mutasi anggaran biaya menolak unauthenticated request dengan 401/403', async () => {
      const res = await unauthAgent.put(`/api/budget-docs/${docUnit1BiayaId}/expense-lines`).send({
        lines: [{ item_id: itemTestId, qty: 5 }],
      });
      expect([401, 403]).toContain(res.status);
    });

    it('Endpoint workflow submit menolak unauthenticated request dengan 401/403', async () => {
      const res = await unauthAgent.post(`/api/budget-docs/${docUnit1BiayaId}/submit`);
      expect([401, 403]).toContain(res.status);
    });

    it('Endpoint settings PUT menolak unauthenticated request dengan 401/403', async () => {
      const res = await unauthAgent.put('/api/settings').send({ investment_threshold: 6000000 });
      expect([401, 403]).toContain(res.status);
    });

    it('Endpoint audit-logs GET menolak unauthenticated request dengan 401', async () => {
      const res = await unauthAgent.get('/api/audit-logs');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Matriks Keamanan: Penolakan Role Tidak Berwenang (403 Forbidden)', () => {
    it('PIC ditolak (403) saat mencoba mengubah pengaturan sistem (PUT /api/settings)', async () => {
      const csrf = await picAgent.get('/api/auth/csrf');
      const res = await picAgent
        .put('/api/settings')
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ investment_threshold: 6000000 });
      expect(res.status).toBe(403);
    });

    it('PIC ditolak (403) saat mencoba membaca pengaturan sistem (GET /api/settings)', async () => {
      const res = await picAgent.get('/api/settings');
      expect(res.status).toBe(403);
    });

    it('PIC ditolak (403) saat mencoba membaca jejak audit (GET /api/audit-logs)', async () => {
      const res = await picAgent.get('/api/audit-logs');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ROLE');
    });

    it('PIC ditolak (403) saat mencoba menyetujui dokumen (POST /api/budget-docs/:id/approve)', async () => {
      const csrf = await picAgent.get('/api/auth/csrf');
      const res = await picAgent
        .post(`/api/budget-docs/${docUnit1BiayaId}/approve`)
        .set('X-CSRF-Token', csrf.body.csrf_token);
      expect(res.status).toBe(403);
    });

    it('PIC ditolak (403) saat mencoba mengakses manajemen pengguna (/api/users)', async () => {
      const res = await picAgent.get('/api/users');
      expect(res.status).toBe(403);
    });

    it('PIC ditolak (403) saat mencoba mengunggah import jurnal realisasi', async () => {
      const csrf = await picAgent.get('/api/auth/csrf');
      const res = await picAgent
        .post('/api/realization-imports')
        .set('X-CSRF-Token', csrf.body.csrf_token);
      expect(res.status).toBe(403);
    });
  });

  describe('4. Matriks Keamanan: Penolakan Unit di Luar Wewenang (403 Forbidden)', () => {
    it('PIC Unit 1 ditolak (403) saat mencoba menambah baris biaya pada dokumen Unit 2', async () => {
      const csrf = await picAgent.get('/api/auth/csrf');
      const res = await picAgent
        .put(`/api/budget-docs/${docUnit2BiayaId}/expense-lines`)
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ lines: [{ item_id: itemTestId, qty: 10 }] });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/tidak memiliki wewenang|akses ditolak/i);
    });

    it('PIC Unit 1 ditolak (403) saat mencoba mengajukan (submit) dokumen Unit 2', async () => {
      const csrf = await picAgent.get('/api/auth/csrf');
      const res = await picAgent
        .post(`/api/budget-docs/${docUnit2BiayaId}/submit`)
        .set('X-CSRF-Token', csrf.body.csrf_token);
      expect(res.status).toBe(403);
    });

    it('Manager Unit 1 & 2 ditolak (403) saat memanipulasi dokumen Unit 3 (CNH)', async () => {
      const csrf = await managerAgent.get('/api/auth/csrf');
      const res = await managerAgent
        .put(`/api/budget-docs/${docUnit3BiayaId}/expense-lines`)
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ lines: [{ item_id: itemTestId, qty: 10 }] });
      expect(res.status).toBe(403);
    });

    it('Manager ditolak (403) saat memfilter audit-logs untuk unit di luar cakupannya', async () => {
      const res = await managerAgent.get(`/api/audit-logs?unit_id=${unit3Id}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('UNIT_ACCESS_DENIED');
    });
  });

  describe('5. Endpoint Audit Logs (/api/audit-logs)', () => {
    it('Akuntansi dapat membaca seluruh log jejak audit dengan paginasi', async () => {
      const res = await akuntansiAgent.get('/api/audit-logs?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 10);
      expect(res.body.pagination).toHaveProperty('total_count');
      expect(res.body.pagination).toHaveProperty('total_pages');
    });

    it('Manager dapat membaca log audit sebatas unit dalam cakupan wewenangnya', async () => {
      const res = await managerAgent.get('/api/audit-logs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Mendukung filter berdasarkan action dan entity', async () => {
      const res = await akuntansiAgent.get('/api/audit-logs?action=UPDATE&entity=settings');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('6. Endpoint Settings (/api/settings) & Validasi Zod', () => {
    it('Akuntansi berhasil membaca seluruh konfigurasi sistem aktif', async () => {
      const res = await akuntansiAgent.get('/api/settings');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('investment_threshold');
      expect(res.body.data).toHaveProperty('warning_percent');
    });

    it('Akuntansi berhasil memperbarui pengaturan valid dan tercatat di audit log', async () => {
      const csrf = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .put('/api/settings')
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({
          investment_threshold: 5500000,
          investment_threshold_basis: 'unit_price',
          warning_percent: 85,
          critical_percent: 100,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.investment_threshold).toBe(5500000);
      expect(res.body.data.warning_percent).toBe(85);

      // Verifikasi jejak audit tercatat
      const auditRes = await akuntansiAgent.get('/api/audit-logs?entity=settings&action=UPDATE&limit=5');
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.length).toBeGreaterThan(0);
    });

    it('Validasi Zod menolak investment_threshold negatif atau nol dengan 422', async () => {
      const csrf = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .put('/api/settings')
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ investment_threshold: -1000 });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('Validasi Zod menolak enum basis ambang investasi yang tidak sah dengan 422', async () => {
      const csrf = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .put('/api/settings')
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ investment_threshold_basis: 'asal_asalan' });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('Validasi Zod menolak critical_percent < warning_percent dengan 422', async () => {
      const csrf = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .put('/api/settings')
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ warning_percent: 90, critical_percent: 70 });
      expect(res.status).toBe(422);
      expect(res.body.message).toContain('critical_percent harus lebih besar');
    });

    it('Validasi Zod menolak batas karakter teks di luar rentang (mis. > 2000) dengan 422', async () => {
      const csrf = await akuntansiAgent.get('/api/auth/csrf');
      const res = await akuntansiAgent
        .put('/api/settings')
        .set('X-CSRF-Token', csrf.body.csrf_token)
        .send({ investment_text_max_length: 5000 });
      expect(res.status).toBe(422);
    });
  });

  describe('7. Endpoint OpenAPI Docs (/api/docs)', () => {
    it('GET /api/docs/openapi.yaml menyajikan spesifikasi YAML lengkap', async () => {
      const res = await unauthAgent.get('/api/docs/openapi.yaml');
      expect(res.status).toBe(200);
      expect(res.text).toContain('openapi: 3.0.3');
      expect(res.text).toContain('API Sistem RKAP (DIA CAPEX)');
    });
  });
});
