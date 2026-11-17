import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import app from '../src/app';
import db from '../db';

describe('Master Data Test Suite (Fase 2)', () => {
  const dummyItemFile = path.join(__dirname, 'fixtures', 'dummy_master_barang.xlsx');
  const dummyCoaFile = path.join(__dirname, 'fixtures', 'dummy_master_coa.xlsx');
  const dummyUnitFile = path.join(__dirname, 'fixtures', 'dummy_master_unit.xlsx');

  // Bersihkan data uji setelah seluruh pengujian selesai
  afterAll(async () => {
    try {
      await db.query(
        "DELETE FROM items WHERE code IN ('101', '102', '103', '104', 'BRG-TEST-01', 'BRG-NEW')"
      );
      await db.query("DELETE FROM import_logs WHERE filename LIKE 'dummy_%'");
      await db.query(
        "DELETE FROM units WHERE source_key LIKE 'DRAFT-%' OR code LIKE 'DU-%' OR code = '9999'"
      );
    } catch (err) {
      console.error('Error during master test cleanup:', err.message);
    }
  });

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

  describe('1. Otorisasi Akses Master Data (RBAC)', () => {
    it('PIC dapat membaca daftar barang tetapi ditolak (403) saat menambah atau import', async () => {
      const pic = await loginAs('rina@ptcn.id');

      // 1. Read barang -> diizinkan 200
      const listRes = await request(app).get('/api/items').set('Cookie', pic.cookie);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);

      // 2. Akses Quality Report -> ditolak 403
      const reportRes = await request(app)
        .get('/api/items/quality-report')
        .set('Cookie', pic.cookie);
      expect(reportRes.status).toBe(403);

      // 3. Tambah barang -> ditolak 403
      const createRes = await request(app)
        .post('/api/items')
        .set('Cookie', pic.cookie)
        .set('X-CSRF-Token', pic.csrfToken)
        .send({ code: 'BRG-TEST-01', name: 'Barang Uji PIC', uom: 'Pcs' });
      expect(createRes.status).toBe(403);

      // 4. Import barang -> ditolak 403
      const importRes = await request(app)
        .post('/api/items/import')
        .set('Cookie', pic.cookie)
        .set('X-CSRF-Token', pic.csrfToken)
        .attach('file', dummyItemFile);
      expect(importRes.status).toBe(403);
    });

    it('Manager ditolak (403) saat mengimpor master COA atau mengubah kategori investasi', async () => {
      const mgr = await loginAs('budi@ptcn.id');

      // Import COA -> ditolak 403
      const importCoaRes = await request(app)
        .post('/api/coas/import')
        .set('Cookie', mgr.cookie)
        .set('X-CSRF-Token', mgr.csrfToken)
        .attach('file', dummyCoaFile);
      expect(importCoaRes.status).toBe(403);

      // Ubah kategori investasi -> ditolak 403
      const updateInvRes = await request(app)
        .put('/api/investment-categories/1')
        .set('Cookie', mgr.cookie)
        .set('X-CSRF-Token', mgr.csrfToken)
        .send({ useful_life_months: 180 });
      expect(updateInvRes.status).toBe(403);
    });
  });

  describe('2. Laporan Kualitas Master Data (/api/items/quality-report)', () => {
    it('Akuntansi dapat melihat ringkasan kualitas master dan peringatan harga', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .get('/api/items/quality-report')
        .set('Cookie', akt.cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('last_import');
      expect(res.body).toHaveProperty('live_metrics');
      expect(res.body).toHaveProperty('price_warning');
      expect(res.body.live_metrics.total_items).toBeGreaterThan(0);
    });
  });

  describe('3. Import Master Barang Logistik dengan Simulasi (dry_run)', () => {
    it('Mode dry_run=true menghasilkan rekapitulasi analitik dan galat per baris tanpa mengubah database', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .post('/api/items/import?dry_run=true')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyItemFile);

      expect(res.status).toBe(200);
      expect(res.body.is_dry_run).toBe(true);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary.total_read).toBe(6);
      expect(res.body.summary.hpp_zero).toBe(1); // Baris 102
      expect(res.body.summary.missing_coa).toBe(1); // Baris 103
      expect(res.body.summary.unknown_coa).toBe(1); // Baris 104 (COA 9.9.9.99)
      expect(Array.isArray(res.body.row_errors)).toBe(true);
      expect(res.body.row_errors.length).toBeGreaterThan(0);
      expect(res.body.row_errors[0].error).toMatch(/tidak ditemukan/i);

      // Verifikasi bahwa barang baru belum tersimpan di database
      const checkDb = await db.query("SELECT * FROM items WHERE code = '101'");
      expect(checkDb.rows.length).toBe(0);
    });

    it('Mode dry_run=false mengeksekusi penyimpanan ke database dan mencatat log import', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .post('/api/items/import?dry_run=false')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyItemFile);

      expect(res.status).toBe(200);
      expect(res.body.is_dry_run).toBe(false);
      expect(res.body.summary.total_read).toBe(6);

      // Verifikasi bahwa barang baru tersimpan di database
      const checkDb = await db.query("SELECT * FROM items WHERE code = '101'");
      expect(checkDb.rows.length).toBe(1);
      expect(checkDb.rows[0].name).toBe('KERTAS EKG THERMAL ROLL DUMMY');

      // Verifikasi tabel import_logs mencatat transaksi
      const logDb = await db.query(
        "SELECT * FROM import_logs WHERE filename LIKE '%dummy_master_barang%' ORDER BY id DESC LIMIT 1"
      );
      expect(logDb.rows.length).toBe(1);
      expect(logDb.rows[0].total_read).toBe(6);
    });
  });

  describe('4. Import Master COA (3 Sheet)', () => {
    it('Akuntansi dapat mengimpor Master COA 3 sheet (COA, Kategori Biaya, Kategori Investasi)', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .post('/api/coas/import?dry_run=false')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyCoaFile);

      expect(res.status).toBe(200);
      expect(res.body.is_dry_run).toBe(false);
      expect(res.body.summary.coa_read).toBeGreaterThan(0);
      expect(res.body.summary.groups_read).toBeGreaterThan(0);
      expect(res.body.summary.investment_categories_read).toBeGreaterThan(0);
    });
  });

  describe('5. CRUD Master Data & Pengaturan', () => {
    it('Akuntansi dapat menambah dan memperbarui barang', async () => {
      const akt = await loginAs('dya@ptcn.id');

      // 1. Tambah barang
      const createRes = await request(app)
        .post('/api/items')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({
          code: 'BRG-NEW',
          name: 'Barang Master Baru',
          uom: 'Kotak',
          group_name: 'Bahan Medis',
          price_cn: 50000,
          price_cnh: 55000,
        });

      expect(createRes.status).toBe(201);
      const itemId = createRes.body.data.id;

      // 2. Update status barang
      const patchRes = await request(app)
        .patch(`/api/items/${itemId}/status`)
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({ is_active: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.is_active).toBe(false);
    });

    it('Akuntansi dapat memperbarui masa manfaat dan COA susut pada Kategori Investasi', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const updateRes = await request(app)
        .put('/api/investment-categories/1')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({
          useful_life_months: 144,
          depreciation_coa_id: 13,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.useful_life_months).toBe(144);

      // Kembalikan ke 120 bulan
      await request(app)
        .put('/api/investment-categories/1')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({
          useful_life_months: 120,
          depreciation_coa_id: null,
        });
    });

    it('GET /api/coa-groups mengembalikan hierarki kelompok COA beserta jumlah akun COA', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app).get('/api/coa-groups').set('Cookie', akt.cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('coa_count');
    });

    it('GET /api/reference-data mengembalikan data referensi lengkap', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app).get('/api/reference-data').set('Cookie', akt.cookie);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('companies');
      expect(res.body).toHaveProperty('org_groups');
      expect(res.body).toHaveProperty('priorities');
      expect(res.body).toHaveProperty('item_groups');
      expect(res.body).toHaveProperty('classifications');
    });
  });

  describe('5. Import Master Unit Draf & Penanganan Isu (Petunjuk Draf)', () => {
    it('PIC ditolak (403) saat mencoba melakukan import master unit', async () => {
      const pic = await loginAs('rina@ptcn.id');

      const res = await request(app)
        .post('/api/units/import')
        .set('Cookie', pic.cookie)
        .set('X-CSRF-Token', pic.csrfToken)
        .attach('file', dummyUnitFile);

      expect(res.status).toBe(403);
    });

    it('Mode dry_run=true membaca draf unit dan mendeteksi isu tanpa mengubah database', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .post('/api/units/import?dry_run=true')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyUnitFile);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.dry_run).toBe(true);

      const summary = res.body.summary;
      expect(summary.total_read).toBe(10);
      expect(summary.inactive_units).toBe(2); // DRAFT-CN-04 dan DRAFT-CNH-04 keputusan 'Hapus'
      expect(summary.missing_code).toBeGreaterThan(0); // DRAFT-CN-05 tanpa kode
      expect(summary.needs_review_count).toBeGreaterThan(0);

      // Verifikasi bahwa unit draf belum tersimpan di database
      const checkDb = await db.query(
        "SELECT id FROM units WHERE source_key IN ('DRAFT-CN-01', 'DRAFT-CN-03', 'DRAFT-CNH-01')"
      );
      expect(checkDb.rows.length).toBe(0);
    });

    it('Mode dry_run=false mengeksekusi upsert unit dan menerapkan aturan Petunjuk draf', async () => {
      const akt = await loginAs('dya@ptcn.id');

      // 1. Eksekusi import pertama
      const res = await request(app)
        .post('/api/units/import')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyUnitFile);

      expect(res.status).toBe(200);
      expect(res.body.dry_run).toBe(false);
      expect(res.body.summary.total_read).toBe(10);
      expect(res.body.summary.new_units).toBe(10);

      // 2. Verifikasi unit yang berkeputusan 'Pakai' (DRAFT-CN-01) aktif dan punya revenue_coa
      const unit001 = await db.query("SELECT * FROM units WHERE source_key = 'DRAFT-CN-01'");
      expect(unit001.rows.length).toBe(1);
      expect(unit001.rows[0].code).toBe('DU-01');
      expect(unit001.rows[0].name).toBe('LABORATORIUM DUMMY');
      expect(unit001.rows[0].is_active).toBe(true);
      expect(unit001.rows[0].revenue_coa_code).toBe('31211000');

      // 3. Verifikasi unit yang berkeputusan 'Ubah' (DRAFT-CN-03) memakai nilai kolom final
      const unit003 = await db.query("SELECT * FROM units WHERE source_key = 'DRAFT-CN-03'");
      expect(unit003.rows.length).toBe(1);
      expect(unit003.rows[0].code).toBe('DU-03B'); // Kode final
      expect(unit003.rows[0].name).toBe('RAWAT INAP TERPADU'); // Nama final
      expect(unit003.rows[0].classification).toBe('PUSAT LABA UTAMA'); // Klasifikasi final
      expect(unit003.rows[0].is_active).toBe(true);

      // 4. Verifikasi unit yang berkeputusan 'Hapus' (DRAFT-CN-04) dinonaktifkan
      const unit004 = await db.query("SELECT * FROM units WHERE source_key = 'DRAFT-CN-04'");
      expect(unit004.rows.length).toBe(1);
      expect(unit004.rows[0].is_active).toBe(false);

      // 5. Verifikasi unit tanpa kode (DRAFT-CN-05) code=null dan needs_review=true
      const unit005 = await db.query("SELECT * FROM units WHERE source_key = 'DRAFT-CN-05'");
      expect(unit005.rows.length).toBe(1);
      expect(unit005.rows[0].code).toBeNull();
      expect(unit005.rows[0].needs_review).toBe(true);

      // 6. Verifikasi unit dengan keputusan 'Gabung ke unit lain' (DRAFT-CN-06) needs_review=true
      const unit006 = await db.query("SELECT * FROM units WHERE source_key = 'DRAFT-CN-06'");
      expect(unit006.rows.length).toBe(1);
      expect(unit006.rows[0].needs_review).toBe(true);

      // 7. Verifikasi import ulang aman & idempoten (tidak membuat duplikat)
      const reimportRes = await request(app)
        .post('/api/units/import')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyUnitFile);

      expect(reimportRes.status).toBe(200);
      expect(reimportRes.body.summary.matched_existing).toBe(10);
      expect(reimportRes.body.summary.new_units).toBe(0);

      // 8. Verifikasi filter needs_review pada endpoint GET /api/units
      const filterRes = await request(app)
        .get('/api/units?needs_review=true')
        .set('Cookie', akt.cookie);
      expect(filterRes.status).toBe(200);
      expect(filterRes.body.data.every((u) => u.needs_review === true)).toBe(true);
    });
  });
});

