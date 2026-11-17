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
    ['31211000', 'PENDAPATAN LABORATORIUM', 'pendapatan'],
    ['31212000', 'PENDAPATAN MCU', 'pendapatan'],
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
      '5.8.3', // COA di database awal 4.1.7 -> mendeteksi perubahan COA
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

  // 3. Generate dummy_master_unit.xlsx (Sheet Master_Unit + Petunjuk)
  const unitWorkbook = new ExcelJS.Workbook();

  // Sheet Petunjuk
  const sheetPetunjuk = unitWorkbook.addWorksheet('Petunjuk');
  sheetPetunjuk.addRow(['DRAF Master Unit untuk diverifikasi Akuntansi']);
  sheetPetunjuk.addRow([
    'Aturan impor:',
    'Kolom final yang kosong berarti memakai nilai awal (kolom C, D, E, J). Keputusan kosong atau Pakai: unit aktif. Ubah: nilai kolom final dipakai. Hapus: unit dinonaktifkan, bukan dihapus. Gabung ke unit lain: dilaporkan untuk ditangani manual.',
  ]);

  // Sheet Master_Unit
  const sheetMasterUnit = unitWorkbook.addWorksheet('Master_Unit');
  sheetMasterUnit.addRow([
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

  sheetMasterUnit.addRows([
    [
      1,
      'CN',
      'DU-01',
      'LABORATORIUM DUMMY',
      'INSTALASI PENUNJANG MEDIK',
      null,
      'LAB',
      'LABORATORIUM',
      'PENUNJANG INTERMEDIATE',
      'PENUNJANG INTERMEDIATE',
      '31211000',
      'PENDAPATAN LABORATORIUM',
      'INSTALASI LAB & MCU',
      'Ya',
      null,
      'Pakai',
      null,
      null,
      null,
      null,
      null,
      1,
      'DRAFT-CN-01',
    ],
    [
      2,
      'CN',
      'DU-02',
      'MCU DUMMY',
      'INSTALASI PENUNJANG MEDIK',
      null,
      'MCU',
      'MCU',
      'PUSAT LABA',
      'PUSAT LABA',
      '31212000',
      'PENDAPATAN MCU',
      'INSTALASI LAB & MCU',
      'Ya',
      null,
      'Pakai',
      null,
      null,
      null,
      null,
      null,
      2,
      'DRAFT-CN-02',
    ],
    [
      3,
      'CN',
      'DU-03',
      'RAWAT INAP DUMMY',
      'INSTALASI RAWAT INAP',
      null,
      'RI1',
      'RAWAT INAP 1',
      'PUSAT LABA',
      'PUSAT LABA',
      null,
      null,
      null,
      'Ya',
      null,
      'Ubah',
      'DU-03B',
      'RAWAT INAP TERPADU',
      'INSTALASI RAWAT INAP TERPADU',
      'PUSAT LABA UTAMA',
      'Penggabungan gedung',
      3,
      'DRAFT-CN-03',
    ],
    [
      4,
      'CN',
      'DU-04',
      'GUDANG LAMA DUMMY',
      'SUPPORTING',
      null,
      'GDG',
      'GUDANG LAMA',
      'NON PUSAT LABA',
      'NON PUSAT LABA',
      null,
      null,
      null,
      'Tidak',
      null,
      'Hapus', // Keputusan Hapus -> dinonaktifkan
      null,
      null,
      null,
      null,
      'Gudang sudah tidak beroperasi',
      4,
      'DRAFT-CN-04',
    ],
    [
      5,
      'CN',
      '', // Kode kosong
      'POLIKLINIK SPESIALIS BARU',
      'INSTALASI RAWAT JALAN',
      null,
      'POLI',
      'POLI SPESIALIS',
      'PUSAT LABA',
      'PUSAT LABA',
      null,
      null,
      null,
      'Tidak',
      'TIDAK ADA KODE', // Isu
      '', // Keputusan kosong
      '',
      '',
      '',
      '',
      'Perlu kode resmi Akuntansi',
      5,
      'DRAFT-CN-05',
    ],
    [
      6,
      'CN',
      'DU-06',
      'KANTOR PERWAKILAN DUMMY',
      'SUPPORTING',
      null,
      'KTR',
      'KANTOR PERWAKILAN',
      'NON PUSAT LABA',
      'NON PUSAT LABA',
      null,
      null,
      null,
      'Ya',
      null,
      'Gabung ke unit lain', // Keputusan Gabung -> needs_review = true
      null,
      null,
      null,
      null,
      'Gabung ke unit 9901 Kantor Pusat',
      6,
      'DRAFT-CN-06',
    ],
    [
      7,
      'CNH',
      'DU-07',
      'KLINIK PRATAMA SG DUMMY',
      'UNIT BISNIS KLINIK',
      'KLINIK UTAMA',
      'SG',
      'KLINIK SG',
      'PUSAT LABA',
      'PUSAT LABA',
      null,
      null,
      null,
      'Tidak',
      null,
      'Pakai',
      null,
      null,
      null,
      null,
      null,
      1,
      'DRAFT-CNH-01',
    ],
    [
      8,
      'CNH',
      'DU-08',
      'KLINIK BOGOREJO DUMMY',
      'UNIT BISNIS KLINIK',
      'KLINIK PRATAMA',
      'BGR',
      'KLINIK BOGOREJO',
      'PUSAT LABA',
      'PUSAT LABA',
      null,
      null,
      null,
      'Tidak',
      null,
      '', // Keputusan kosong -> aktif default
      null,
      null,
      null,
      null,
      null,
      2,
      'DRAFT-CNH-02',
    ],
    [
      9,
      'CNH',
      '', // Awal tanpa kode
      'KLINIK DRAF VETERAN',
      'UNIT BISNIS KLINIK',
      'KLINIK PRATAMA',
      'VET',
      'KLINIK VETERAN',
      null,
      'PERLU DIISI',
      null,
      null,
      null,
      'Tidak',
      'KLASIFIKASI kosong, TIDAK ADA KODE',
      'Ubah',
      'DU-09B', // Diberi kode final
      'KLINIK PRATAMA VETERAN',
      'UNIT BISNIS KLINIK',
      'PUSAT LABA',
      'Kode resmi dari manajemen',
      3,
      'DRAFT-CNH-03',
    ],
    [
      10,
      'CNH',
      'DU-10',
      'APOTEK CABANG LAMA DUMMY',
      'SUPPORTING',
      null,
      'APT',
      'APOTEK CABANG',
      'NON PUSAT LABA',
      'NON PUSAT LABA',
      null,
      null,
      null,
      'Tidak',
      null,
      'Hapus', // Keputusan Hapus -> dinonaktifkan
      null,
      null,
      null,
      null,
      'Sudah dimerge ke klinik',
      4,
      'DRAFT-CNH-04',
    ],
  ]);

  const unitPath = path.join(fixturesDir, 'dummy_master_unit.xlsx');
  await unitWorkbook.xlsx.writeFile(unitPath);
  console.log('✓ Fixture generated:', unitPath);
}

if (require.main === module) {
  generateFixtures().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { generateFixtures };
