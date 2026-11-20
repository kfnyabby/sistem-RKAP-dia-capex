import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Backend Enhancement Test Suite (Fase 1c)', () => {
  let accountantCookie;
  let accountantCsrf;
  let accountantId;

  let picCookie;
  let picCsrf;

  let testUserId;
  let testItemId;
  let testUnitId;

  // Helper untuk mendapatkan CSRF token dan cookie awal
  const getCsrf = async () => {
    const res = await request(app).get('/api/auth/csrf');
    expect(res.status).toBe(200);
    return {
      csrfToken: res.body.csrf_token,
      cookie: res.headers['set-cookie'],
    };
  };

  // Helper login
  const login = async (email, password) => {
    const { csrfToken: initCsrf, cookie: initCookie } = await getCsrf();
    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', initCookie)
      .set('X-CSRF-Token', initCsrf)
      .send({ email, password });
    expect(res.status).toBe(200);
    return {
      cookie: res.headers['set-cookie'],
      csrfToken: res.body.csrf_token,
      user: res.body.user,
    };
  };

  beforeAll(async () => {
    // Login sebagai Akuntansi (Dya)
    const acc = await login('dya@ptcn.id', 'password123');
    accountantCookie = acc.cookie;
    accountantCsrf = acc.csrfToken;
    accountantId = acc.user.user_id || acc.user.id;

    // Login sebagai PIC (Rina)
    const pic = await login('rina@ptcn.id', 'password123');
    picCookie = pic.cookie;
    picCsrf = pic.csrfToken;

    // Siapkan unit untuk pengujian
    const unitRes = await db.query('SELECT id FROM units ORDER BY id ASC LIMIT 1');
    testUnitId = unitRes.rows[0].id;

    // Buat pengguna khusus pengujian Fase 1c
    const userRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ('Fase1c Test User', 'fase1c_test@ptcn.id', '$2a$10$wT8K8U1h9xQ3NqKkP3E5U.zEaFkK5A7gV3z3kP3E5U.zEaFkK5A7g', 'pic', TRUE)
       RETURNING id`
    );
    testUserId = userRes.rows[0].id;

    // Pasangkan unit ke user uji
    await db.query(
      'INSERT INTO user_unit_access (user_id, unit_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [testUserId, testUnitId]
    );

    // Siapkan barang khusus untuk pengujian price history
    const itemRes = await db.query(
      `INSERT INTO items (code, name, group_name, uom, is_active)
       VALUES ('F1C-BRG-01', 'Barang Uji Fase 1c', 'Alat Uji', 'Pcs', TRUE)
       RETURNING id`
    );
    testItemId = itemRes.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (testUserId) {
        await db.query('DELETE FROM user_unit_access WHERE user_id = $1', [testUserId]);
        await db.query('DELETE FROM audit_logs WHERE entity = \'users\' AND entity_id = $1', [testUserId]);
        await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
      }
      if (testItemId) {
        await db.query('DELETE FROM item_price_history WHERE item_id = $1', [testItemId]);
        await db.query('DELETE FROM item_prices WHERE item_id = $1', [testItemId]);
        await db.query('DELETE FROM audit_logs WHERE entity = \'items\' AND entity_id = $1', [testItemId]);
        await db.query('DELETE FROM items WHERE id = $1', [testItemId]);
      }
      await db.query('DELETE FROM users WHERE email LIKE \'fase1c_%\'');
    } catch (err) {
      console.error('Cleanup error:', err.message);
    }
  });

  // =========================================================================
  // 1. GET /api/users Tanpa N+1
  // =========================================================================
  describe('1. GET /api/users: Perusahaan dan Unit dalam 1 Kueri', () => {
    it('Harus mengembalikan daftar pengguna lengkap dengan companies dan units dalam setiap baris', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', accountantCookie);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Cek struktur setiap baris
      for (const u of res.body.data) {
        expect(u.id).toBeDefined();
        expect(u.name).toBeDefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
        expect(u.companies).toBeDefined();
        expect(Array.isArray(u.companies)).toBe(true);
        expect(u.units).toBeDefined();
        expect(Array.isArray(u.units)).toBe(true);

        // Jika Akuntansi, companies harus berisi seluruh perusahaan (CN dan CNH)
        if (u.role === 'akuntansi') {
          expect(u.companies).toContain('CN');
          expect(u.companies).toContain('CNH');
        }
      }

      // Verifikasi test user yang memiliki testUnitId
      const targetUser = res.body.data.find((u) => u.id === testUserId);
      expect(targetUser).toBeDefined();
      expect(targetUser.units.length).toBeGreaterThan(0);
      expect(targetUser.units.some((un) => un.id === testUnitId)).toBe(true);
      expect(targetUser.units[0]).toHaveProperty('code');
      expect(targetUser.units[0]).toHaveProperty('name');
    });

    it('Filter role dan search tetap berfungsi akurat', async () => {
      const resRole = await request(app)
        .get('/api/users?role=pic')
        .set('Cookie', accountantCookie);

      expect(resRole.status).toBe(200);
      expect(resRole.body.data.every((u) => u.role === 'pic')).toBe(true);

      const resSearch = await request(app)
        .get('/api/users?search=Fase1c')
        .set('Cookie', accountantCookie);

      expect(resSearch.status).toBe(200);
      expect(resSearch.body.data.some((u) => u.id === testUserId)).toBe(true);
    });

    it('Ditolak 403 jika diakses oleh role non-Akuntansi (PIC)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', picCookie);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 2. PUT /api/users/:id dengan unit_ids dalam 1 Transaksi
  // =========================================================================
  describe('2. PUT /api/users/:id: Profil dan Unit Atomis dalam Satu Transaksi', () => {
    it('Berhasil memperbarui nama, email, dan penugasan unit_ids dalam satu transaksi', async () => {
      // Ambil unit lain jika ada
      const allUnits = await db.query('SELECT id FROM units ORDER BY id ASC LIMIT 2');
      const newUnitIds = allUnits.rows.map((r) => r.id);

      const res = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf)
        .send({
          name: 'Fase1c Updated Name',
          unit_ids: newUnitIds,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Fase1c Updated Name');
      expect(res.body.unit_ids).toEqual(newUnitIds);

      // Verifikasi di database
      const userDb = await db.query('SELECT name FROM users WHERE id = $1', [testUserId]);
      expect(userDb.rows[0].name).toBe('Fase1c Updated Name');

      const unitsDb = await db.query(
        'SELECT unit_id FROM user_unit_access WHERE user_id = $1 ORDER BY unit_id ASC',
        [testUserId]
      );
      const assignedIds = unitsDb.rows.map((r) => r.unit_id);
      expect(assignedIds).toEqual(newUnitIds);

      // Verifikasi catatan audit log
      const auditDb = await db.query(
        'SELECT * FROM audit_logs WHERE entity = \'users\' AND entity_id = $1 ORDER BY id DESC LIMIT 1',
        [testUserId]
      );
      expect(auditDb.rows.length).toBe(1);
      expect(auditDb.rows[0].action).toBe('update_user');
      expect(auditDb.rows[0].new_value.unit_ids).toEqual(newUnitIds);
    });

    it('Rollback penuh jika salah satu unit_id tidak valid (semua batal disimpan)', async () => {
      const invalidUnitId = 99999999;
      const res = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf)
        .send({
          name: 'Should Rollback Name',
          unit_ids: [invalidUnitId],
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/unit tidak valid/i);

      // Pastikan nama di database TIDAK berubah (rollback berhasil)
      const userDb = await db.query('SELECT name FROM users WHERE id = $1', [testUserId]);
      expect(userDb.rows[0].name).toBe('Fase1c Updated Name');
    });
  });

  // =========================================================================
  // 3. POST /api/users/:id/reset-password
  // =========================================================================
  describe('3. POST /api/users/:id/reset-password (Khusus Akuntansi)', () => {
    it('Ditolak (403) jika Akuntansi mencoba mereset password akunnya sendiri', async () => {
      const res = await request(app)
        .post(`/api/users/${accountantId}/reset-password`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf)
        .send({ new_password: 'newSecretPassword123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/akun Anda sendiri/i);
    });

    it('Ditolak (403) jika dipanggil oleh role non-Akuntansi', async () => {
      const res = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Cookie', picCookie)
        .set('X-CSRF-Token', picCsrf)
        .send({ new_password: 'newSecretPassword123' });

      expect(res.status).toBe(403);
    });

    it('Berhasil mereset dengan kata sandi manual, mencabut sesi lama, dan mencatat audit tanpa kata sandi', async () => {
      // 1. Buat sesi aktif palsu untuk testUser di tabel session
      await db.query("DELETE FROM \"session\" WHERE sid = 'fake_test_sid_1'");
      await db.query(
        `INSERT INTO "session" (sid, sess, expire)
         VALUES ('fake_test_sid_1', $1, NOW() + INTERVAL '1 day')`,
        [JSON.stringify({ cookie: {}, userId: testUserId })]
      );

      // Verifikasi sesi terdaftar
      const checkSessBefore = await db.query(
        'SELECT sid FROM "session" WHERE (sess::jsonb->>\'userId\')::int = $1',
        [testUserId]
      );
      expect(checkSessBefore.rows.length).toBeGreaterThan(0);

      const manualPassword = 'manualPassword999';
      const res = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf)
        .send({ new_password: manualPassword });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/berhasil direset/i);
      expect(res.body.temporary_password).toBe(manualPassword);

      // 2. Verifikasi seluruh sesi testUser telah dicabut
      const checkSessAfter = await db.query(
        'SELECT sid FROM "session" WHERE (sess::jsonb->>\'userId\')::int = $1',
        [testUserId]
      );
      expect(checkSessAfter.rows.length).toBe(0);

      // 3. Verifikasi pengguna dapat login dengan kata sandi baru
      const loginRes = await login('fase1c_test@ptcn.id', manualPassword);
      expect(loginRes.user.email).toBe('fase1c_test@ptcn.id');

      // 4. Verifikasi audit log TIDAK memuat kata sandi (sanitized)
      const auditLog = await db.query(
        'SELECT * FROM audit_logs WHERE entity = \'users\' AND entity_id = $1 AND action = \'reset_password\' ORDER BY id DESC LIMIT 1',
        [testUserId]
      );
      expect(auditLog.rows.length).toBe(1);
      const auditStr = JSON.stringify(auditLog.rows[0]);
      expect(auditStr).not.toContain(manualPassword);
      expect(auditLog.rows[0].new_value.method).toBe('manual');
    });

    it('Berhasil mereset dengan kata sandi acak otomatis jika new_password dikosongkan', async () => {
      const res = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.temporary_password).toBeDefined();
      expect(res.body.temporary_password.length).toBe(12);

      const autoPassword = res.body.temporary_password;

      // Verifikasi bisa login dengan password acak tersebut
      const loginRes = await login('fase1c_test@ptcn.id', autoPassword);
      expect(loginRes.user.email).toBe('fase1c_test@ptcn.id');

      // Verifikasi audit log method: generated
      const auditLog = await db.query(
        'SELECT * FROM audit_logs WHERE entity = \'users\' AND entity_id = $1 AND action = \'reset_password\' ORDER BY id DESC LIMIT 1',
        [testUserId]
      );
      expect(auditLog.rows[0].new_value.method).toBe('generated');
    });
  });

  // =========================================================================
  // 4. item_price_history & GET /api/items/:id/price-history
  // =========================================================================
  describe('4. item_price_history & GET /api/items/:id/price-history', () => {
    it('Ditolak (403) jika diakses oleh role non-Akuntansi (PIC)', async () => {
      const res = await request(app)
        .get(`/api/items/${testItemId}/price-history`)
        .set('Cookie', picCookie);

      expect(res.status).toBe(403);
    });

    it('Mengembalikan 404 jika item tidak ditemukan', async () => {
      const res = await request(app)
        .get('/api/items/99999999/price-history')
        .set('Cookie', accountantCookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/tidak ditemukan/i);
    });

    it('Pembaruan harga via PATCH /api/items/:id/prices mencatat ke item_price_history dan terbaca di GET /api/items/:id/price-history', async () => {
      // 1. Update harga pertama
      const patchRes1 = await request(app)
        .patch(`/api/items/${testItemId}/prices`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf)
        .send({
          prices: [
            { company_code: 'CN', price: 15000 },
            { company_code: 'CNH', price: 18000 },
          ],
        });
      expect(patchRes1.status).toBe(200);

      // 2. Update harga kedua (CN naik jadi 17500)
      const patchRes2 = await request(app)
        .patch(`/api/items/${testItemId}/prices`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf)
        .send({
          prices: [
            { company_code: 'CN', price: 17500 },
          ],
        });
      expect(patchRes2.status).toBe(200);

      // 3. Baca riwayat lewat GET /api/items/:id/price-history
      const historyRes = await request(app)
        .get(`/api/items/${testItemId}/price-history`)
        .set('Cookie', accountantCookie);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.success).toBe(true);
      expect(Array.isArray(historyRes.body.data)).toBe(true);
      expect(historyRes.body.data.length).toBeGreaterThanOrEqual(3);

      // Cek entri terbaru (perubahan CN dari 15000 ke 17500)
      const latest = historyRes.body.data[0];
      expect(latest.company_code).toBe('CN');
      expect(Number(latest.old_price)).toBe(15000);
      expect(Number(latest.new_price)).toBe(17500);
      expect(latest.source).toBe('manual');
      expect(latest.user_name).toBeDefined();
      expect(latest.created_at).toBeDefined();
    });
  });
});
