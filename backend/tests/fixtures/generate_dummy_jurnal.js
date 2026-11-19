const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generateRealizationFixtures() {
  const fixturesDir = __dirname;
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // 1. dummy_daftar_jurnal.xlsx (~200 baris)
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('DAFTAR_JURNAL');

  // Header Wajib
  sheet.addRow([
    'TANGGAL',
    'ID SUB JURNAL',
    'IDGL',
    'KODE COA',
    'NAMA COA',
    'UNIT',
    'DEBET',
    'KREDIT',
    'KETERANGAN',
  ]);

  const rows = [];

  // a. 100 baris Biaya valid (Akun 5.2.4 & 4.1.7) dengan unit [9910] MCU
  for (let i = 1; i <= 100; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    const coaCode = i % 2 === 0 ? '5.2.4' : '4.1.7';
    const coaName = i % 2 === 0 ? 'Biaya Pemakaian Suku Cadang Medis' : 'Biaya Bahan O2 & NO2';
    const debit = 100000 + i * 1000;
    const credit = i % 5 === 0 ? 10000 : 0;
    const desc = i === 1 ? 'Pemakaian suku cadang (101) rutin' : `Transaksi operasional baris ${i}`;

    rows.push([
      '2026-10-15',
      sjId,
      idgl,
      coaCode,
      coaName,
      'MCU [9910]',
      debit,
      credit,
      desc,
    ]);
  }

  // b. 30 baris Biaya valid dengan unit [9920] LABORATORIUM
  for (let i = 101; i <= 130; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    rows.push([
      '2026-10-16',
      sjId,
      idgl,
      '5.1.9',
      'Biaya Seragam Pegawai',
      'LABORATORIUM [9920]',
      250000,
      0,
      `Biaya seragam lab ${i}`,
    ]);
  }

  // c. 20 baris Akun Aset Tetap (1.2.1.1.4 dan 1.2.1.1.6)
  for (let i = 131; i <= 150; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    const assetCoa = i <= 140 ? '1.2.1.1.4' : '1.2.1.1.6';
    rows.push([
      '2026-10-18',
      sjId,
      idgl,
      assetCoa,
      'Aset Peralatan Medis / Non Medis',
      'MCU [9910]',
      5000000 + (i - 130) * 100000,
      500000, // credit tidak boleh mengurangi realisasi aset tetap (BR-05: satu sisi)
      `Pengadaan aset baris ${i}`,
    ]);
  }

  // d. 20 baris Akun Kas / Non-Biaya (1.1.1, 2.1.1, 31211000) -> harus dilewati (rows_skipped)
  for (let i = 151; i <= 170; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    const nonExpenseCoa = i <= 160 ? '1.1.1.01' : '2.1.1.01';
    rows.push([
      '2026-10-20',
      sjId,
      idgl,
      nonExpenseCoa,
      'Kas / Hutang Usaha',
      'MCU [9910]',
      1000000,
      0,
      `Bukan akun biaya baris ${i}`,
    ]);
  }

  // e. 10 baris dengan teks unit tanpa kode [9xxx] (misal: "KLINIK SG SATELIT") -> untuk uji alias
  for (let i = 171; i <= 180; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    rows.push([
      '2026-10-22',
      sjId,
      idgl,
      '5.2.4',
      'Biaya Pemakaian Suku Cadang Medis',
      'KLINIK SG SATELIT',
      150000,
      0,
      `Biaya klinik satelit baris ${i}`,
    ]);
  }

  // f. 5 baris TANPA UNIT (kolom unit kosong) -> NO_UNIT error
  for (let i = 181; i <= 185; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    rows.push([
      '2026-10-23',
      sjId,
      idgl,
      '5.8.3',
      'Biaya Cetak & Fotocopy',
      '',
      50000,
      0,
      `Baris tanpa unit ${i}`,
    ]);
  }

  // g. 5 baris dengan unit tidak dikenal -> UNMAPPED_UNIT error
  for (let i = 186; i <= 190; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    rows.push([
      '2026-10-24',
      sjId,
      idgl,
      '5.8.3',
      'Biaya Cetak & Fotocopy',
      'UNIT FIKTIF TIDAK DIKENAL',
      75000,
      0,
      `Baris unit tak dikenal ${i}`,
    ]);
  }

  // h. 5 baris pemakaian dengan ID barang tidak dikenal di master -> UNMATCHED_ITEM
  for (let i = 191; i <= 195; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    rows.push([
      '2026-10-25',
      sjId,
      idgl,
      '5.2.4',
      'Biaya Pemakaian Suku Cadang Medis',
      'MCU [9910]',
      80000,
      0,
      `Pemakaian reagen (999999) tidak ada di master`,
    ]);
  }

  // i. 5 baris pemakaian dengan keterangan kata pemakaian tetapi tanpa tanda kurung -> UNMATCHED_ITEM
  for (let i = 196; i <= 200; i++) {
    const sjId = `SJ-202610-${String(i).padStart(4, '0')}`;
    const idgl = `GL-${String(i).padStart(4, '0')}`;
    rows.push([
      '2026-10-26',
      sjId,
      idgl,
      '5.2.4',
      'Biaya Pemakaian Suku Cadang Medis',
      'MCU [9910]',
      90000,
      0,
      `Pemakaian bahan tanpa nomor kurung`,
    ]);
  }

  sheet.addRows(rows);

  const mainPath = path.join(fixturesDir, 'dummy_daftar_jurnal.xlsx');
  await workbook.xlsx.writeFile(mainPath);
  console.log('✓ Fixture generated:', mainPath);

  // 2. dummy_jurnal_missing_header.xlsx (untuk uji 400 Bad Request)
  const badWorkbook = new ExcelJS.Workbook();
  const badSheet = badWorkbook.addWorksheet('SHEET1');
  badSheet.addRow([
    'TANGGAL',
    'IDGL',
    'KODE COA',
    'UNIT',
    'DEBET',
    'KREDIT',
  ]); // sengaja tanpa ID SUB JURNAL, NAMA COA, KETERANGAN
  badSheet.addRow(['2026-10-01', 'GL-01', '5.1.1', 'MCU', 1000, 0]);

  const badPath = path.join(fixturesDir, 'dummy_jurnal_missing_header.xlsx');
  await badWorkbook.xlsx.writeFile(badPath);
  console.log('✓ Bad header fixture generated:', badPath);

  // 3. dummy_jurnal_clean.xlsx (50 baris valid, semua unit MCU [9910] untuk uji konfirmasi, replace vs append & kalkulasi)
  const cleanWorkbook = new ExcelJS.Workbook();
  const cleanSheet = cleanWorkbook.addWorksheet('CLEAN_JURNAL');
  cleanSheet.addRow([
    'TANGGAL',
    'ID SUB JURNAL',
    'IDGL',
    'KODE COA',
    'NAMA COA',
    'UNIT',
    'DEBET',
    'KREDIT',
    'KETERANGAN',
  ]);
  const cleanRows = [];
  // 25 baris biaya: DEBET 100.000, KREDIT 20.000 -> Realisasi = 80.000 per baris x 25 = 2.000.000
  for (let i = 1; i <= 25; i++) {
    cleanRows.push([
      '2026-10-10',
      `SJ-CLEAN-${String(i).padStart(3, '0')}`,
      `GL-CLEAN-${i}`,
      '5.2.4',
      'Biaya Pemakaian Suku Cadang Medis',
      'MCU [9910]',
      100000,
      20000,
      i === 1 ? 'Pemakaian reagen (101) lab MCU' : `Operasional bersih ${i}`,
    ]);
  }
  // 25 baris aset tetap: DEBET 500.000, KREDIT 50.000 -> Realisasi = 500.000 per baris x 25 = 12.500.000
  for (let i = 26; i <= 50; i++) {
    cleanRows.push([
      '2026-10-12',
      `SJ-CLEAN-${String(i).padStart(3, '0')}`,
      `GL-CLEAN-${i}`,
      '1.2.1.1.4',
      'Peralatan Medis',
      'MCU [9910]',
      500000,
      50000,
      `Pengadaan aset bersih ${i}`,
    ]);
  }
  cleanSheet.addRows(cleanRows);
  const cleanPath = path.join(fixturesDir, 'dummy_jurnal_clean.xlsx');
  await cleanWorkbook.xlsx.writeFile(cleanPath);
  console.log('✓ Clean fixture generated:', cleanPath);
}

if (require.main === module) {
  generateRealizationFixtures()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  generateRealizationFixtures,
};
