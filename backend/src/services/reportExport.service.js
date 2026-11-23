const ExcelJS = require('exceljs');
const reportService = require('./report.service');
const dashboardService = require('./dashboard.service');
const expenseLineRepository = require('../repositories/expenseLine.repository');
const investmentLineRepository = require('../repositories/investmentLine.repository');

/**
 * Service Ekspor Laporan Excel (.xlsx) (Fase 7)
 * Menggunakan ExcelJS untuk menghasilkan lembar kerja dengan tata letak profesional.
 */

// Helper styling header tabel
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

const BOLD_FONT = {
  name: 'Calibri',
  size: 11,
  bold: true,
};

const SUBTOTAL_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF0EBE2' }, // Soft beige background
};

/**
 * Auto-fit lebar kolom
 */
function autoFitColumns(worksheet, minWidth = 12) {
  worksheet.columns.forEach((column) => {
    let maxLength = minWidth;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : '';
      if (valStr.length > maxLength) {
        maxLength = Math.min(valStr.length + 3, 50);
      }
    });
    column.width = maxLength;
  });
}

/**
 * 1. Export: Laporan Biaya per COA
 */
async function exportExpenseByCoa(query, user) {
  const data = await reportService.getExpenseByCoa(query, user);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Biaya per COA');

  ws.addRow(['LAPORAN ANGGARAN BIAYA PER COA']);
  ws.addRow([`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`]);
  ws.addRow([]);

  const headerRow = ws.addRow(['No.', 'Kode COA', 'Nama Akun COA', 'Jenis COA', 'Jumlah Baris', 'Total Anggaran (Rp)']);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let totalAmount = 0;
  data.forEach((r, idx) => {
    const amt = Number(r.amount) || 0;
    totalAmount += amt;
    const row = ws.addRow([
      idx + 1,
      r.coa_code,
      r.coa_name,
      r.group_name || '—',
      r.line_count,
      amt,
    ]);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).numFmt = '#,##0';
  });

  const totalRow = ws.addRow(['', '', 'TOTAL BIAYA', '', '', totalAmount]);
  totalRow.eachCell((cell) => {
    cell.font = BOLD_FONT;
    cell.fill = SUBTOTAL_FILL;
  });
  totalRow.getCell(6).numFmt = '#,##0';

  autoFitColumns(ws);

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Laporan_Biaya_per_COA_${Date.now()}.xlsx`,
  };
}

/**
 * 2. Export: Laporan Investasi (Investment Summary)
 */
async function exportInvestmentSummary(query, user) {
  const data = await reportService.getInvestmentSummary(query, user);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Rekap Investasi');

  const groupBy = (query.group_by || 'type').toLowerCase();
  const groupLabel = groupBy === 'priority' ? 'Prioritas' : groupBy === 'month' ? 'Bulan Rencana' : 'Kategori Investasi';

  ws.addRow(['LAPORAN REKAPITULASI ANGGARAN INVESTASI (CAPEX)']);
  ws.addRow([`Dikelompokkan berdasarkan: ${groupLabel}`]);
  ws.addRow([]);

  const headerRow = ws.addRow(['No.', groupLabel, 'Jumlah Item', 'Total Investasi (Rp)', 'Total Beban Susut (Rp)']);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let sumInvest = 0;
  let sumDepr = 0;

  data.forEach((r, idx) => {
    const label = r.category_name || r.priority_name || `Bulan ${r.month}`;
    const amt = Number(r.amount) || 0;
    const depr = Number(r.depreciation_amount) || 0;
    sumInvest += amt;
    sumDepr += depr;

    const row = ws.addRow([idx + 1, label, r.count, amt, depr]);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '#,##0';
  });

  const totalRow = ws.addRow(['', 'TOTAL KESELURUHAN', '', sumInvest, sumDepr]);
  totalRow.eachCell((cell) => {
    cell.font = BOLD_FONT;
    cell.fill = SUBTOTAL_FILL;
  });
  totalRow.getCell(4).numFmt = '#,##0';
  totalRow.getCell(5).numFmt = '#,##0';

  autoFitColumns(ws);

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Rekap_Investasi_${groupBy}_${Date.now()}.xlsx`,
  };
}

/**
 * 3. Export: Laporan Rekap Gabungan CN dan CNH (Consolidated Report)
 */
async function exportConsolidated(query, user) {
  const data = await reportService.getConsolidated(query, user);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Rekap Gabungan');

  ws.addRow([`REKAPITULASI GABUNGAN RKAP DAN REALISASI TAHUN ${data.period_year}`]);
  ws.addRow([`Perusahaan: PT Cipta Nirmala & Cipta Nirmala Husada`]);
  ws.addRow([]);

  const headerRow = ws.addRow([
    'Perusahaan',
    'Kode Unit',
    'Nama Unit Kerja',
    'Jenis',
    'Kode Akun',
    'Uraian Biaya / Kategori Investasi',
    'RKAP (Rp)',
    'Realisasi (Rp)',
    'Pemakaian (%)',
  ]);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  data.companies.forEach((comp) => {
    comp.units.forEach((u) => {
      u.lines.forEach((l) => {
        const row = ws.addRow([
          comp.company_code,
          u.code,
          u.name,
          l.kind,
          l.coa_code,
          l.name,
          l.rkap !== null ? Number(l.rkap) : null,
          l.realisasi !== null ? Number(l.realisasi) : null,
          l.usage_percent !== null ? `${l.usage_percent}%` : '—',
        ]);
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(7).numFmt = '#,##0';
        row.getCell(8).numFmt = '#,##0';
        row.getCell(9).alignment = { horizontal: 'right' };
      });

      // Subtotal Unit
      const uSub = ws.addRow([
        comp.company_code,
        u.code,
        `Subtotal Unit ${u.name}`,
        '',
        '',
        '',
        u.subtotal?.rkap !== null ? Number(u.subtotal?.rkap) : null,
        u.subtotal?.realisasi !== null ? Number(u.subtotal?.realisasi) : null,
        '',
      ]);
      uSub.eachCell((c) => {
        c.font = BOLD_FONT;
      });
      uSub.getCell(7).numFmt = '#,##0';
      uSub.getCell(8).numFmt = '#,##0';
    });

    // Subtotal Perusahaan
    const cSub = ws.addRow([
      comp.company_code,
      '',
      `SUBTOTAL ${comp.company_name}`,
      '',
      '',
      '',
      comp.subtotal?.rkap !== null ? Number(comp.subtotal?.rkap) : null,
      comp.subtotal?.realisasi !== null ? Number(comp.subtotal?.realisasi) : null,
      '',
    ]);
    cSub.eachCell((c) => {
      c.font = BOLD_FONT;
      c.fill = SUBTOTAL_FILL;
    });
    cSub.getCell(7).numFmt = '#,##0';
    cSub.getCell(8).numFmt = '#,##0';
  });

  // Grand Total
  const gtRow = ws.addRow([
    'TOTAL',
    '',
    'GRAND TOTAL GABUNGAN (CN & CNH)',
    '',
    '',
    '',
    data.grand_total?.rkap !== null ? Number(data.grand_total?.rkap) : null,
    data.grand_total?.realisasi !== null ? Number(data.grand_total?.realisasi) : null,
    '',
  ]);
  gtRow.eachCell((c) => {
    c.font = BOLD_FONT;
    c.fill = SUBTOTAL_FILL;
  });
  gtRow.getCell(7).numFmt = '#,##0';
  gtRow.getCell(8).numFmt = '#,##0';

  autoFitColumns(ws);

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Rekap_Konsolidasi_RKAP_${data.period_year}_${Date.now()}.xlsx`,
  };
}

/**
 * 4. Export: Matriks Unit x COA (Format ERP)
 */
async function exportMatrix(query, user) {
  const data = await reportService.getMatrix(query, user);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Matriks Biaya ERP');

  // Baris Judul
  ws.addRow([`MATRIKS ANGGARAN BIAYA RKAP UNIT X COA (FORMAT TEMPLATE ERP)`]);
  ws.addRow([`Tahun: ${query.period_year || 2027}`]);
  ws.addRow([]);

  // Kumpulkan seluruh kolom COA
  const coaHeaders = [];
  data.columns.forEach((group) => {
    group.coas.forEach((c) => {
      coaHeaders.push({
        code: c.code,
        label: `${c.code}\n${c.name}`,
        group: group.group,
      });
    });
  });

  // Baris Header Kelompok Biaya (Header Level 1)
  const groupRowValues = ['Company', 'Kode Unit', 'Nama Unit', 'Instalasi / Kelompok', 'Klasifikasi'];
  data.columns.forEach((group) => {
    group.coas.forEach(() => {
      groupRowValues.push(group.group);
    });
    groupRowValues.push(`TOTAL ${group.group}`);
  });
  groupRowValues.push('GRAND TOTAL UNIT');

  const rowGroup = ws.addRow(groupRowValues);
  rowGroup.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Baris Header Kode COA (Header Level 2)
  const coaRowValues = ['Company', 'Kode Unit', 'Nama Unit', 'Instalasi / Kelompok', 'Klasifikasi'];
  data.columns.forEach((group) => {
    group.coas.forEach((c) => {
      coaRowValues.push(`${c.code} - ${c.name}`);
    });
    coaRowValues.push(`SUBTOTAL`);
  });
  coaRowValues.push('TOTAL (RP)');

  const rowCoa = ws.addRow(coaRowValues);
  rowCoa.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Baris Data Unit
  data.companies.forEach((comp) => {
    comp.instalasi.forEach((inst) => {
      inst.units.forEach((u) => {
        const rowVals = [comp.code, u.code, u.name, inst.name, u.classification || '—'];

        data.columns.forEach((group) => {
          group.coas.forEach((c) => {
            rowVals.push(u.values[c.code] !== undefined ? Number(u.values[c.code]) : null);
          });
          rowVals.push(u.group_totals[group.group] !== undefined ? Number(u.group_totals[group.group]) : null);
        });
        rowVals.push(u.total);

        const r = ws.addRow(rowVals);
        r.getCell(1).alignment = { horizontal: 'center' };
        r.getCell(2).alignment = { horizontal: 'center' };
        for (let colIdx = 6; colIdx <= rowVals.length; colIdx++) {
          r.getCell(colIdx).numFmt = '#,##0';
        }
      });

      // Subtotal Instalasi
      const instRowVals = [comp.code, '', `SUBTOTAL ${inst.name}`, inst.name, ''];
      data.columns.forEach((group) => {
        group.coas.forEach((c) => {
          instRowVals.push(inst.subtotal?.values?.[c.code] !== undefined ? Number(inst.subtotal.values[c.code]) : null);
        });
        instRowVals.push(inst.subtotal?.group_totals?.[group.group] !== undefined ? Number(inst.subtotal.group_totals[group.group]) : null);
      });
      instRowVals.push(inst.subtotal?.total || 0);

      const ir = ws.addRow(instRowVals);
      ir.eachCell((c) => {
        c.font = BOLD_FONT;
      });
      for (let colIdx = 6; colIdx <= instRowVals.length; colIdx++) {
        ir.getCell(colIdx).numFmt = '#,##0';
      }
    });

    // Subtotal Perusahaan
    const compRowVals = [comp.code, '', `TOTAL PERUSAHAAN ${comp.name}`, '', ''];
    data.columns.forEach((group) => {
      group.coas.forEach((c) => {
        compRowVals.push(comp.subtotal?.values?.[c.code] !== undefined ? Number(comp.subtotal.values[c.code]) : null);
      });
      compRowVals.push(comp.subtotal?.group_totals?.[group.group] !== undefined ? Number(comp.subtotal.group_totals[group.group]) : null);
    });
    compRowVals.push(comp.subtotal?.total || 0);

    const cr = ws.addRow(compRowVals);
    cr.eachCell((c) => {
      c.font = BOLD_FONT;
      c.fill = SUBTOTAL_FILL;
    });
    for (let colIdx = 6; colIdx <= compRowVals.length; colIdx++) {
      cr.getCell(colIdx).numFmt = '#,##0';
    }
  });

  // Grand Total Gabungan
  const gtRowVals = ['TOTAL', '', 'GRAND TOTAL GABUNGAN', '', ''];
  data.columns.forEach((group) => {
    group.coas.forEach((c) => {
      gtRowVals.push(data.grand_total?.values?.[c.code] !== undefined ? Number(data.grand_total.values[c.code]) : null);
    });
    gtRowVals.push(data.grand_total?.group_totals?.[group.group] !== undefined ? Number(data.grand_total.group_totals[group.group]) : null);
  });
  gtRowVals.push(data.grand_total?.total || 0);

  const gtr = ws.addRow(gtRowVals);
  gtr.eachCell((c) => {
    c.font = BOLD_FONT;
    c.fill = SUBTOTAL_FILL;
  });
  for (let colIdx = 6; colIdx <= gtRowVals.length; colIdx++) {
    gtr.getCell(colIdx).numFmt = '#,##0';
  }

  autoFitColumns(ws);

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Matriks_Unit_x_COA_${query.period_year || 2027}_${Date.now()}.xlsx`,
  };
}

/**
 * 5. Export: Budget vs Realization
 */
async function exportBudgetVsRealization(query, user) {
  const data = await dashboardService.getBudgetVsRealization(query, user);

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('RKAP vs Realisasi');

  const groupBy = (query.group_by || 'coa').toLowerCase();
  const groupLabel = groupBy === 'unit' ? 'Unit Kerja' : groupBy === 'item' ? 'Barang Logistik' : 'Akun COA';

  ws.addRow(['PERBANDINGAN RKAP VS REALISASI BUKU BESAR']);
  ws.addRow([`Grup: ${groupLabel}`]);
  ws.addRow([]);

  const headerRow = ws.addRow([
    'No.',
    'Kode',
    'Nama',
    'RKAP (Rp)',
    'Realisasi (Rp)',
    'Pemakaian (%)',
    'Status Ambang',
  ]);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  let sumRkap = 0;
  let sumReal = 0;

  data.forEach((r, idx) => {
    const code = r.coa_code || r.unit_code || r.item_code || '—';
    const name = r.coa_name || r.unit_name || r.item_name || '—';
    const rkapVal = r.rkap !== null ? Number(r.rkap) : null;
    const realVal = r.realisasi !== null ? Number(r.realisasi) : null;

    if (rkapVal !== null) sumRkap += rkapVal;
    if (realVal !== null) sumReal += realVal;

    const row = ws.addRow([
      idx + 1,
      code,
      name,
      rkapVal,
      realVal,
      r.usage_percent !== null ? `${r.usage_percent}%` : '—',
      r.level ? r.level.toUpperCase() : '—',
    ]);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).alignment = { horizontal: 'right' };
    row.getCell(7).alignment = { horizontal: 'center' };
  });

  const totalRow = ws.addRow([
    '',
    '',
    'TOTAL KESELURUHAN',
    sumRkap,
    sumReal,
    sumRkap > 0 ? `${Math.round((sumReal / sumRkap) * 100)}%` : '—',
    '',
  ]);
  totalRow.eachCell((cell) => {
    cell.font = BOLD_FONT;
    cell.fill = SUBTOTAL_FILL;
  });
  totalRow.getCell(4).numFmt = '#,##0';
  totalRow.getCell(5).numFmt = '#,##0';
  totalRow.getCell(6).alignment = { horizontal: 'right' };

  autoFitColumns(ws);

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Budget_vs_Realization_${groupBy}_${Date.now()}.xlsx`,
  };
}

/**
 * 6. Export: Display Anggaran Biaya (Fase 3d)
 */
async function exportDisplayBiaya(query, user) {
  const exportQuery = {
    ...query,
    page: 1,
    per_page: 100000,
  };
  const result = await expenseLineRepository.findAllCrossUnit(exportQuery, user);
  const data = result.data || [];
  const totals = result.totals || { total_rkap: 0, total_realization: 0, total_units: 0, total_lines: 0 };

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Display Anggaran Biaya');

  ws.addRow(['DISPLAY ANGGARAN BIAYA RKAP']);
  ws.addRow([`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`]);
  ws.addRow([]);

  const headerRow = ws.addRow([
    'No.',
    'Kode Unit',
    'Nama Unit',
    'Status Dokumen',
    'Kode Barang',
    'Nama Barang',
    'Satuan',
    'Harga Satuan (Rp)',
    'Volume / Qty',
    'Jumlah RKAP (Rp)',
    'Realisasi (Rp)',
    'Pemakaian (%)',
    'Kode COA',
    'Nama COA',
    'Catatan',
  ]);

  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  data.forEach((r, idx) => {
    const row = ws.addRow([
      idx + 1,
      r.unit?.code || '—',
      r.unit?.name || '—',
      r.doc_status || '—',
      r.item?.code || '—',
      r.item?.name || '—',
      r.uom || '—',
      r.price != null ? Number(r.price) : 0,
      r.qty != null ? Number(r.qty) : 0,
      r.amount != null ? Number(r.amount) : 0,
      r.realization != null ? Number(r.realization) : null,
      r.realization_percentage != null ? `${r.realization_percentage}%` : '—',
      r.coa?.code || '—',
      r.coa?.name || '—',
      r.note || '',
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).numFmt = '#,##0';
    if (r.realization != null) {
      row.getCell(11).numFmt = '#,##0';
    } else {
      row.getCell(11).alignment = { horizontal: 'center' };
    }
    row.getCell(12).alignment = { horizontal: 'right' };
    row.getCell(13).alignment = { horizontal: 'center' };
  });

  const totalRow = ws.addRow([
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL',
    '',
    '',
    Number(totals.total_rkap) || 0,
    totals.total_realization != null && totals.total_realization > 0 ? Number(totals.total_realization) : 0,
    totals.total_rkap > 0 && totals.total_realization > 0
      ? `${Math.round((Number(totals.total_realization) / Number(totals.total_rkap)) * 100)}%`
      : '—',
    '',
    '',
    '',
  ]);

  totalRow.eachCell((cell) => {
    cell.font = BOLD_FONT;
    cell.fill = SUBTOTAL_FILL;
  });
  totalRow.getCell(7).alignment = { horizontal: 'center' };
  totalRow.getCell(10).numFmt = '#,##0';
  totalRow.getCell(11).numFmt = '#,##0';
  totalRow.getCell(12).alignment = { horizontal: 'right' };

  autoFitColumns(ws);

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Display_Anggaran_Biaya_${Date.now()}.xlsx`,
  };
}

/**
 * 7. Export: Display Anggaran Investasi (Fase 3d)
 */
async function exportDisplayInvestasi(query, user) {
  const exportQuery = {
    ...query,
    page: 1,
    per_page: 100000,
  };
  const result = await investmentLineRepository.findAllCrossUnit(exportQuery, user);
  const data = result.data || [];
  const totals = result.totals || { total_amount: 0, total_depreciation: 0, total_units: 0, total_lines: 0 };

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Display Anggaran Investasi');

  ws.addRow(['DISPLAY ANGGARAN INVESTASI RKAP']);
  ws.addRow([`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`]);
  ws.addRow([]);

  const headerRow = ws.addRow([
    'No.',
    'Kode Unit',
    'Nama Unit',
    'Status Dokumen',
    'Nama Barang / Investasi',
    'Kategori',
    'Kode COA',
    'Nama COA',
    'Prioritas',
    'Bulan Rencana',
    'Volume / Qty',
    'Harga Satuan (Rp)',
    'Total Investasi (Rp)',
    'Masa Manfaat (Bln)',
    'Beban Penyusutan (Rp)',
    'Sasaran Strategis',
    'Indikator Kinerja',
    'Program Kerja',
    'Aksi Strategis',
    'Catatan',
  ]);

  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  data.forEach((r, idx) => {
    const row = ws.addRow([
      idx + 1,
      r.unit?.code || r.unit_code || '—',
      r.unit?.name || r.unit_name || '—',
      r.doc_status || '—',
      r.name || '—',
      r.category?.name || r.category_name || '—',
      r.coa?.code || r.coa_code || '—',
      r.coa?.name || r.coa_name || '—',
      r.priority?.name || r.priority_name || '—',
      r.plan_month != null ? `Bulan ${r.plan_month}` : '—',
      r.qty != null ? Number(r.qty) : 0,
      r.price != null ? Number(r.price) : 0,
      r.amount != null ? Number(r.amount) : 0,
      r.useful_life_months != null ? `${r.useful_life_months} Bulan` : '—',
      r.depreciation_amount != null ? Number(r.depreciation_amount) : 0,
      r.strategic_objective || '',
      r.kpi || '',
      r.work_program || '',
      r.strategic_action || '',
      r.note || '',
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(10).alignment = { horizontal: 'center' };
    row.getCell(11).numFmt = '#,##0';
    row.getCell(12).numFmt = '#,##0';
    row.getCell(13).numFmt = '#,##0';
    row.getCell(14).alignment = { horizontal: 'center' };
    row.getCell(15).numFmt = '#,##0';
  });

  const totalRow = ws.addRow([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL',
    '',
    '',
    Number(totals.total_amount) || 0,
    '',
    Number(totals.total_depreciation) || 0,
    '',
    '',
    '',
    '',
    '',
  ]);

  totalRow.eachCell((cell) => {
    cell.font = BOLD_FONT;
    cell.fill = SUBTOTAL_FILL;
  });
  totalRow.getCell(10).alignment = { horizontal: 'center' };
  totalRow.getCell(13).numFmt = '#,##0';
  totalRow.getCell(15).numFmt = '#,##0';

  autoFitColumns(ws);

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `Display_Anggaran_Investasi_${Date.now()}.xlsx`,
  };
}

/**
 * Main Dispatcher Export
 */
async function generateReportExport(query, user) {
  const reportType = (query.report || '').toLowerCase();
  const format = (query.format || 'xlsx').toLowerCase();

  if (format === 'pdf') {
    const error = new Error('Ekspor PDF ditunda dan belum diaktifkan pada Fase 7. Silakan gunakan format xlsx.');
    error.status = 422;
    error.code = 'PDF_EXPORT_DEFERRED';
    throw error;
  }

  if (format !== 'xlsx') {
    const error = new Error(`Format ekspor '${format}' tidak didukung. Format yang didukung: xlsx.`);
    error.status = 400;
    error.code = 'UNSUPPORTED_EXPORT_FORMAT';
    throw error;
  }

  switch (reportType) {
    case 'expense-by-coa':
      return await exportExpenseByCoa(query, user);
    case 'investment-summary':
      return await exportInvestmentSummary(query, user);
    case 'consolidated':
      return await exportConsolidated(query, user);
    case 'matrix':
      return await exportMatrix(query, user);
    case 'budget-vs-realization':
      return await exportBudgetVsRealization(query, user);
    case 'display-biaya':
      return await exportDisplayBiaya(query, user);
    case 'display-investasi':
      return await exportDisplayInvestasi(query, user);
    default: {
      const error = new Error(
        `Jenis laporan '${query.report}' tidak valid. Pilihan: expense-by-coa, investment-summary, consolidated, matrix, budget-vs-realization, display-biaya, display-investasi.`
      );
      error.status = 400;
      error.code = 'INVALID_REPORT_TYPE';
      throw error;
    }
  }
}

module.exports = {
  generateReportExport,
};
