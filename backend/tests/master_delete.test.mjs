import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Master Data Safe Deletion Test Suite', () => {
  let accountantCookie;
  let accountantCsrf;
  let accountantId;

  let picCookie;
  let picCsrf;

  const testCodes = {
    itemUnused: 'DEL-ITEM-001',
    itemUsed: 'DEL-ITEM-002',
    coaUnused: '9.9.99',
    coaUsed: '9.9.98',
    unitUnused: '9991',
    unitUsed: '9992',
  };

  let unusedItemId;
  let usedItemId;
  let unusedCoaId;
  let usedCoaId;
  let unusedUnitId;
  let usedUnitId;

  const getCsrf = async () => {
    const res = await request(app).get('/api/auth/csrf');
    return {
      csrfToken: res.body.csrf_token,
      cookie: res.headers['set-cookie'],
    };
  };

  const login = async (email, password) => {
    const { csrfToken: initCsrf, cookie: initCookie } = await getCsrf();
    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', initCookie)
      .set('X-CSRF-Token', initCsrf)
      .send({ email, password });
    return {
      cookie: res.headers['set-cookie'],
      csrfToken: res.body.csrf_token,
      user: res.body.user,
    };
  };

  beforeAll(async () => {
    // 1. Login Akuntansi & PIC
    const acc = await login('dya@ptcn.id', 'password123');
    accountantCookie = acc.cookie;
    accountantCsrf = acc.csrfToken;
    accountantId = acc.user.user_id || acc.user.id;

    const pic = await login('rina@ptcn.id', 'password123');
    picCookie = pic.cookie;
    picCsrf = pic.csrfToken;

    // 2. Setup COA (Unused & Used)
    const coaUnusedRes = await db.query(
      `INSERT INTO coas (code, name, group_id, is_active)
       VALUES ($1, 'COA Uji Bebas', 1, TRUE)
       RETURNING id`,
      [testCodes.coaUnused]
    );
    unusedCoaId = coaUnusedRes.rows[0].id;

    const coaUsedRes = await db.query(
      `INSERT INTO coas (code, name, group_id, is_active)
       VALUES ($1, 'COA Uji Terpakai', 1, TRUE)
       RETURNING id`,
      [testCodes.coaUsed]
    );
    usedCoaId = coaUsedRes.rows[0].id;

    // 3. Setup Items (Unused & Used)
    const itemUnusedRes = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ($1, 'Barang Uji Bebas', 'Pcs', $2, TRUE)
       RETURNING id`,
      [testCodes.itemUnused, unusedCoaId]
    );
    unusedItemId = itemUnusedRes.rows[0].id;

    const itemUsedRes = await db.query(
      `INSERT INTO items (code, name, uom, coa_id, is_active)
       VALUES ($1, 'Barang Uji Terpakai', 'Pcs', $2, TRUE)
       RETURNING id`,
      [testCodes.itemUsed, usedCoaId]
    );
    usedItemId = itemUsedRes.rows[0].id;

    // 4. Setup Units (Unused & Used)
    const companyRes = await db.query(`SELECT id FROM companies LIMIT 1`);
    const compId = companyRes.rows[0].id;

    const unitUnusedRes = await db.query(
      `INSERT INTO units (code, name, company_id, is_active)
       VALUES ($1, 'Unit Uji Bebas', $2, TRUE)
       RETURNING id`,
      [testCodes.unitUnused, compId]
    );
    unusedUnitId = unitUnusedRes.rows[0].id;

    const unitUsedRes = await db.query(
      `INSERT INTO units (code, name, company_id, is_active)
       VALUES ($1, 'Unit Uji Terpakai', $2, TRUE)
       RETURNING id`,
      [testCodes.unitUsed, compId]
    );
    usedUnitId = unitUsedRes.rows[0].id;

    // 5. Kaitkan data terpakai ke tabel transaksi anggaran (expense_lines)
    const periodRes = await db.query(`SELECT id FROM periods LIMIT 1`);
    const periodId = periodRes.rows[0].id;

    const docRes = await db.query(
      `INSERT INTO budget_docs (period_id, unit_id, type, status)
       VALUES ($1, $2, 'BIAYA', 'DRAFT')
       RETURNING id`,
      [periodId, usedUnitId]
    );
    const docId = docRes.rows[0].id;

    await db.query(
      `INSERT INTO expense_lines (doc_id, item_id, qty, amount)
       VALUES ($1, $2, 1, 10000)`,
      [docId, usedItemId]
    );
  });

  afterAll(async () => {
    // Bersihkan data uji
    await db.query(`DELETE FROM expense_lines WHERE item_id IN ($1, $2)`, [unusedItemId, usedItemId]);
    await db.query(`DELETE FROM budget_docs WHERE unit_id IN ($1, $2)`, [unusedUnitId, usedUnitId]);
    await db.query(`DELETE FROM items WHERE code IN ($1, $2)`, [testCodes.itemUnused, testCodes.itemUsed]);
    await db.query(`DELETE FROM coas WHERE code IN ($1, $2)`, [testCodes.coaUnused, testCodes.coaUsed]);
    await db.query(`DELETE FROM units WHERE code IN ($1, $2)`, [testCodes.unitUnused, testCodes.unitUsed]);
    await db.query(`DELETE FROM audit_logs WHERE entity = 'items' AND entity_id = $1`, [unusedItemId]);
  });

  describe('Otorisasi Role', () => {
    it('Harus menolak (403) jika bukan peran Akuntansi', async () => {
      const res = await request(app)
        .delete(`/api/items/${unusedItemId}`)
        .set('Cookie', picCookie)
        .set('X-CSRF-Token', picCsrf);

      expect(res.status).toBe(403);
    });
  });

  describe('Penghapusan Master Barang (Items)', () => {
    it('Harus menolak (409) jika barang sudah digunakan dalam transaksi anggaran', async () => {
      const res = await request(app)
        .delete(`/api/items/${usedItemId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/tidak dapat dihapus permanen karena sudah memiliki riwayat/i);
    });

    it('Harus berhasil (200) menghapus barang yang belum pernah digunakan dan mencatat audit log', async () => {
      const res = await request(app)
        .delete(`/api/items/${unusedItemId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/berhasil dihapus permanen/i);

      // Verifikasi barang sudah terhapus dari DB
      const checkRes = await db.query('SELECT * FROM items WHERE id = $1', [unusedItemId]);
      expect(checkRes.rows.length).toBe(0);

      // Verifikasi catatan audit
      const auditRes = await db.query(
        "SELECT * FROM audit_logs WHERE entity = 'items' AND entity_id = $1 AND action = 'delete_item'",
        [unusedItemId]
      );
      expect(auditRes.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Penghapusan Master COA', () => {
    it('Harus menolak (409) jika COA masih digunakan di master barang / anggaran', async () => {
      const res = await request(app)
        .delete(`/api/coas/${usedCoaId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/tidak dapat dihapus permanen karena masih digunakan/i);
    });

    it('Harus berhasil (200) menghapus COA yang belum pernah digunakan', async () => {
      const res = await request(app)
        .delete(`/api/coas/${unusedCoaId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/berhasil dihapus permanen/i);

      const checkRes = await db.query('SELECT * FROM coas WHERE id = $1', [unusedCoaId]);
      expect(checkRes.rows.length).toBe(0);
    });
  });

  describe('Penghapusan Master Unit', () => {
    it('Harus menolak (409) jika Unit masih memiliki dokumen anggaran atau riwayat', async () => {
      const res = await request(app)
        .delete(`/api/units/${usedUnitId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/tidak dapat dihapus permanen karena masih digunakan/i);
    });

    it('Harus berhasil (200) menghapus Unit yang belum pernah digunakan', async () => {
      const res = await request(app)
        .delete(`/api/units/${unusedUnitId}`)
        .set('Cookie', accountantCookie)
        .set('X-CSRF-Token', accountantCsrf);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/berhasil dihapus permanen/i);

      const checkRes = await db.query('SELECT * FROM units WHERE id = $1', [unusedUnitId]);
      expect(checkRes.rows.length).toBe(0);
    });
  });
});
