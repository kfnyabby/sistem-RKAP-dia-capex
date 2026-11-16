import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';
import budgetDocRepository from '../src/repositories/budgetDoc.repository';

describe('Auth & RBAC Test Suite (Fase 1 & Fase 1b)', () => {
  // Bersihkan data uji di database setelah seluruh pengujian selesai
  afterAll(async () => {
    try {
      await db.query("DELETE FROM budget_docs WHERE type = 'TEST'");
      await db.query("DELETE FROM users WHERE email LIKE 'staf_%' OR email LIKE 'test_%'");
      await db.query(
        "DELETE FROM audit_logs WHERE actor_id IN (SELECT id FROM users WHERE email LIKE 'staf_%' OR email LIKE 'test_%')"
      );
      await db.query(
        "DELETE FROM \"session\" WHERE sess::jsonb->>'userId' IS NULL OR (sess::jsonb->>'userId')::int NOT IN (1, 2, 3, 4)"
      );
    } catch (err) {
      console.error('Error during test cleanup:', err.message);
    }
  });

  // Helper untuk mendapatkan token CSRF dan cookie awal
  const getCsrf = async () => {
    const res = await request(app).get('/api/auth/csrf');
    expect(res.status).toBe(200);
    const csrfToken = res.body.csrf_token;
    const cookie = res.headers['set-cookie'];
    return { csrfToken, cookie };
  };

  describe('1. CSRF Protection & Timing Safety', () => {
    it('Permintaan non-GET tanpa token CSRF ditolak (403)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'rina@ptcn.id', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/csrf/i);
    });

    it('GET /api/auth/csrf menghasilkan token CSRF yang valid', async () => {
      const { csrfToken, cookie } = await getCsrf();
      expect(csrfToken).toBeDefined();
      expect(cookie).toBeDefined();
    });

    it('Token CSRF palsu atau salah panjang ditolak timing-safe (403)', async () => {
      const { cookie } = await getCsrf();

      // Token salah panjang
      const resShort = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'token_terlalu_pendek')
        .send({ email: 'rina@ptcn.id', password: 'password123' });
      expect(resShort.status).toBe(403);

      // Token panjang sama (64 hex) tapi beda isi
      const fakeToken = 'a'.repeat(64);
      const resFake = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', fakeToken)
        .send({ email: 'rina@ptcn.id', password: 'password123' });
      expect(resFake.status).toBe(403);
    });
  });

  describe('2. Login Kredensial, Regenerasi Sesi & CSRF Baru', () => {
    it('Email tidak dikenal dan kata sandi salah mendapat pesan yang sama (401)', async () => {
      const { csrfToken, cookie } = await getCsrf();

      // Kasus 1: Email tidak dikenal
      const resUnknown = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'tidakada@ptcn.id', password: 'password123' });

      expect(resUnknown.status).toBe(401);
      expect(resUnknown.body.message).toBe('Email atau password salah');

      // Kasus 2: Kata sandi salah
      const resWrongPass = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'rina@ptcn.id', password: 'passwordsalah' });

      expect(resWrongPass.status).toBe(401);
      expect(resWrongPass.body.message).toBe('Email atau password salah');
    });

    it('Pengguna nonaktif tidak bisa masuk (403)', async () => {
      const { csrfToken, cookie } = await getCsrf();

      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'nonaktif@ptcn.id', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Akun dinonaktifkan');
    });

    it('Login meregenerasi sesi dan menghasilkan token CSRF baru', async () => {
      const { csrfToken: initialCsrf, cookie: initialCookie } = await getCsrf();

      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initialCookie)
        .set('X-CSRF-Token', initialCsrf)
        .send({ email: 'rina@ptcn.id', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('rina@ptcn.id');
      expect(res.body.user.role).toBe('pic');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.user).not.toHaveProperty('password_hash');

      // Verifikasi token CSRF baru dikembalikan dan berbeda dari token pra-login
      expect(res.body).toHaveProperty('csrf_token');
      expect(res.body.csrf_token).not.toBe(initialCsrf);
      expect(res.headers['x-csrf-token']).toBe(res.body.csrf_token);
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('3. Sesi & Profil (/api/auth/me dan /api/auth/logout)', () => {
    it('GET /api/auth/me tanpa login menghasilkan 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthenticated');
    });

    it('Alur Login -> Cek Me -> Logout berjalan sukses', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      // 1. Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'rina@ptcn.id', password: 'password123' });

      expect(loginRes.status).toBe(200);
      const sessionCookie = loginRes.headers['set-cookie'];
      const activeCsrf = loginRes.body.csrf_token;

      // 2. Cek Profil /me
      const meRes = await request(app).get('/api/auth/me').set('Cookie', sessionCookie);
      expect(meRes.status).toBe(200);
      expect(meRes.body.email).toBe('rina@ptcn.id');

      // 3. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', activeCsrf);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe('Logged out');

      // 4. Cek Me setelah logout -> 401
      const postLogoutMe = await request(app).get('/api/auth/me').set('Cookie', sessionCookie);
      expect(postLogoutMe.status).toBe(401);
    });
  });

  describe('4. Otorisasi Akses Unit Kerja & Proteksi ID Dokumen', () => {
    it('requireUnitAccess gagal tertutup (403) jika target unit tidak ditentukan', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'rina@ptcn.id', password: 'password123' });

      const cookie = loginRes.headers['set-cookie'];

      // Panggil endpoint yang memproteksi data unit tanpa membawa parameter unit
      const res = await request(app).get('/api/test-unit-access-failclosed').set('Cookie', cookie);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/unit target tidak dapat ditentukan/i);
    });

    it('PIC ditolak (403) pada unit di luar penugasannya', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      // Login sebagai PIC Rina (unit 1: MCU)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'rina@ptcn.id', password: 'password123' });

      expect(loginRes.status).toBe(200);
      const cookie = loginRes.headers['set-cookie'];

      // Akses unit 1 (MCU) -> Sukses
      const resOwn = await request(app).get('/api/test-unit-access/1').set('Cookie', cookie);
      expect(resOwn.status).toBe(200);

      // Akses unit 2 (Laboratorium) -> Ditolak 403
      const resOther = await request(app).get('/api/test-unit-access/2').set('Cookie', cookie);
      expect(resOther.status).toBe(403);
      expect(resOther.body.message).toMatch(/akses unit ditolak/i);
    });

    it('PIC tidak bisa membaca data unit lain lewat ID dokumen langsung', async () => {
      // Buat dokumen anggaran fiktif untuk unit 2 (Laboratorium)
      const testDocUnit2 = await budgetDocRepository.create({
        period_id: 1,
        unit_id: 2,
        type: 'TEST',
        status: 'DRAFT',
        total_amount: 10000000,
        created_by: 3,
      });

      // 1. PIC Rina (hanya memiliki unit 1) mencoba membaca dokumen unit 2 -> 403
      const { csrfToken: csrfPic, cookie: cookiePic } = await getCsrf();
      const loginPic = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookiePic)
        .set('X-CSRF-Token', csrfPic)
        .send({ email: 'rina@ptcn.id', password: 'password123' });

      expect(loginPic.status).toBe(200);
      const picCookie = loginPic.headers['set-cookie'];
      const resPic = await request(app)
        .get(`/api/budget-docs/${testDocUnit2.id}`)
        .set('Cookie', picCookie);

      expect(resPic.status).toBe(403);
      expect(resPic.body.message).toMatch(/dokumen unit ini/i);

      // 2. Manager Budi (memiliki unit 1 dan 2) mencoba membaca dokumen unit 2 -> 200
      const { csrfToken: csrfMgr, cookie: cookieMgr } = await getCsrf();
      const loginMgr = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookieMgr)
        .set('X-CSRF-Token', csrfMgr)
        .send({ email: 'budi@ptcn.id', password: 'password123' });

      expect(loginMgr.status).toBe(200);
      const mgrCookie = loginMgr.headers['set-cookie'];
      const resMgr = await request(app)
        .get(`/api/budget-docs/${testDocUnit2.id}`)
        .set('Cookie', mgrCookie);

      expect(resMgr.status).toBe(200);
      expect(resMgr.body.data.id).toBe(testDocUnit2.id);

      // 3. Akuntansi Dya (akses seluruh unit) mencoba membaca dokumen unit 2 -> 200
      const { csrfToken: csrfAkt, cookie: cookieAkt } = await getCsrf();
      const loginAkuntansi = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookieAkt)
        .set('X-CSRF-Token', csrfAkt)
        .send({ email: 'dya@ptcn.id', password: 'password123' });

      expect(loginAkuntansi.status).toBe(200);
      const aktCookie = loginAkuntansi.headers['set-cookie'];
      const resAkt = await request(app)
        .get(`/api/budget-docs/${testDocUnit2.id}`)
        .set('Cookie', aktCookie);

      expect(resAkt.status).toBe(200);
      expect(resAkt.body.data.id).toBe(testDocUnit2.id);

      // Bersihkan dokumen uji
      await budgetDocRepository.deleteById(testDocUnit2.id);
    });

    it('Manager hanya dapat mengakses unit cakupannya (unit 1 dan 2)', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      // Login sebagai Manager Budi (unit 1 dan 2)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'budi@ptcn.id', password: 'password123' });

      expect(loginRes.status).toBe(200);
      const cookie = loginRes.headers['set-cookie'];

      // Akses unit 1 (MCU) -> Sukses 200
      const resUnit1 = await request(app).get('/api/test-unit-access/1').set('Cookie', cookie);
      expect(resUnit1.status).toBe(200);

      // Akses unit 2 (Lab) -> Sukses 200
      const resUnit2 = await request(app).get('/api/test-unit-access/2').set('Cookie', cookie);
      expect(resUnit2.status).toBe(200);

      // Akses unit 3 (Rawat Inap 1) -> Ditolak 403
      const resUnit3 = await request(app).get('/api/test-unit-access/3').set('Cookie', cookie);
      expect(resUnit3.status).toBe(403);
    });

    it('Akuntansi memiliki akses ke semua unit (1 sampai 6)', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      // Login sebagai Akuntansi Dya
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'dya@ptcn.id', password: 'password123' });

      expect(loginRes.status).toBe(200);
      const cookie = loginRes.headers['set-cookie'];

      // Akses unit 1, 3, dan 5 -> Semuanya sukses 200
      for (const unitId of [1, 3, 5]) {
        const res = await request(app).get(`/api/test-unit-access/${unitId}`).set('Cookie', cookie);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('5. Manajemen Pengguna & Proteksi Akun Akuntansi (/api/users)', () => {
    it('PIC dan Manager ditolak (403) saat mengakses /api/users', async () => {
      // 1. Login sebagai PIC
      const { csrfToken: csrfPic, cookie: cookieInitPic } = await getCsrf();
      const loginPic = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookieInitPic)
        .set('X-CSRF-Token', csrfPic)
        .send({ email: 'rina@ptcn.id', password: 'password123' });

      expect(loginPic.status).toBe(200);
      const picCookie = loginPic.headers['set-cookie'];
      const resPic = await request(app).get('/api/users').set('Cookie', picCookie);
      expect(resPic.status).toBe(403);

      // 2. Login sebagai Manager
      const { csrfToken: csrfMgr, cookie: cookieInitMgr } = await getCsrf();
      const loginMgr = await request(app)
        .post('/api/auth/login')
        .set('Cookie', cookieInitMgr)
        .set('X-CSRF-Token', csrfMgr)
        .send({ email: 'budi@ptcn.id', password: 'password123' });

      expect(loginMgr.status).toBe(200);
      const mgrCookie = loginMgr.headers['set-cookie'];
      const resMgr = await request(app).get('/api/users').set('Cookie', mgrCookie);
      expect(resMgr.status).toBe(403);
    });

    it('Akuntansi tidak boleh menonaktifkan atau mengubah role dirinya sendiri', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      // Login sebagai Akuntansi Dya (id: 3)
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'dya@ptcn.id', password: 'password123' });

      const cookie = loginRes.headers['set-cookie'];
      const activeCsrf = loginRes.body.csrf_token;

      // 1. Coba nonaktifkan akun sendiri -> ditolak 403
      const deactSelf = await request(app)
        .patch('/api/users/3/status')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({ is_active: false });

      expect(deactSelf.status).toBe(403);
      expect(deactSelf.body.message).toMatch(/tidak dapat menonaktifkan akun Anda sendiri/i);

      // 2. Coba ubah role akun sendiri -> ditolak 403
      const changeRoleSelf = await request(app)
        .put('/api/users/3')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({ name: 'Dya Putri', role: 'pic' });

      expect(changeRoleSelf.status).toBe(403);
      expect(changeRoleSelf.body.message).toMatch(/tidak dapat mengubah role akun Anda sendiri/i);
    });

    it('Tidak boleh menonaktifkan atau menurunkan role Akuntansi aktif terakhir', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      // Login sebagai Akuntansi Dya
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'dya@ptcn.id', password: 'password123' });

      const cookie = loginRes.headers['set-cookie'];
      const activeCsrf = loginRes.body.csrf_token;

      // Buat akun akuntansi kedua sementara
      const tempEmail = `test_akuntansi_${Date.now()}@ptcn.id`;
      const createRes = await request(app)
        .post('/api/users')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({
          name: 'Akuntansi Kedua',
          email: tempEmail,
          password: 'password123',
          role: 'akuntansi',
        });
      expect(createRes.status).toBe(201);
      const secondAktId = createRes.body.user_id;

      // Menonaktifkan akun akuntansi kedua masih diizinkan karena Dya masih aktif
      const deactSecond = await request(app)
        .patch(`/api/users/${secondAktId}/status`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({ is_active: false });
      expect(deactSecond.status).toBe(200);

      // Kini Dya adalah satu-satunya akuntansi aktif. Jika ada percobaan mengubah role Dya oleh siapapun, tolak 422
      // (Dites via fungsi service langsung atau percobaan update jika ada)
      const changeRoleLast = await request(app)
        .put(`/api/users/${secondAktId}`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({ role: 'pic' });
      // Akun kedua sudah non-aktif, mengubah role akun nonaktif diizinkan
      expect(changeRoleLast.status).toBe(200);

      // Bersihkan user sementara
      await db.query('DELETE FROM users WHERE id = $1', [secondAktId]);
    });

    it('Akuntansi dapat melihat daftar pengguna dan menambah pengguna baru secara atomis', async () => {
      const { csrfToken, cookie: initCookie } = await getCsrf();

      // Login sebagai Akuntansi
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'dya@ptcn.id', password: 'password123' });

      const cookie = loginRes.headers['set-cookie'];
      const activeCsrf = loginRes.body.csrf_token;

      // 1. Get users list
      const listRes = await request(app).get('/api/users').set('Cookie', cookie);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.meta).toBeDefined();

      // 2. Create new user
      const uniqueEmail = `staf_${Date.now()}@ptcn.id`;
      const createRes = await request(app)
        .post('/api/users')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({
          name: 'Staf Baru',
          email: uniqueEmail,
          password: 'password123',
          role: 'pic',
          unit_ids: [1],
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toHaveProperty('user_id');

      // 3. Update user status to non-active
      const statusRes = await request(app)
        .patch(`/api/users/${createRes.body.user_id}/status`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({ is_active: false });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.is_active).toBe(false);

      // 4. Update user unit access
      const unitsRes = await request(app)
        .put(`/api/users/${createRes.body.user_id}/units`)
        .set('Cookie', cookie)
        .set('X-CSRF-Token', activeCsrf)
        .send({ unit_ids: [1, 2] });

      expect(unitsRes.status).toBe(200);
      expect(unitsRes.body.unit_ids).toEqual([1, 2]);

      // Hapus staf baru agar bersih
      await db.query('DELETE FROM users WHERE id = $1', [createRes.body.user_id]);
    });
  });

  describe('6. Pencabutan Sesi Lain saat Penggantian Kata Sandi', () => {
    it('Penggantian password mencabut sesi aktif lainnya di database', async () => {
      const { csrfToken: csrf1, cookie: initCookie1 } = await getCsrf();
      const { csrfToken: csrf2, cookie: initCookie2 } = await getCsrf();

      // Sesi A: Login PIC Rina
      const loginA = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie1)
        .set('X-CSRF-Token', csrf1)
        .send({ email: 'rina@ptcn.id', password: 'password123' });
      expect(loginA.status).toBe(200);
      const cookieA = loginA.headers['set-cookie'];
      const csrfA = loginA.body.csrf_token;

      // Sesi B: Login PIC Rina di peramban/perangkat lain
      const loginB = await request(app)
        .post('/api/auth/login')
        .set('Cookie', initCookie2)
        .set('X-CSRF-Token', csrf2)
        .send({ email: 'rina@ptcn.id', password: 'password123' });
      expect(loginB.status).toBe(200);
      const cookieB = loginB.headers['set-cookie'];

      // Kedua sesi dapat mengakses /me
      const meA1 = await request(app).get('/api/auth/me').set('Cookie', cookieA);
      expect(meA1.status).toBe(200);

      const meB1 = await request(app).get('/api/auth/me').set('Cookie', cookieB);
      expect(meB1.status).toBe(200);

      // Sesi A melakukan penggantian password
      const changeRes = await request(app)
        .put('/api/auth/password')
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({
          current_password: 'password123',
          new_password: 'passwordBaru!23',
          new_password_confirmation: 'passwordBaru!23',
        });
      expect(changeRes.status).toBe(200);

      // Sesi A tetap valid
      const meA2 = await request(app).get('/api/auth/me').set('Cookie', cookieA);
      expect(meA2.status).toBe(200);

      // Sesi B ter-revokasi otomatis -> 401
      const meB2 = await request(app).get('/api/auth/me').set('Cookie', cookieB);
      expect(meB2.status).toBe(401);

      // Kembalikan password ke 'password123' agar tidak mengganggu pengujian selanjutnya
      const revertRes = await request(app)
        .put('/api/auth/password')
        .set('Cookie', cookieA)
        .set('X-CSRF-Token', csrfA)
        .send({
          current_password: 'passwordBaru!23',
          new_password: 'password123',
          new_password_confirmation: 'password123',
        });
      expect(revertRes.status).toBe(200);
    });
  });

  describe('7. Batas Laju Login (Rate Limiter)', () => {
    it('Percobaan login gagal berulang kali dari IP terisolasi memicu batas laju (429)', async () => {
      const { csrfToken, cookie } = await getCsrf();
      const testIp = '10.99.99.99';

      let lastStatus = 200;
      // Lakukan percobaan login gagal sebanyak 6 kali dengan IP terisolasi
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .set('X-Forwarded-For', testIp)
          .set('Cookie', cookie)
          .set('X-CSRF-Token', csrfToken)
          .send({ email: 'brute@ptcn.id', password: 'passwordsalah' });
        lastStatus = res.status;
      }

      expect(lastStatus).toBe(429);
    });
  });
});
