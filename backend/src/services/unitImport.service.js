const ExcelJS = require('exceljs');
const db = require('../../db');
const unitRepository = require('../repositories/unit.repository');
const coaRepository = require('../repositories/coa.repository');
const importLogRepository = require('../repositories/importLog.repository');
const AuditService = require('./audit.service');

/**
 * Service untuk memproses import draf Master Unit dari berkas Excel
 * Mengikuti spesifikasi sheet Petunjuk pada Master_Unit_DRAFT.xlsx
 */
const importMasterUnits = async (fileBuffer, filename, dryRun = false, user = null) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet =
    workbook.getWorksheet('Master_Unit') ||
    workbook.worksheets.find(
      (w) => w.name.toLowerCase().includes('master_unit') || w.name.toLowerCase().includes('unit')
    );

  if (!worksheet) {
    throw new Error("Sheet 'Master_Unit' tidak ditemukan pada berkas Excel.");
  }

  // Petakan indeks header dari baris 1
  const headerRow = worksheet.getRow(1);
  const colMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const headerText = String(cell.value || '')
      .trim()
      .toLowerCase();
    colMap[headerText] = colNumber;
  });

  // Helper pencari nomor kolom berdasarkan kata kunci
  const findCol = (keywords) => {
    for (const [key, idx] of Object.entries(colMap)) {
      if (keywords.some((kw) => key.includes(kw.toLowerCase()))) {
        return idx;
      }
    }
    return null;
  };

  const colPerusahaan = findCol(['perusahaan']) || 2;
  const colKodeAwal = findCol(['kode']) || 3;
  const colNamaMenu = findCol(['nama unit (di menu)', 'nama unit']) || 4;
  const colKelompokMenu = findCol(['kelompok utama (menu)', 'kelompok utama']) || 5;
  const colSubkelompok = findCol(['subkelompok']) || 6;
  const colNamaLembar = findCol(['nama di lembar rkap']) || 8;
  const colKlasifikasiTemplate = findCol(['klasifikasi di template']) || 9;
  const colKlasifikasiUsulan = findCol(['klasifikasi (usulan)', 'usulan']) || 10;
  const colCoaPendapatan = findCol(['coa pendapatan']) || 11;
  const colNamaPendapatan = findCol(['nama pendapatan']) || 12;
  const colIsu = findCol(['isu perlu dicek', 'isu']) || 15;
  const colKeputusan = findCol(['keputusan akuntansi', 'keputusan']) || 16;
  const colKodeFinal = findCol(['kode final']) || 17;
  const colNamaFinal = findCol(['nama final']) || 18;
  const colKelompokFinal = findCol(['kelompok final']) || 19;
  const colKlasifikasiFinal = findCol(['klasifikasi final']) || 20;
  const colCatatan = findCol(['catatan akuntansi', 'catatan']) || 21;
  const colUrutan = findCol(['urutan di menu', 'urutan']) || 22;
  const colIdDraf = findCol(['id draf', 'draf']) || 23;

  // Cache data pendukung COA untuk pencocokan pendapatan
  const coaRes = await coaRepository.findAll({ per_page: 5000 });
  const allCoas = coaRes.data || [];
  const coaCodeMap = new Map();
  allCoas.forEach((c) => coaCodeMap.set(String(c.code).trim(), c.id));

  // Cache existing units untuk perhitungan matched vs new
  const existingUnits = await unitRepository.findAll({});
  const existingSourceMap = new Map();
  const existingCodeMap = new Map();
  existingUnits.forEach((u) => {
    if (u.source_key) {
      existingSourceMap.set(`${u.company_id}_${u.source_key}`, u);
    }
    if (u.code) {
      existingCodeMap.set(`${u.company_id}_${u.code}`, u);
    }
  });

  const parsedRows = [];
  const rowWarnings = [];
  let totalRead = 0;
  let matchedExisting = 0;
  let newUnits = 0;
  let activeUnits = 0;
  let inactiveUnits = 0;
  let needsReviewCount = 0;
  let missingCode = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row || !row.hasValues) continue;

    const rawIdDraf = String(row.getCell(colIdDraf).value || '').trim();
    const rawPerusahaan = String(row.getCell(colPerusahaan).value || '').trim();
    const rawNamaMenu = String(row.getCell(colNamaMenu).value || '').trim();
    const rawNamaFinal = String(row.getCell(colNamaFinal).value || '').trim();
    const rawNamaLembar = String(row.getCell(colNamaLembar).value || '').trim();

    // Baris kosong atau baris judul tanpa ID draf diabaikan
    if (!rawIdDraf && !rawPerusahaan && !rawNamaMenu) continue;

    totalRead++;

    if (!rawIdDraf) {
      rowWarnings.push({
        row: rowNumber,
        source_key: '-',
        name: rawNamaMenu || rawNamaFinal,
        warning: 'Kolom ID Draf tidak ditemukan pada baris ini (dilewati)',
      });
      continue;
    }

    // Resolusi Perusahaan (CN = 1, CNH = 2)
    let companyId = 1;
    if (rawPerusahaan.toUpperCase().includes('CNH') || rawIdDraf.toUpperCase().startsWith('CNH-')) {
      companyId = 2;
    } else if (rawPerusahaan.toUpperCase().includes('CN') || rawIdDraf.toUpperCase().startsWith('CN-')) {
      companyId = 1;
    }

    // Resolusi Nama Unit
    let finalName = rawNamaFinal || rawNamaMenu || rawNamaLembar;
    if (!finalName) {
      rowWarnings.push({
        row: rowNumber,
        source_key: rawIdDraf,
        name: '-',
        warning: 'Nama unit tidak ditemukan pada baris ini (dilewati)',
      });
      continue;
    }

    // Resolusi Kode Unit
    const rawKodeFinal = String(row.getCell(colKodeFinal).value || '').trim();
    const rawKodeAwal = String(row.getCell(colKodeAwal).value || '').trim();
    let finalCode = null;
    if (rawKodeFinal && rawKodeFinal !== '-' && rawKodeFinal.toLowerCase() !== 'null') {
      finalCode = rawKodeFinal;
    } else if (rawKodeAwal && rawKodeAwal !== '-' && rawKodeAwal.toLowerCase() !== 'null') {
      finalCode = rawKodeAwal;
    }

    if (!finalCode) {
      missingCode++;
    }

    // Resolusi Kelompok Organisasi (org_groups)
    const rawKelompokFinal = String(row.getCell(colKelompokFinal).value || '').trim();
    const rawKelompokMenu = String(row.getCell(colKelompokMenu).value || '').trim();
    const rawSubkelompok = String(row.getCell(colSubkelompok).value || '').trim();
    const finalGroupName = rawKelompokFinal || rawKelompokMenu || 'Umum';

    // Resolusi Klasifikasi
    const rawKlasifikasiFinal = String(row.getCell(colKlasifikasiFinal).value || '').trim();
    const rawKlasifikasiUsulan = String(row.getCell(colKlasifikasiUsulan).value || '').trim();
    const rawKlasifikasiTemplate = String(row.getCell(colKlasifikasiTemplate).value || '').trim();
    let finalClassification =
      rawKlasifikasiFinal || rawKlasifikasiUsulan || rawKlasifikasiTemplate || null;
    if (
      finalClassification &&
      (finalClassification.toLowerCase().includes('perlu diisi') ||
        finalClassification.toLowerCase() === 'n/a')
    ) {
      finalClassification = null;
    }

    // Resolusi COA Pendapatan
    const rawCoaPendapatan = String(row.getCell(colCoaPendapatan).value || '').trim();
    const rawNamaPendapatan = String(row.getCell(colNamaPendapatan).value || '').trim();
    let revenueCoaId = null;
    if (rawCoaPendapatan && coaCodeMap.has(rawCoaPendapatan)) {
      revenueCoaId = coaCodeMap.get(rawCoaPendapatan);
    }

    // Resolusi Keputusan Akuntansi & Status Aktif
    const rawKeputusan = String(row.getCell(colKeputusan).value || '').trim().toLowerCase();
    let isActive = true;
    if (rawKeputusan === 'hapus') {
      isActive = false;
      inactiveUnits++;
    } else {
      activeUnits++;
    }

    // Resolusi Isu / Perlu Review
    const rawIsu = String(row.getCell(colIsu).value || '').trim();
    const rawCatatan = String(row.getCell(colCatatan).value || '').trim();

    let needsReview = false;
    const issueReasons = [];

    if (!finalCode) {
      needsReview = true;
      issueReasons.push('Tidak ada kode resmi');
    }
    if (rawKeputusan === 'gabung ke unit lain' || rawKeputusan.includes('gabung')) {
      needsReview = true;
      issueReasons.push('Keputusan: Gabung ke unit lain (perlu penanganan manual)');
    }
    if (rawIsu) {
      needsReview = true;
      issueReasons.push(rawIsu);
    }
    if (!finalClassification) {
      needsReview = true;
      issueReasons.push('Klasifikasi belum ditentukan');
    }

    if (needsReview) {
      needsReviewCount++;
      rowWarnings.push({
        row: rowNumber,
        source_key: rawIdDraf,
        code: finalCode || '(tanpa kode)',
        name: finalName,
        warning: issueReasons.join('; '),
      });
    }

    // Urutan di menu
    const rawUrutan = parseInt(row.getCell(colUrutan).value, 10);
    const orderNo = !isNaN(rawUrutan) ? rawUrutan : rowNumber - 1;

    // Catatan Akuntansi & Isu
    const combinedNotes = [rawCatatan, rawIsu ? `[Isu: ${rawIsu}]` : null]
      .filter(Boolean)
      .join(' | ');

    // Cek keberadaan di data lama (baik via source_key maupun via company_id + code)
    const isMatched =
      existingSourceMap.has(`${companyId}_${rawIdDraf}`) ||
      (finalCode && existingCodeMap.has(`${companyId}_${finalCode}`));

    if (isMatched) {
      matchedExisting++;
    } else {
      newUnits++;
    }

    parsedRows.push({
      company_id: companyId,
      source_key: rawIdDraf,
      code: finalCode,
      name: finalName,
      group_name: finalGroupName,
      sub_group_name: rawSubkelompok || null,
      classification: finalClassification,
      revenue_coa_id: revenueCoaId,
      revenue_coa_code: rawCoaPendapatan || null,
      revenue_coa_name: rawNamaPendapatan || null,
      needs_review: needsReview,
      review_notes: combinedNotes || null,
      order_no: orderNo,
      is_active: isActive,
    });
  }

  const summary = {
    total_read: totalRead,
    matched_existing: matchedExisting,
    new_units: newUnits,
    active_units: activeUnits,
    inactive_units: inactiveUnits,
    needs_review_count: needsReviewCount,
    missing_code: missingCode,
  };

  // Jika mode dry_run = true, selesaikan tanpa menyimpan ke database
  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      filename,
      summary,
      errors: rowWarnings,
      message: 'Simulasi import draf unit berhasil dilakukan. Tidak ada data yang diubah di database.',
    };
  }

  // Jika dry_run = false, jalankan penyimpanan transaksi ke database
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of parsedRows) {
      // 1. Dapatkan atau buat kelompok organisasi
      let groupId = null;
      if (item.group_name) {
        groupId = await unitRepository.findOrCreateOrgGroup(
          item.company_id,
          item.group_name,
          'instalasi',
          null,
          client
        );
      }

      // Jika ada subkelompok, buatkan org_group dengan parent_id = groupId
      if (item.sub_group_name && groupId) {
        groupId = await unitRepository.findOrCreateOrgGroup(
          item.company_id,
          item.sub_group_name,
          'instalasi',
          groupId,
          client
        );
      }

      // 2. Upsert unit berdasarkan company_id dan source_key (ID Draf)
      await unitRepository.upsertBySourceKey(
        {
          company_id: item.company_id,
          source_key: item.source_key,
          code: item.code,
          name: item.name,
          group_id: groupId,
          classification: item.classification,
          revenue_coa_id: item.revenue_coa_id,
          revenue_coa_code: item.revenue_coa_code,
          revenue_coa_name: item.revenue_coa_name,
          needs_review: item.needs_review,
          review_notes: item.review_notes,
          order_no: item.order_no,
          is_active: item.is_active,
        },
        client
      );
    }

    // Catat ke import_logs
    await importLogRepository.create(
      {
        type: 'UNITS',
        filename,
        total_read: totalRead,
        matched_existing: matchedExisting,
        new_items: newUnits,
        coa_changed: 0,
        hpp_zero: 0,
        missing_coa: missingCode,
        unknown_coa: needsReviewCount,
        raw_summary: summary,
        created_by: user ? user.id : null,
      },
      client
    );

    // Audit Trail
    if (user) {
      await AuditService.log(
        user.id,
        'units',
        null,
        'IMPORT_MASTER_UNITS',
        null,
        { filename, summary },
        client
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      dry_run: false,
      filename,
      summary,
      errors: rowWarnings,
      message: `Import master unit berhasil disimpan: ${newUnits} unit baru, ${matchedExisting} unit diperbarui.`,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  importMasterUnits,
};
