const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generateFixtures() {
  const fixturesDir = __dirname;
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // 1. Generate dummy_master_coa.xlsx (3 sheet)
  const coaWorkbook = new ExcelJS.Workbook();

  // Sheet 1: Master COA
  const sheetMasterCoa = coaWorkbook.addWorksheet('Master COA');
  sheetMasterCoa.addRow(['kode_coa', 'nama_coa', 'kategori']);
  sheetMasterCoa.addRows([
    ['4.1.7', 'Biaya Bahan O2 & NO2', 'biaya'],
    ['4.2.1', 'Biaya Bahan Makan', 'biaya'],
    ['5.1.9', 'Biaya Seragam Pegawai', 'biaya'],
    ['5.2.4', 'Biaya Pemakaian Suku Cadang Medis', 'biaya'],
    ['5.4.1', 'Biaya Penyusutan Bangunan', 'investasi'],
    ['5.4.2', 'Biaya Penyusutan Peralatan Medis', 'investasi'],
    ['5.4.3', 'Biaya Penyusutan Peralatan Non Medis', 'investasi'],
    ['5.8.3', 'Biaya Cetak & Fotocopy', 'biaya'],
  ]);

  // Sheet 2: Kategori Biaya
  const sheetKatBiaya = coaWorkbook.addWorksheet('Kategori Biaya');
  sheetKatBiaya.addRow(['kode_kelompok', 'nama_kelompok']);
  sheetKatBiaya.addRows([
    ['4.1', 'Biaya Bahan Medis'],
    ['4.2', 'Biaya Bahan Non Medis'],
    ['5.1', 'Biaya Pegawai'],
    ['5.2', 'Biaya Pemeliharaan'],
    ['5.4', 'Biaya Penyusutan'],
    ['5.8', 'Biaya Administrasi & Umum'],
  ]);

  // Sheet 3: Kategori Investasi
  const sheetKatInv = coaWorkbook.addWorksheet('Kategori Investasi');
  sheetKatInv.addRow(['kategori', 'masa_manfaat_bulan', 'coa_penyusutan']);
  sheetKatInv.addRows([
    ['BANGUNAN', 120, '5.4.1'],
    ['PERALATAN MEDIS', 60, '5.4.2'],
    ['PC/LAPTOP', 60, '5.4.3'],
  ]);

  const coaPath = path.join(fixturesDir, 'dummy_master_coa.xlsx');
  await coaWorkbook.xlsx.writeFile(coaPath);
  console.log('✓ Fixture generated:', coaPath);

  // 2. Generate dummy_master_barang.xlsx (sheet MASTER_BARANG)
  const itemWorkbook = new ExcelJS.Workbook();
  const sheetBarang = itemWorkbook.addWorksheet('MASTER_BARANG');
  sheetBarang.addRow([
    'ID_BARANG',
    'KODE_PRODUK',
    'NAMA_BARANG',
    'GOLONGAN',
    'SATUAN_BELI',
    'HPP',
    'STATUS',
    'COA_BIAYA',
    'COA_PERSEDIAAN',
    'KATEGORI_COA',
  ]);
  sheetBarang.addRows([
    [
      1,
      '6L',
      '6-002- AMPLOP COKLAT PT. CN 1/2 FOLIO',
      'Bahan Cetakan',
      'Lembar',
      644,
      'Aktif',
      '5.8.3',
      '1.1.5.1',
      'Biaya Administrasi',
    ],
    [
      2,
      'MED-01',
      'Oksigen Tabung 6m3',
      'Bahan Medis',
      'Tabung',
      120000,
      'Aktif',
      '5.8.3', // COA di database awal 4.1.7 -> ini mendeteksi perubahan COA
      '1.1.5.1',
      'Biaya Administrasi',
    ],
    [
      101,
      'MED-NEW',
      'KERTAS EKG THERMAL ROLL DUMMY',
      'Bahan Medis',
      'Roll',
      45000,
      'Aktif',
      '4.1.7',
      '1.1.5.1',
      'Biaya Bahan Medis',
    ],
    [
      102,
      'HPP-NOL',
      'SAMPLE BROSUR PROMOSI DUMMY',
      'Bahan Cetakan',
      'Lembar',
      0, // HPP Nol
      'Aktif',
      '5.8.3',
      '1.1.5.1',
      'Biaya Administrasi',
    ],
    [
      103,
      'NO-COA',
      'BARANG DUMMY TANPA COA',
      'Umum',
      'Pcs',
      15000,
      'Aktif',
      '', // Tanpa COA
      '',
      '',
    ],
    [
      104,
      'ERR-COA',
      'BARANG DUMMY COA TIDAK DIKENAL',
      'Umum',
      'Pcs',
      20000,
      'Aktif',
      '9.9.9.99', // COA tidak ada di tabel coas
      '',
      '',
    ],
  ]);

  const itemPath = path.join(fixturesDir, 'dummy_master_barang.xlsx');
  await itemWorkbook.xlsx.writeFile(itemPath);
  console.log('✓ Fixture generated:', itemPath);
}

if (require.main === module) {
  generateFixtures().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { generateFixtures };

