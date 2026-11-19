require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

/**
 * Skrip Bootstrap Akuntansi Pertama di Lingkungan Produksi (Fase 8)
 * Membaca variabel lingkungan:
 * - INITIAL_ACCOUNTANT_NAME
 * - INITIAL_ACCOUNTANT_EMAIL
 * - INITIAL_ACCOUNTANT_PASSWORD
 *
 * Sifat: Idempotent (membatalkan bila sudah ada Akuntansi aktif di database).
 */
async function createInitialAccountant() {
  const client = await db.pool.connect();
  try {
    console.log('--- Menjalankan Skrip Bootstrap Akuntansi Pertama ---');

    // 1. Periksa apakah sudah ada akun Akuntansi aktif di sistem
    const existingAkuntansi = await client.query(
      "SELECT id, email, name FROM users WHERE role = 'akuntansi' AND is_active = true"
    );

    if (existingAkuntansi.rows.length > 0) {
      console.log(
        `[INFO] Akun Akuntansi aktif sudah terdaftar di sistem (${existingAkuntansi.rows.length} akun ditemukan).`
      );
      console.log(`[INFO] Akun pertama: ${existingAkuntansi.rows[0].email} (${existingAkuntansi.rows[0].name}).`);
      console.log('[INFO] Pembuatan akun dibatalkan demi keamanan (idempotent).');
      return;
    }

    // 2. Baca kredensial dari environment
    const name = process.env.INITIAL_ACCOUNTANT_NAME || 'Admin Akuntansi';
    const email = process.env.INITIAL_ACCOUNTANT_EMAIL;
    const password = process.env.INITIAL_ACCOUNTANT_PASSWORD;

    if (!email || !password) {
      console.error(
        '[ERROR] Variabel lingkungan INITIAL_ACCOUNTANT_EMAIL dan INITIAL_ACCOUNTANT_PASSWORD wajib diisi pada berkas .env!'
      );
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('[ERROR] INITIAL_ACCOUNTANT_PASSWORD minimal harus 8 karakter demi keamanan!');
      process.exit(1);
    }

    await client.query('BEGIN');

    // 3. Hash Password dengan bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Masukkan Pengguna Baru ke Tabel Users
    const insertUserRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, LOWER($2), $3, 'akuntansi', true)
       RETURNING id, name, email, role`,
      [name, email, passwordHash]
    );
    const newUser = insertUserRes.rows[0];

    // 5. Berikan Wewenang Akses ke Seluruh Unit Kerja yang Ada
    const allUnitsRes = await client.query('SELECT id FROM units ORDER BY id ASC');
    for (const u of allUnitsRes.rows) {
      await client.query(
        `INSERT INTO user_unit_access (user_id, unit_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, unit_id) DO NOTHING`,
        [newUser.id, u.id]
      );
    }

    // 6. Catat Jejak Audit
    await client.query(
      `INSERT INTO audit_logs (actor_id, entity, entity_id, action, new_value)
       VALUES ($1, 'users', $2, 'BOOTSTRAP', $3)`,
      [
        newUser.id,
        newUser.id,
        JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          units_count: allUnitsRes.rows.length,
          note: 'Bootstrap akun akuntansi pertama di sistem',
        }),
      ]
    );

    await client.query('COMMIT');

    console.log('[SUKSES] Akun Akuntansi pertama berhasil dibuat:');
    console.log(`- ID: ${newUser.id}`);
    console.log(`- Nama: ${newUser.name}`);
    console.log(`- Email: ${newUser.email}`);
    console.log(`- Role: ${newUser.role}`);
    console.log(`- Jumlah Unit Ditugaskan: ${allUnitsRes.rows.length} unit.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[FATAL] Gagal membuat akun Akuntansi pertama:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

if (require.main === module) {
  createInitialAccountant();
}

module.exports = {
  createInitialAccountant,
};
