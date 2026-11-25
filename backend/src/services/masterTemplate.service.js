const ExcelJS = require('exceljs');

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF3D4E9C' }, // Ungu tema RKAP
};

const HEADER_FONT = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

/**
 * 1. Template Master Barang Logistik (.xlsx)
 * Sesuai dengan parser masterImportService.importItems:
 * Sheet: MASTER_BARANG
 * Kolom: KODE_BARANG, KODE_PRODUK, NAMA_BARANG, GOLONGAN, SATUAN, HPP, COA_BIAYA, STATUS
 */
async function generateItemsTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem RKAP';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('MASTER_BARANG', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'KODE_BARANG', key: 'code', width: 16 },
    { header: 'KODE_PRODUK', key: 'prod_code', width: 16 },
    { header: 'NAMA_BARANG', key: 'name', width: 38 },
    { header: 'GOLONGAN', key: 'group', width: 24 },
    { header: 'SATUAN', key: 'uom', width: 14 },
    { header: 'HPP', key: 'price', width: 18 },
    { header: 'COA_BIAYA', key: 'coa_code', width: 16 },
    { header: 'STATUS', key: 'status', width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const sampleRows = [
    {
      code: 'BRG-0001',
      prod_code: 'PRD-ATK-01',
      name: 'Kertas HVS A4 70 gr',
      group: 'Alat Tulis Kantor',
      uom: 'Rim',
      price: 48000,
      coa_code: '5.8.3',
      status: 'AKTIF',
    },
    {
      code: 'BRG-0002',
      prod_code: 'PRD-MED-02',
      name: 'Sarung Tangan Latex Medis M',
      group: 'Bahan Medis Habis Pakai',
      uom: 'Box',
      price: 65000,
      coa_code: '5.2.4',
      status: 'AKTIF',
    },
    {
      code: 'BRG-0003',
      prod_code: 'PRD-FAR-03',
      name: 'Alkohol Swab 70%',
      group: 'Farmasi & Medis',
      uom: 'Box',
      price: 25000,
      coa_code: '5.2.4',
      status: 'AKTIF',
    },
    {
      code: 'BRG-0004',
      prod_code: 'PRD-KOM-04',
      name: 'Tinta Printer Hitam GT53',
      group: 'Perlengkapan Komputer',
      uom: 'Botol',
      price: 95000,
      coa_code: '5.8.3',
      status: 'AKTIF',
    },
  ];

  sampleRows.forEach((r) => {
    const row = ws.addRow(r);
    row.getCell('price').numFmt = '#,##0';
    row.getCell('code').alignment = { horizontal: 'center' };
    row.getCell('prod_code').alignment = { horizontal: 'center' };
    row.getCell('uom').alignment = { horizontal: 'center' };
    row.getCell('coa_code').alignment = { horizontal: 'center' };
    row.getCell('status').alignment = { horizontal: 'center' };
  });

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: 'Template_Import_Barang.xlsx',
  };
}

/**
 * 2. Template Master COA & Kategori 3-Sheet (.xlsx)
 * Sesuai dengan parser masterImportService.importCoas:
 * Sheet 1: MASTER_COA -> Kolom: KODE_COA, NAMA_COA, KATEGORI
 * Sheet 2: KATEGORI_BIAYA -> Kolom: KODE_KELOMPOK, NAMA_KELOMPOK
 * Sheet 3: KATEGORI_INVESTASI -> Kolom: NAMA_KATEGORI, MASA_MANFAAT_BULAN, KODE_COA_PENYUSUTAN
 */
async function generateCoasTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem RKAP';
  workbook.created = new Date();

  // --- SHEET 1: MASTER_COA ---
  const wsCoa = workbook.addWorksheet('MASTER_COA', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsCoa.columns = [
    { header: 'KODE_COA', key: 'code', width: 20 },
    { header: 'NAMA_COA', key: 'name', width: 45 },
    { header: 'KATEGORI', key: 'category', width: 18 },
  ];
  const h1 = wsCoa.getRow(1);
  h1.height = 26;
  h1.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const sampleCoas = [
    { code: '5.8.3', name: 'Biaya Cetak & Fotocopy', category: 'biaya' },
    { code: '5.2.4', name: 'Biaya Suku Cadang Medis', category: 'biaya' },
    { code: '5.4.1', name: 'Biaya Penyusutan Gedung & Bangunan', category: 'biaya' },
    { code: '5.4.2', name: 'Biaya Penyusutan Peralatan Medis', category: 'biaya' },
    { code: '5.4.3', name: 'Biaya Penyusutan Peralatan Non Medis', category: 'biaya' },
    { code: '1.2.1.1.3', name: 'Aset Tetap Peralatan Non Medis & IT', category: 'investasi' },
    { code: '1.2.1.1.4', name: 'Aset Tetap Peralatan Medis', category: 'investasi' },
    { code: '1.2.1.1.5', name: 'Aset Tetap Kendaraan Operasional', category: 'investasi' },
  ];
  sampleCoas.forEach((c) => {
    const row = wsCoa.addRow(c);
    row.getCell('code').alignment = { horizontal: 'center' };
    row.getCell('category').alignment = { horizontal: 'center' };
  });

  // --- SHEET 2: KATEGORI_BIAYA (Jenis Barang / Kelompok) ---
  const wsGroup = workbook.addWorksheet('KATEGORI_BIAYA', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsGroup.columns = [
    { header: 'KODE_KELOMPOK', key: 'code', width: 20 },
    { header: 'NAMA_KELOMPOK', key: 'name', width: 45 },
  ];
  const h2 = wsGroup.getRow(1);
  h2.height = 26;
  h2.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const sampleGroups = [
    { code: '5.1', name: 'Biaya Pegawai & SDM' },
    { code: '5.2', name: 'Biaya Operasional Medis' },
    { code: '5.4', name: 'Biaya Penyusutan & Amortisasi' },
    { code: '5.8', name: 'Biaya Administrasi & Umum' },
    { code: '5.9', name: 'Biaya Pemeliharaan Sarana' },
  ];
  sampleGroups.forEach((g) => {
    const row = wsGroup.addRow(g);
    row.getCell('code').alignment = { horizontal: 'center' };
  });

  // --- SHEET 3: KATEGORI_INVESTASI (Jenis Susut / Belanja Modal) ---
  const wsInv = workbook.addWorksheet('KATEGORI_INVESTASI', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  wsInv.columns = [
    { header: 'NAMA_KATEGORI', key: 'name', width: 32 },
    { header: 'MASA_MANFAAT_BULAN', key: 'months', width: 24 },
    { header: 'KODE_COA_PENYUSUTAN', key: 'depr_coa', width: 26 },
  ];
  const h3 = wsInv.getRow(1);
  h3.height = 26;
  h3.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const sampleInvs = [
    { name: 'PC & Laptop', months: 48, depr_coa: '5.4.3' },
    { name: 'Peralatan Medis', months: 60, depr_coa: '5.4.2' },
    { name: 'Peralatan Non Medis', months: 48, depr_coa: '5.4.3' },
    { name: 'Kendaraan Operasional', months: 96, depr_coa: '5.4.1' },
    { name: 'Gedung & Bangunan', months: 240, depr_coa: '5.4.1' },
  ];
  sampleInvs.forEach((i) => {
    const row = wsInv.addRow(i);
    row.getCell('months').alignment = { horizontal: 'center' };
    row.getCell('months').numFmt = '#,##0';
    row.getCell('depr_coa').alignment = { horizontal: 'center' };
  });

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: 'Template_Import_COA_dan_Kategori.xlsx',
  };
}

/**
 * 3. Template Master Unit Organisasi (.xlsx)
 * Sesuai dengan parser unitImportService.importMasterUnits:
 * Sheet: Master_Unit
 * Kolom: Perusahaan, Kode, Nama Unit, Kelompok Utama, Subkelompok, Nama di Lembar RKAP, COA Pendapatan, Nama Pendapatan, Catatan
 */
async function generateUnitsTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem RKAP';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Master_Unit', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'Perusahaan', key: 'company', width: 14 },
    { header: 'Kode', key: 'code', width: 14 },
    { header: 'Nama Unit', key: 'name', width: 34 },
    { header: 'Kelompok Utama', key: 'main_group', width: 24 },
    { header: 'Subkelompok', key: 'sub_group', width: 20 },
    { header: 'Nama di Lembar RKAP', key: 'sheet_name', width: 26 },
    { header: 'COA Pendapatan', key: 'revenue_coa', width: 18 },
    { header: 'Nama Pendapatan', key: 'revenue_name', width: 30 },
    { header: 'Catatan', key: 'notes', width: 30 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const sampleUnits = [
    {
      company: 'CN',
      code: '9220',
      name: 'Medical Check Up (MCU)',
      main_group: 'Pelayanan Medis',
      sub_group: 'Rawat Jalan',
      sheet_name: 'MCU',
      revenue_coa: '4.1.1',
      revenue_name: 'Pendapatan Poli MCU',
      notes: 'Unit operasional aktif',
    },
    {
      company: 'CN',
      code: '9712',
      name: 'Klinik Gigi PPS',
      main_group: 'Pelayanan Medis',
      sub_group: 'Rawat Jalan',
      sheet_name: 'Klinik Gigi',
      revenue_coa: '4.1.2',
      revenue_name: 'Pendapatan Poli Gigi',
      notes: 'Unit pelayanan klinik',
    },
    {
      company: 'CN',
      code: '9805',
      name: 'Depo Obat Farmasi',
      main_group: 'Penunjang Medis',
      sub_group: 'Farmasi',
      sheet_name: 'Depo Obat',
      revenue_coa: '4.1.7',
      revenue_name: 'Pendapatan Farmasi',
      notes: 'Unit penunjang medis',
    },
    {
      company: 'CNH',
      code: '8145',
      name: 'Penagihan & Keuangan',
      main_group: 'Administrasi & Umum',
      sub_group: 'Keuangan',
      sheet_name: 'Penagihan',
      revenue_coa: '',
      revenue_name: '',
      notes: 'Unit non-pendapatan',
    },
  ];

  sampleUnits.forEach((u) => {
    const row = ws.addRow(u);
    row.getCell('company').alignment = { horizontal: 'center' };
    row.getCell('code').alignment = { horizontal: 'center' };
    row.getCell('revenue_coa').alignment = { horizontal: 'center' };
  });

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: 'Template_Import_Unit.xlsx',
  };
}

/**
 * Dispatcher Generator Template
 */
async function generateMasterTemplate(type) {
  const normType = String(type || '').trim().toLowerCase();

  switch (normType) {
    case 'items':
    case 'barang':
      return await generateItemsTemplate();
    case 'coas':
    case 'coa':
      return await generateCoasTemplate();
    case 'units':
    case 'unit':
      return await generateUnitsTemplate();
    default: {
      const error = new Error(
        `Jenis template '${type}' tidak valid. Pilihan yang tersedia: items, coas, units.`
      );
      error.status = 400;
      error.code = 'INVALID_TEMPLATE_TYPE';
      throw error;
    }
  }
}

module.exports = {
  generateMasterTemplate,
};
