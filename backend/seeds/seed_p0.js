const bcrypt = require('bcryptjs');
const db = require('../db');

async function seed() {
  const client = await db.pool.connect();
  try {
    console.log('--- Menjalankan Seed Data Fiktif (P0) ---');
    await client.query('BEGIN');

    // 1. Perusahaan (2 perusahaan)
    console.log('Seeding companies...');
    await client.query(`
      INSERT INTO companies (id, code, name) VALUES
      (1, 'CN', 'PT Cipta Nirmala'),
      (2, 'CNH', 'Cipta Nirmala Husada')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
    `);
    await client.query("SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies))");

    // 2. Org Groups (Instalasi / Unit Bisnis)
    console.log('Seeding org_groups...');
    await client.query(`
      INSERT INTO org_groups (id, company_id, name, type) VALUES
      (1, 1, 'Instalasi Penunjang Medik', 'instalasi'),
      (2, 1, 'Instalasi Pelayanan Medik', 'instalasi'),
      (3, 1, 'Instalasi Rawat Inap', 'instalasi'),
      (4, 2, 'Unit Bisnis Gresik', 'unit_bisnis'),
      (5, 2, 'Unit Bisnis Tuban & Jateng', 'unit_bisnis')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;
    `);
    await client.query("SELECT setval('org_groups_id_seq', (SELECT MAX(id) FROM org_groups))");

    // 3. Units (6 unit: 3 CN, 3 CNH)
    console.log('Seeding units...');
    await client.query(`
      INSERT INTO units (id, company_id, group_id, code, name, classification) VALUES
      (1, 1, 1, '9220', 'MCU', 'Penunjang Intermediate'),
      (2, 1, 1, '9241', 'LABORATORIUM', 'Penunjang Intermediate'),
      (3, 1, 3, '9110', 'RAWAT INAP 1', 'Pusat Biaya'),
      (4, 2, 4, '9310', 'KLINIK SG PPS', 'Pusat Laba'),
      (5, 2, 4, '9320', 'KLINIK SG VETERAN', 'Pusat Laba'),
      (6, 2, 5, '9410', 'KLINIK BOGOREJO', 'Pusat Laba')
      ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name, classification = EXCLUDED.classification;
    `);
    await client.query("SELECT setval('units_id_seq', (SELECT MAX(id) FROM units))");

    // 4. COA Groups (Jenis COA)
    console.log('Seeding coa_groups...');
    await client.query(`
      INSERT INTO coa_groups (id, code, name) VALUES
      (1, '4.1', 'Biaya Bahan Medis'),
      (2, '4.2', 'Biaya Bahan Non Medis'),
      (3, '5.1', 'Biaya Pegawai'),
      (4, '5.2', 'Biaya Pemeliharaan'),
      (5, '5.4', 'Biaya Penyusutan'),
      (6, '5.7', 'Biaya Rumah Tangga & Lingkungan'),
      (7, '5.8', 'Biaya Administrasi & Umum')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
    `);
    await client.query("SELECT setval('coa_groups_id_seq', (SELECT MAX(id) FROM coa_groups))");

    // 5. COA (12 COA utama + 2 COA penyusutan)
    console.log('Seeding coas...');
    await client.query(`
      INSERT INTO coas (id, group_id, code, name, category) VALUES
      (1, 1, '4.1.7', 'Biaya Bahan O2 & NO2', 'biaya'),
      (2, 2, '4.2.1', 'Biaya Bahan Makan', 'biaya'),
      (3, 2, '4.2.2', 'Biaya Bahan Cucian', 'biaya'),
      (4, 2, '4.2.3', 'Biaya Bahan Pembersih', 'biaya'),
      (5, 2, '4.2.4', 'Biaya Bahan Linen', 'biaya'),
      (6, 2, '4.2.5', 'Biaya Bahan Bakar L.P.G.', 'biaya'),
      (7, 3, '5.1.9', 'Biaya Seragam Pegawai', 'biaya'),
      (8, 4, '5.2.4', 'Biaya Pemakaian Suku Cadang Medis', 'biaya'),
      (9, 4, '5.2.6', 'Biaya Pemakaian Suku Cadang Non Medis', 'biaya'),
      (10, 6, '5.7.3', 'Biaya Rumah Tangga', 'biaya'),
      (11, 7, '5.8.2', 'Biaya Pemakaian Alat Perkantoran', 'biaya'),
      (12, 7, '5.8.3', 'Biaya Cetak & Fotocopy', 'biaya'),
      (13, 5, '5.4.2', 'Biaya Penyusutan Peralatan Medis', 'investasi'),
      (14, 5, '5.4.3', 'Biaya Penyusutan Peralatan Non Medis', 'investasi')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;
    `);
    await client.query("SELECT setval('coas_id_seq', (SELECT MAX(id) FROM coas))");

    // 6. Investment Types
    console.log('Seeding investment_types...');
    await client.query(`
      INSERT INTO investment_types (id, name) VALUES
      (1, 'Tanah & Bangunan'),
      (2, 'Peralatan Medis'),
      (3, 'Peralatan Non Medis'),
      (4, 'Knowledge'),
      (5, 'Laptop/PC')
      ON CONFLICT (name) DO NOTHING;
    `);
    await client.query(
      "SELECT setval('investment_types_id_seq', (SELECT MAX(id) FROM investment_types))"
    );

    // 7. Priorities
    console.log('Seeding priorities...');
    await client.query(`
      INSERT INTO priorities (id, name) VALUES
      (1, 'Strategic'),
      (2, 'Improvement'),
      (3, 'Regulasi'),
      (4, 'Keep Operation')
      ON CONFLICT (name) DO NOTHING;
    `);
    await client.query("SELECT setval('priorities_id_seq', (SELECT MAX(id) FROM priorities))");

    // 8. Investment Categories (Kategori Investasi & Masa Manfaat)
    console.log('Seeding investment_categories...');
    await client.query(`
      INSERT INTO investment_categories (id, name, useful_life_months, depreciation_coa_id) VALUES
      (1, 'BANGUNAN', 120, NULL),
      (2, 'PERALATAN MEDIS', 60, 13),
      (3, 'PERALATAN NON MEDIS', 60, 14),
      (4, 'KENDARAAN', 48, 14),
      (5, 'ASET TAK BERWUJUD', 48, NULL),
      (6, 'PC/LAPTOP', 60, 14),
      (7, 'AC 2 PK', 60, 14)
      ON CONFLICT (name) DO UPDATE SET useful_life_months = EXCLUDED.useful_life_months, depreciation_coa_id = EXCLUDED.depreciation_coa_id;
    `);
    await client.query(
      "SELECT setval('investment_categories_id_seq', (SELECT MAX(id) FROM investment_categories))"
    );

    // 9. Periods (2027)
    console.log('Seeding periods...');
    await client.query(`
      INSERT INTO periods (id, company_id, year, status, fill_deadline, review_deadline, lock_date, submission_state) VALUES
      (1, 1, 2027, 'PENGISIAN', '2026-11-20', '2026-12-01', '2026-12-05', 'BUKA'),
      (2, 2, 2027, 'PENGISIAN', '2026-11-20', '2026-12-01', '2026-12-05', 'BUKA')
      ON CONFLICT (company_id, year) DO UPDATE SET status = EXCLUDED.status;
    `);
    await client.query("SELECT setval('periods_id_seq', (SELECT MAX(id) FROM periods))");

    // 10. Items (50 barang)
    console.log('Seeding 50 items...');
    const itemsData = [
      // 4.1.7 O2 & NO2 (3 item)
      ['BRG-001', 'Oksigen Medis Tabung Besar (6 m3)', 'Tabung', 1, 95000, 98000],
      ['BRG-002', 'Oksigen Medis Tabung Kecil (1 m3)', 'Tabung', 1, 45000, 48000],
      ['BRG-003', 'Nitrous Oxide (N2O) Medis', 'Tabung', 1, 450000, 460000],

      // 4.2.1 Bahan Makan (5 item)
      ['BRG-004', 'Beras Ramos Super 25 Kg', 'Sak', 2, 360000, 365000],
      ['BRG-005', 'Minyak Goreng Sawit 2 Liter', 'Pouch', 2, 38000, 39000],
      ['BRG-006', 'Gula Pasir Kristal Putih 1 Kg', 'Kg', 2, 17500, 18000],
      ['BRG-007', 'Telur Ayam Broiler 1 Tray (30 butir)', 'Tray', 2, 52000, 54000],
      ['BRG-008', 'Susu Kental Manis Putih Kaleng', 'Kaleng', 2, 13000, 13500],

      // 4.2.2 Bahan Cucian (4 item)
      ['BRG-009', 'Deterjen Bubuk Laundry Konsentrat 5 Kg', 'Sak', 3, 95000, 97000],
      ['BRG-010', 'Pelembut & Pewangi Pakaian 5 Liter', 'Jerigen', 3, 75000, 78000],
      ['BRG-011', 'Pemutih Pakaian Klorin 5 Liter', 'Jerigen', 3, 48000, 50000],
      ['BRG-012', 'Penghilang Noda Darah Linen 1 Liter', 'Botol', 3, 62000, 65000],

      // 4.2.3 Bahan Pembersih (5 item)
      ['BRG-013', 'Karbol Wangi Disinfektan Lantai 5 Liter', 'Jerigen', 4, 65000, 68000],
      ['BRG-014', 'Cairan Pencuci Piring Jeruk Nipis 5 Liter', 'Jerigen', 4, 58000, 60000],
      ['BRG-015', 'Pembersih Kaca Glass Cleaner 4 Liter', 'Jerigen', 4, 42000, 44000],
      ['BRG-016', 'Pembersih Porselen & Kloset 1 Liter', 'Botol', 4, 28000, 30000],
      ['BRG-017', 'Sabun Cuci Tangan Handsoap Antiseptik 4 L', 'Jerigen', 4, 85000, 88000],

      // 4.2.4 Bahan Linen (4 item)
      ['BRG-018', 'Sprei Tempat Tidur Pasien Katun Putih', 'Pcs', 5, 85000, 90000],
      ['BRG-019', 'Sarung Bantal Pasien Katun Putih', 'Pcs', 5, 25000, 27000],
      ['BRG-020', 'Selimut Pasien Garis Biru Halus', 'Pcs', 5, 120000, 125000],
      ['BRG-021', 'Kain Lap Microfiber Serbaguna', 'Pcs', 5, 12000, 13000],

      // 4.2.5 Bahan Bakar LPG (2 item)
      ['BRG-022', 'Gas Elpiji 50 Kg Industri Refill', 'Tabung', 6, 820000, 840000],
      ['BRG-023', 'Gas Elpiji Bright Gas 12 Kg Refill', 'Tabung', 6, 215000, 220000],

      // 5.1.9 Seragam Pegawai (4 item)
      ['BRG-024', 'Kemeja Seragam Pegawai Putih Lengan Pendek', 'Pcs', 7, 145000, 150000],
      ['BRG-025', 'Celana Panjang Kerja Drill Hitam/Biru', 'Pcs', 7, 160000, 165000],
      ['BRG-026', 'Jas Dokter Kain Katun Drill Putih', 'Pcs', 7, 210000, 220000],
      ['BRG-027', 'Baju Jaga Scrub Medis Hijau (Atasan+Bawahan)', 'Set', 7, 185000, 190000],

      // 5.2.4 Suku Cadang Medis (5 item)
      ['BRG-028', 'Manset Tensimeter Dewasa 2 Selang', 'Pcs', 8, 85000, 90000],
      ['BRG-029', 'Probe Sensor SpO2 Pasien Dewasa', 'Pcs', 8, 350000, 365000],
      ['BRG-030', 'Kabel Pasien EKG 10 Lead Banana Pin', 'Set', 8, 850000, 890000],
      ['BRG-031', 'Bulb / Bola Hisap EKG Precordial 6 Pcs', 'Set', 8, 140000, 150000],
      ['BRG-032', 'Lampu Halogen Mikroskop Medis 6V 20W', 'Pcs', 8, 175000, 185000],

      // 5.2.6 Suku Cadang Non Medis (4 item)
      ['BRG-033', 'Kapasitor AC Split 35 uF 450V', 'Pcs', 9, 65000, 70000],
      ['BRG-034', 'Lampu LED Tube T8 16 Watt Putih', 'Pcs', 9, 42000, 44000],
      ['BRG-035', 'Saklar Ganda & Stop Kontak Broco', 'Pcs', 9, 32000, 34000],
      ['BRG-036', 'Kran Air Tembok Stainless 1/2 Inch', 'Pcs', 9, 78000, 82000],

      // 5.7.3 Biaya Rumah Tangga (5 item)
      ['BRG-037', 'Tempat Sampah Medis Injak Kuning 20L', 'Pcs', 10, 110000, 115000],
      ['BRG-038', 'Sapu Nilon Lantai Tangkai Panjang', 'Pcs', 10, 35000, 37000],
      ['BRG-039', 'Pel Lantai Katun Putih Tangkai Besi', 'Pcs', 10, 55000, 58000],
      ['BRG-040', 'Kantong Plastik Sampah Kuning Medis 60x80', 'Pack', 10, 45000, 47000],
      ['BRG-041', 'Baterai Alkalin Ukuran AA (Isi 4)', 'Pack', 10, 32000, 34000],

      // 5.8.2 Alat Perkantoran (5 item)
      ['BRG-042', 'Ballpoint Hitam 0.5 mm Box (12 Pcs)', 'Box', 11, 28000, 30000],
      ['BRG-043', 'Map Snelhecter Plastik Biru (12 Pcs)', 'Lusin', 11, 45000, 48000],
      ['BRG-044', 'Stapler No. 10 Joyko/HD-10', 'Pcs', 11, 16000, 17000],
      ['BRG-045', 'Isi Staples No. 10 (Kotak kecil)', 'Box', 11, 4000, 4500],
      ['BRG-046', 'Spidol Whiteboard Marker Hitam Snowman', 'Lusin', 11, 84000, 88000],

      // 5.8.3 Cetak & Fotocopy (4 item)
      ['BRG-047', 'Kertas HVS A4 70 gr PaperOne', 'Rim', 12, 48000, 50000],
      ['BRG-048', 'Kertas HVS F4 / Folio 70 gr PaperOne', 'Rim', 12, 53000, 55000],
      ['BRG-049', 'Kertas Thermal Roll Kasir 80x80 mm', 'Roll', 12, 14000, 15000],
      ['BRG-050', 'Formulir Resep Dokter Berkop (Isi 100 lembar)', 'Buku', 12, 18000, 19000],
    ];

    let itemIdx = 1;
    for (const [code, name, uom, coaId, priceCN, priceCNH] of itemsData) {
      await client.query(
        `
        INSERT INTO items (id, code, name, uom, coa_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, uom = EXCLUDED.uom, coa_id = EXCLUDED.coa_id;
      `,
        [itemIdx, code, name, uom, coaId]
      );

      // Relasi item_company
      await client.query(
        `
        INSERT INTO item_company (item_id, company_id, legacy_id)
        VALUES ($1, 1, $2), ($1, 2, $2)
        ON CONFLICT (item_id, company_id) DO NOTHING;
      `,
        [itemIdx, code]
      );

      // Harga CN & CNH di period 1 & 2
      await client.query(
        `
        INSERT INTO item_prices (item_id, company_id, period_id, price)
        VALUES
        ($1, 1, 1, $2),
        ($1, 2, 2, $3)
        ON CONFLICT (item_id, company_id, period_id) DO UPDATE SET price = EXCLUDED.price;
      `,
        [itemIdx, priceCN, priceCNH]
      );

      itemIdx++;
    }
    await client.query("SELECT setval('items_id_seq', (SELECT MAX(id) FROM items))");

    // 11. Settings (Pengaturan Sistem)
    console.log('Seeding settings...');
    const defaultSettings = [
      ['investment_threshold', 5000000, 'Ambang batas nilai investasi per item (rupiah)'],
      ['warning_percent', 80, 'Ambang batas peringatan pemakaian anggaran (%)'],
      ['critical_percent', 100, 'Ambang batas kritis pemakaian anggaran (%)'],
      ['justification_percent', 20, 'Ambang batas kenaikan qty yang mewajibkan justifikasi (%)'],
      ['auto_close_on_deadline', true, 'Tutup pengajuan otomatis saat deadline terlewati'],
      ['auto_reopen_on_return', true, 'Buka pengajuan unit otomatis saat dokumen dikembalikan'],
      ['reminder_days_before', [3, 1], 'Hari pengiriman notifikasi pengingat sebelum deadline'],
      [
        'investment_asset_coas',
        ['1.2.1.1.4', '1.2.1.1.6'],
        'Daftar akun aset tetap untuk realisasi investasi',
      ],
    ];

    for (const [key, val, desc] of defaultSettings) {
      await client.query(
        `
        INSERT INTO settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;
      `,
        [key, JSON.stringify(val), desc]
      );
    }

    // 12. Users (3 dev users + 1 inactive user)
    console.log('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const usersData = [
      {
        id: 1,
        name: 'Rina Pratiwi',
        email: 'rina@ptcn.id',
        role: 'pic',
        is_active: true,
        units: [1],
      },
      {
        id: 2,
        name: 'Budi Santoso',
        email: 'budi@ptcn.id',
        role: 'manager',
        is_active: true,
        units: [1, 2],
      },
      {
        id: 3,
        name: 'Dya Putri',
        email: 'dya@ptcn.id',
        role: 'akuntansi',
        is_active: true,
        units: [1, 2, 3, 4, 5, 6],
      },
      {
        id: 4,
        name: 'User Nonaktif',
        email: 'nonaktif@ptcn.id',
        role: 'pic',
        is_active: false,
        units: [1],
      },
    ];

    for (const u of usersData) {
      await client.query(
        `
        INSERT INTO users (id, name, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active;
      `,
        [u.id, u.name, u.email, passwordHash, u.role, u.is_active]
      );

      await client.query(
        `
        INSERT INTO user_roles (user_id, role)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role) DO NOTHING;
      `,
        [u.id, u.role]
      );

      await client.query('DELETE FROM user_unit_access WHERE user_id = $1', [u.id]);
      for (const unitId of u.units) {
        await client.query(
          `
          INSERT INTO user_unit_access (user_id, unit_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, unit_id) DO NOTHING;
        `,
          [u.id, unitId]
        );
      }
    }
    await client.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");

    await client.query('COMMIT');
    console.log('--- Seed data fiktif selesai dan berhasil! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed();
