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
    it('Bila belum ada import, last_import bernilai null dan live_metrics menghitung barang tanpa harga per perusahaan/periode', async () => {
      const akt = await loginAs('dya@ptcn.id');

      // Hapus riwayat import ITEMS untuk menguji kondisi awal
      await db.query("DELETE FROM import_logs WHERE type = 'ITEMS'");

      const res = await request(app)
        .get('/api/items/quality-report')
        .set('Cookie', akt.cookie);

      expect(res.status).toBe(200);
      expect(res.body.last_import).toBeNull(); // Tidak ada angka fallback cadangan
      expect(res.body).toHaveProperty('live_metrics');
      expect(res.body).toHaveProperty('price_warning');
      expect(res.body.live_metrics.total_items).toBeGreaterThan(0);
      expect(res.body.live_metrics).toHaveProperty('items_price_metrics');
      expect(Array.isArray(res.body.live_metrics.items_price_metrics)).toBe(true);
      expect(res.body.live_metrics.items_price_metrics.length).toBe(2);
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

    it('Mode dry_run=false hanya menulis HPP untuk perusahaan terpilih (CN) dan TIDAK menulis harga CNH, serta mencatat ke item_price_history', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .post('/api/items/import?dry_run=false&company_code=CN')
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
      const itemId = checkDb.rows[0].id;

      // Verifikasi HPP tersimpan HANYA untuk CN (company_id = 1)
      const priceCn = await db.query(
        'SELECT * FROM item_prices WHERE item_id = $1 AND company_id = 1',
        [itemId]
      );
      expect(priceCn.rows.length).toBe(1);
      expect(Number(priceCn.rows[0].price)).toBe(45000);

      // Verifikasi JANGAN menulis harga CNH (company_id = 2)
      const priceCnh = await db.query(
        'SELECT * FROM item_prices WHERE item_id = $1 AND company_id = 2',
        [itemId]
      );
      expect(priceCnh.rows.length).toBe(0);

      // Verifikasi item_price_history mencatat transaksi import
      const historyRes = await db.query(
        'SELECT * FROM item_price_history WHERE item_id = $1 AND company_id = 1',
        [itemId]
      );
      expect(historyRes.rows.length).toBe(1);
      expect(Number(historyRes.rows[0].new_price)).toBe(45000);
      expect(historyRes.rows[0].source).toBe('import');

      // Verifikasi tabel import_logs mencatat transaksi
      const logDb = await db.query(
        "SELECT * FROM import_logs WHERE filename LIKE '%dummy_master_barang%' ORDER BY id DESC LIMIT 1"
      );
      expect(logDb.rows.length).toBe(1);
      expect(logDb.rows[0].total_read).toBe(6);
    });

    it('Import ulang barang lama: update_prices=false mempertahankan harga, update_prices=true memperbarui harga', async () => {
      const akt = await loginAs('dya@ptcn.id');

      // 1. Ubah harga barang 101 secara manual di database menjadi 40.000
      const itemRes = await db.query("SELECT id FROM items WHERE code = '101'");
      const itemId = itemRes.rows[0].id;
      await db.query('UPDATE item_prices SET price = 40000 WHERE item_id = $1 AND company_id = 1', [itemId]);

      // 2. Import dry_run mendeteksi harga yang akan berubah (prices_to_update)
      const dryRes = await request(app)
        .post('/api/items/import?dry_run=true&company_code=CN')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyItemFile);
      expect(dryRes.status).toBe(200);
      expect(dryRes.body.summary.prices_to_update).toBeGreaterThanOrEqual(1);

      // 3. Import dengan update_prices=false TIDAK mengubah harga barang lama
      const noUpdateRes = await request(app)
        .post('/api/items/import?dry_run=false&company_code=CN&update_prices=false')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyItemFile);
      expect(noUpdateRes.status).toBe(200);

      const checkNoUpdate = await db.query('SELECT price FROM item_prices WHERE item_id = $1 AND company_id = 1', [itemId]);
      expect(Number(checkNoUpdate.rows[0].price)).toBe(40000);

      // 4. Import dengan update_prices=true MENGUBAH harga menjadi nilai di Excel (45.000) dan mencatat history
      const withUpdateRes = await request(app)
        .post('/api/items/import?dry_run=false&company_code=CN&update_prices=true')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyItemFile);
      expect(withUpdateRes.status).toBe(200);

      const checkWithUpdate = await db.query('SELECT price FROM item_prices WHERE item_id = $1 AND company_id = 1', [itemId]);
      expect(Number(checkWithUpdate.rows[0].price)).toBe(45000);

      const latestHistory = await db.query(
        'SELECT * FROM item_price_history WHERE item_id = $1 AND company_id = 1 ORDER BY id DESC LIMIT 1',
        [itemId]
      );
      expect(Number(latestHistory.rows[0].old_price)).toBe(40000);
      expect(Number(latestHistory.rows[0].new_price)).toBe(45000);
      expect(latestHistory.rows[0].source).toBe('import');
    });

    it('Import barang menolak dengan status 422 bila kode perusahaan tidak terdaftar di database', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .post('/api/items/import?company_code=INVALID_COMPANY')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', dummyItemFile);

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/perusahaan.*tidak ditemukan/i);
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
    it('Akuntansi dapat menambah dan memperbarui barang dengan format prices tanpa periode', async () => {
      const akt = await loginAs('dya@ptcn.id');

      // 1. Tambah barang dengan format daftar prices: [{ company_code, price }]
      const createRes = await request(app)
        .post('/api/items')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({
          code: 'BRG-NEW',
          name: 'Barang Master Baru',
          uom: 'Kotak',
          group_name: 'Bahan Medis',
          prices: [{ company_code: 'CN', price: 50000 }],
        });

      expect(createRes.status).toBe(201);
      const itemId = createRes.body.data.id;

      // Verifikasi pembacaan detail barang mengembalikan daftar prices tanpa periode
      const detailRes = await request(app).get(`/api/items/${itemId}`).set('Cookie', akt.cookie);
      expect(detailRes.status).toBe(200);
      expect(Array.isArray(detailRes.body.prices)).toBe(true);
      expect(detailRes.body.prices[0].company_code).toBe('CN');
      expect(detailRes.body.prices[0].price).toBe(50000);

      // Verifikasi pembaruan harga via PUT /api/items/:id
      const updateRes = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({
          name: 'Barang Master Baru Diperbarui',
          prices: [{ company_code: 'CN', price: 75000 }],
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.prices[0].price).toBe(75000);

      // 2. Update status barang
      const patchRes = await request(app)
        .patch(`/api/items/${itemId}/status`)
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({ is_active: false });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.is_active).toBe(false);
    });

    it('PATCH /api/items/:id/prices khusus Akuntansi, mencatat riwayat ke item_price_history dan audit_logs', async () => {
      const akt = await loginAs('dya@ptcn.id');
      const pic = await loginAs('rina@ptcn.id');

      const itemRes = await db.query("SELECT id FROM items WHERE code = '101'");
      const itemId = itemRes.rows[0].id;

      // 1. PIC ditolak (403)
      const picPatch = await request(app)
        .patch(`/api/items/${itemId}/prices`)
        .set('Cookie', pic.cookie)
        .set('X-CSRF-Token', pic.csrfToken)
        .send({ prices: [{ company_code: 'CN', price: 60000 }] });
      expect(picPatch.status).toBe(403);

      // 2. Akuntansi berhasil memperbarui harga
      const aktPatch = await request(app)
        .patch(`/api/items/${itemId}/prices`)
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .send({ prices: [{ company_code: 'CN', price: 60000 }] });
      expect(aktPatch.status).toBe(200);

      // Verifikasi item_price_history mencatat source: 'manual'
      const historyRes = await db.query(
        "SELECT * FROM item_price_history WHERE item_id = $1 AND company_id = 1 AND source = 'manual' ORDER BY id DESC LIMIT 1",
        [itemId]
      );
      expect(historyRes.rows.length).toBe(1);
      expect(Number(historyRes.rows[0].new_price)).toBe(60000);

      // Verifikasi audit_logs mencatat aksi update_item_prices
      const auditRes = await db.query(
        "SELECT * FROM audit_logs WHERE entity = 'items' AND entity_id = $1 AND action = 'update_item_prices' ORDER BY id DESC LIMIT 1",
        [itemId]
      );
      expect(auditRes.rows.length).toBe(1);
    });

    it('Laporan kualitas GET /api/items/quality-report menghitung barang tanpa harga dan harga nol per perusahaan', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .get('/api/items/quality-report')
        .set('Cookie', akt.cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('live_metrics');
      expect(res.body.live_metrics).toHaveProperty('items_price_metrics');
      expect(Array.isArray(res.body.live_metrics.items_price_metrics)).toBe(true);
      expect(res.body.live_metrics.items_price_metrics.length).toBe(2);

      const cnMetric = res.body.live_metrics.items_price_metrics.find((p) => p.company_code === 'CN');
      expect(cnMetric).toBeDefined();
      expect(cnMetric).toHaveProperty('items_without_price');
      expect(cnMetric).toHaveProperty('items_zero_price');
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

      // 9. Verifikasi tipe kelompok organisasi mengikuti perusahaan (CN: instalasi, CNH: unit_bisnis & klinik)
      const cnGroup = await db.query(
        "SELECT type FROM org_groups WHERE company_id = 1 AND LOWER(name) = LOWER('INSTALASI PENUNJANG MEDIK')"
      );
      expect(cnGroup.rows.length).toBe(1);
      expect(cnGroup.rows[0].type).toBe('instalasi');

      const cnhGroup = await db.query(
        "SELECT type FROM org_groups WHERE company_id = 2 AND LOWER(name) = LOWER('UNIT BISNIS KLINIK')"
      );
      expect(cnhGroup.rows.length).toBe(1);
      expect(cnhGroup.rows[0].type).toBe('unit_bisnis');

      const cnhSubGroup = await db.query(
        "SELECT type, parent_id FROM org_groups WHERE company_id = 2 AND LOWER(name) = LOWER('KLINIK UTAMA')"
      );
      expect(cnhSubGroup.rows.length).toBe(1);
      expect(cnhSubGroup.rows[0].type).toBe('klinik');
      expect(cnhSubGroup.rows[0].parent_id).not.toBeNull();
    });

    it('Import unit mendeteksi duplikasi kode di file dan bentrok di database, serta menolak perusahaan tidak dikenal', async () => {
      const akt = await loginAs('dya@ptcn.id');
      const ExcelJS = (await import('exceljs')).default;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Master_Unit');
      ws.addRow([
        'No.',
        'Perusahaan',
        'Kode',
        'Nama unit (di MENU)',
        'Kelompok utama (MENU)',
        'Subkelompok (MENU)',
        'Lembar RKAP 2027',
        'Nama di lembar RKAP',
        'Klasifikasi di template BIAYA',
        'Klasifikasi (usulan)',
        'COA Pendapatan',
        'Nama pendapatan',
        'Kategori analitik (template)',
        'Ada di jurnal CN Okt 2026',
        'Isu perlu dicek',
        'Keputusan Akuntansi',
        'Kode final',
        'Nama final',
        'Kelompok final',
        'Klasifikasi final',
        'Catatan Akuntansi',
        'Urutan di MENU',
        'ID Draf (jangan diubah)',
      ]);
      // Baris 1: Perusahaan tak dikenal
      ws.addRow([
        1,
        'UNKNOWN_CO',
        'UX-01',
        'Unit Perusahaan Asing',
        'SUPPORTING',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'Pakai',
        null,
        null,
        null,
        null,
        null,
        1,
        'DRAFT-ERR-01',
      ]);
      // Baris 2: Kode DU-01 (bentrok dengan DRAFT-CN-01 yang sudah ada di database)
      ws.addRow([
        2,
        'CN',
        'DU-01',
        'Unit Bentrok DB',
        'SUPPORTING',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'Pakai',
        null,
        null,
        null,
        null,
        null,
        2,
        'DRAFT-DUP-01',
      ]);
      // Baris 3: Kode DU-99
      ws.addRow([
        3,
        'CN',
        'DU-99',
        'Unit Ganda File 1',
        'SUPPORTING',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'Pakai',
        null,
        null,
        null,
        null,
        null,
        3,
        'DRAFT-DUP-02',
      ]);
      // Baris 4: Kode DU-99 (ganda dalam file)
      ws.addRow([
        4,
        'CN',
        'DU-99',
        'Unit Ganda File 2',
        'SUPPORTING',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        'Pakai',
        null,
        null,
        null,
        null,
        null,
        4,
        'DRAFT-DUP-03',
      ]);

      const buffer = await wb.xlsx.writeBuffer();

      // 1. Dry run melaporkan galat per baris
      const dryRes = await request(app)
        .post('/api/units/import?dry_run=true')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', buffer, 'unit_test_edge.xlsx');

      expect(dryRes.status).toBe(200);
      expect(dryRes.body.dry_run).toBe(true);
      expect(dryRes.body.errors.length).toBeGreaterThanOrEqual(3);

      const errCompany = dryRes.body.errors.find((e) => e.source_key === 'DRAFT-ERR-01');
      expect(errCompany.error).toMatch(/tidak dikenal atau tidak terdaftar/i);

      const errDbDup = dryRes.body.errors.find((e) => e.source_key === 'DRAFT-DUP-01');
      expect(errDbDup.error).toMatch(/sudah digunakan oleh unit lain/i);

      const errFileDup = dryRes.body.errors.find((e) => e.source_key === 'DRAFT-DUP-03');
      expect(errFileDup.error).toMatch(/ganda di dalam berkas impor/i);

      // 2. Real import melewati baris yang bermasalah alih-alih gagal total
      const realRes = await request(app)
        .post('/api/units/import?dry_run=false')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', buffer, 'unit_test_edge.xlsx');

      expect(realRes.status).toBe(200);
      expect(realRes.body.dry_run).toBe(false);
      // Baris 3 (DRAFT-DUP-02) yang valid tersimpan, baris bermasalah dilewati
      const savedUnit = await db.query("SELECT * FROM units WHERE source_key = 'DRAFT-DUP-02'");
      expect(savedUnit.rows.length).toBe(1);

      // Bersihkan
      await db.query("DELETE FROM units WHERE source_key LIKE 'DRAFT-DUP%'");
    });
  });

  describe('6. Validasi Berkas Unggah (Upload Security & Integrity)', () => {
    it('Unggah berkas bukan .xlsx ditolak dengan status 400 dan pesan bahasa Indonesia', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .post('/api/items/import')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', Buffer.from('teks biasa bukan excel'), 'daftar_barang.txt');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/spreadsheet Excel \(\.xlsx\)/i);
    });

    it('Unggah berkas .xlsx korup/rusak ditolak dengan status 400 dan bukan 500', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const corruptedBuffer = Buffer.from('PK\x03\x04corrupted-excel-content-dummy');

      const res = await request(app)
        .post('/api/items/import')
        .set('Cookie', akt.cookie)
        .set('X-CSRF-Token', akt.csrfToken)
        .attach('file', corruptedBuffer, 'corrupted_file.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/berkas excel rusak/i);
    });
  });

  describe('7. Download Template Import Master Data (/api/master/templates)', () => {
    it('Permintaan tanpa autentikasi ditolak dengan status 401 Unauthorized', async () => {
      const res = await request(app).get('/api/master/templates?type=items');
      expect(res.status).toBe(401);
    });

    it('PIC dapat mengunduh template master barang (Template_Import_Barang.xlsx)', async () => {
      const pic = await loginAs('rina@ptcn.id');

      const res = await request(app)
        .get('/api/master/templates?type=items')
        .set('Cookie', pic.cookie)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('Template_Import_Barang.xlsx');
      expect(res.body.length).toBeGreaterThan(1000);
    });

    it('Manager dapat mengunduh template COA & Kategori 3-sheet (Template_Import_COA_dan_Kategori.xlsx)', async () => {
      const mgr = await loginAs('budi@ptcn.id');

      const res = await request(app)
        .get('/api/master/templates?type=coas')
        .set('Cookie', mgr.cookie)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('Template_Import_COA_dan_Kategori.xlsx');
      expect(res.body.length).toBeGreaterThan(1000);
    });

    it('Akuntansi dapat mengunduh template master unit (Template_Import_Unit.xlsx)', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .get('/api/master/templates/units')
        .set('Cookie', akt.cookie)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('Template_Import_Unit.xlsx');
      expect(res.body.length).toBeGreaterThan(1000);
    });

    it('Permintaan dengan jenis template tidak dikenal ditolak dengan status 400', async () => {
      const akt = await loginAs('dya@ptcn.id');

      const res = await request(app)
        .get('/api/master/templates?type=unknown_master')
        .set('Cookie', akt.cookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/tidak valid/i);
    });
  });
});

