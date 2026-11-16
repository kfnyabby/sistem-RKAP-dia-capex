const fs = require('fs');
const path = require('path');
const db = require('../db');

async function runMigrations() {
  const client = await db.pool.connect();
  try {
    console.log('--- Menjalankan Migrasi Database ---');

    // Buat tabel pelacak migrasi jika belum ada
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Dapatkan daftar migrasi yang sudah dieksekusi
    const executedRes = await client.query('SELECT name FROM _migrations');
    const executedMigrations = new Set(executedRes.rows.map((r) => r.name));

    // Baca file migrasi dari folder migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('Folder migrations tidak ditemukan.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (!executedMigrations.has(file)) {
        console.log(`Mengeksekusi migrasi: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`✓ Berhasil: ${file}`);
          count++;
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`✗ Gagal pada ${file}:`, err.message);
          throw err;
        }
      } else {
        console.log(`- Lewati (sudah dieksekusi): ${file}`);
      }
    }

    console.log(`--- Migrasi selesai. ${count} file baru dieksekusi. ---`);
  } catch (err) {
    console.error('Migrasi gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    // Tutup pool setelah script selesai agar terminal kembali
    await db.pool.end();
  }
}

runMigrations();
