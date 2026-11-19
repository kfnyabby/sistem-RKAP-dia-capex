const fs = require('fs');
const ExcelJS = require('exceljs');
const db = require('../../db');

// Guard untuk bug internal ExcelJS WorkbookReader: pastikan this.model terinisialisasi
// sebelum _parseWorksheet mengakses this.model.sheets
const origParseWorksheet = ExcelJS.stream.xlsx.WorkbookReader.prototype._parseWorksheet;
if (origParseWorksheet) {
  ExcelJS.stream.xlsx.WorkbookReader.prototype._parseWorksheet = function* (iterator, sheetNo) {
    if (!this.model) {
      this.model = { sheets: [] };
    }
    yield* origParseWorksheet.call(this, iterator, sheetNo);
  };
}
const realizationBatchRepository = require('../repositories/realizationBatch.repository');
const journalLineRepository = require('../repositories/journalLine.repository');
const unitAliasRepository = require('../repositories/unitAlias.repository');
const realizationErrorRepository = require('../repositories/realizationError.repository');
const settingRepository = require('../repositories/setting.repository');
const AuditService = require('./audit.service');

// Daftar header wajib (dinormalisasi: tanpa spasi ganda, huruf besar)
const REQUIRED_HEADERS = [
  'TANGGAL',
  'ID SUB JURNAL',
  'IDGL',
  'KODE COA',
  'NAMA COA',
  'UNIT',
  'DEBET',
  'KREDIT',
  'KETERANGAN',
];

/**
 * Normalisasi nama header agar toleran terhadap spasi / underscore.
 */
function normalizeHeaderName(val) {
  if (!val) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Ekstraksi nilai sel Excel secara aman (menangani formula, text object, rich text, date).
 */
function getCellValue(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'object') {
    if (cell.text !== undefined) return cell.text;
    if (cell.result !== undefined) return cell.result;
    if (cell.richText && Array.isArray(cell.richText)) {
      return cell.richText.map((t) => t.text).join('');
    }
    if (cell instanceof Date) return cell;
  }
  return cell;
}

/**
 * Parser tanggal dari berbagai format (Date object, Excel serial number, string).
 * Mengembalikan string 'YYYY-MM-DD' atau null jika gagal.
 */
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
    return jsDate.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.slice(0, 10);
    }
    const parts = s.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return null;
}

/**
 * Parsing nilai angka untuk debet/kredit ke integer rupiah (bigint di DB).
 */
function parseAmount(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return Math.round(val);
  }
  if (typeof val === 'string') {
    // Bersihkan karakter non-numerik kecuali minus dan titik/koma desimal
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num);
  }
  return 0;
}

/**
 * Membaca header baris pertama untuk validasi kolom wajib secara cepat dan streaming.
 */
async function validateWorkbookHeader(filePath) {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    sharedStrings: 'cache',
    hyperlinks: 'ignore',
    styles: 'ignore',
  });

  let headerMap = null;
  let firstRowFound = false;

  for await (const worksheetReader of workbookReader) {
    for await (const row of worksheetReader) {
      if (!firstRowFound) {
        firstRowFound = true;
        const map = new Map();
        // row.values di ExcelJS adalah 1-based array
        const values = row.values;
        if (Array.isArray(values)) {
          for (let colIdx = 1; colIdx < values.length; colIdx++) {
            const rawHeader = getCellValue(values[colIdx]);
            const normalized = normalizeHeaderName(rawHeader);
            if (normalized) {
              map.set(normalized, colIdx);
            }
          }
        }
        headerMap = map;
        break; // Hanya baca baris header
      }
    }
    if (headerMap) break;
  }

  if (!headerMap || headerMap.size === 0) {
    const err = new Error('File Excel kosong atau tidak memiliki baris header.');
    err.status = 400;
    throw err;
  }

  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headerMap.has(h));
  if (missingHeaders.length > 0) {
    const err = new Error(
      `Kolom header wajib tidak ditemukan: ${missingHeaders.join(', ')}. ` +
        `Pastikan file memuat kolom: ${REQUIRED_HEADERS.join(', ')}.`
    );
    err.status = 400;
    throw err;
  }

  return headerMap;
}

/**
 * Inisialisasi batch import realisasi (memvalidasi file & header terlebih dahulu).
 */
async function createImportBatch({ companyId, fileName, filePath, mode, userId }) {
  // 1. Validasi header secara streaming sebelum menyimpan batch ke DB
  await validateWorkbookHeader(filePath);

  // 2. Buat record batch berstatus PROCESSING
  const batch = await realizationBatchRepository.createBatch({
    company_id: companyId,
    file_name: fileName,
    file_path: filePath,
    mode: mode || 'replace_month',
    uploaded_by: userId,
    status: 'PROCESSING',
    created_by: userId,
  });

  return batch;
}

/**
 * Menjalankan streaming parser penuh di latar belakang (atau secara sinkron saat di-await).
 */
async function processRealizationFile(batchId, filePath, _userId) {
  const startTime = Date.now();
  try {
    const batch = await realizationBatchRepository.findById(batchId);
    if (!batch) {
      throw new Error(`Batch ID ${batchId} tidak ditemukan.`);
    }

    const companyId = batch.company_id;

    // 1. Ambil setting investment_asset_coas dari tabel settings
    const assetCoasSetting = await settingRepository.getSetting(
      'investment_asset_coas',
      ['1.2.1.1.4', '1.2.1.1.6']
    );
    const investmentAssetCoas = Array.isArray(assetCoasSetting)
      ? assetCoasSetting
      : ['1.2.1.1.4', '1.2.1.1.6'];

    // 2. Preload data master ke Memory Map untuk O(1) in-memory lookup
    // a. Units (kode -> unit.id)
    const unitsRes = await db.query(
      'SELECT id, code, name FROM units WHERE company_id = $1',
      [companyId]
    );
    const unitsByCode = new Map();
    for (const u of unitsRes.rows) {
      if (u.code) unitsByCode.set(u.code.trim(), u.id);
    }

    // b. Unit Aliases (alias_name -> unit_id)
    const aliasMap = await unitAliasRepository.getAliasMap(companyId);

    // c. COAs (code -> coa.id)
    const coasRes = await db.query('SELECT id, code, name FROM coas');
    const coasByCode = new Map();
    for (const c of coasRes.rows) {
      if (c.code) coasByCode.set(c.code.trim(), c.id);
    }

    // d. Items (id & code -> item.id)
    const itemsRes = await db.query('SELECT id, code FROM items');
    const itemsById = new Map();
    const itemsByCode = new Map();
    for (const it of itemsRes.rows) {
      itemsById.set(Number(it.id), it.id);
      if (it.code) itemsByCode.set(it.code.trim(), it.id);
    }

    // 3. Persiapan Streaming WorkbookReader
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      styles: 'ignore',
    });

    let headerMap = null;
    let rowNumber = 0;
    let rowsRead = 0;
    let rowsExpense = 0;
    let rowsInvestment = 0;
    let rowsSkipped = 0;
    let rowsWithoutUnit = 0;

    const detectedMonths = new Map(); // Untuk menentukan bulan terbanyak
    const lineChunk = [];
    const errorChunk = [];
    const CHUNK_SIZE = 1000;

    // Set untuk memeriksa ID SUB JURNAL yang sudah ada di DB jika mode === 'append'
    const isAppendMode = batch.mode === 'append';

    for await (const worksheetReader of workbookReader) {
      for await (const row of worksheetReader) {
        rowNumber++;
        const values = row.values;
        if (!values || !Array.isArray(values) || values.length <= 1) {
          continue;
        }

        // Baris pertama adalah Header
        if (!headerMap) {
          headerMap = new Map();
          for (let col = 1; col < values.length; col++) {
            const raw = getCellValue(values[col]);
            const norm = normalizeHeaderName(raw);
            if (norm) headerMap.set(norm, col);
          }
          continue;
        }

        rowsRead++;

        // Ekstraksi nilai kolom berdasarkan headerMap
        const rawDate = getCellValue(values[headerMap.get('TANGGAL')]);
        const subJournalId = String(getCellValue(values[headerMap.get('ID SUB JURNAL')]) || '').trim();
        const journalNo = String(getCellValue(values[headerMap.get('IDGL')]) || '').trim();
        const rawCoaCode = String(getCellValue(values[headerMap.get('KODE COA')]) || '').trim();
        const rawCoaName = String(getCellValue(values[headerMap.get('NAMA COA')]) || '').trim();
        const rawUnit = String(getCellValue(values[headerMap.get('UNIT')]) || '').trim();
        const rawDebit = getCellValue(values[headerMap.get('DEBET')]);
        const rawCredit = getCellValue(values[headerMap.get('KREDIT')]);
        const description = String(getCellValue(values[headerMap.get('KETERANGAN')]) || '').trim();

        // 4. Filter Akun: Hanya akun 4.x, 5.x, dan investment_asset_coas
        const isExpense = rawCoaCode.startsWith('4') || rawCoaCode.startsWith('5');
        const isInvestment = investmentAssetCoas.some((assetCoa) =>
          rawCoaCode.startsWith(assetCoa)
        );

        if (!isExpense && !isInvestment) {
          rowsSkipped++;
          continue;
        }

        // Hitung kategori
        if (isExpense) {
          rowsExpense++;
        } else {
          rowsInvestment++;
        }

        // 5. Resolusi Tanggal & Periode
        const trxDate = parseDate(rawDate);
        if (trxDate) {
          const monthKey = trxDate.slice(0, 7); // 'YYYY-MM'
          detectedMonths.set(monthKey, (detectedMonths.get(monthKey) || 0) + 1);
        }

        // 6. Resolusi Unit
        let unitId = null;
        if (!rawUnit) {
          rowsWithoutUnit++;
          errorChunk.push({
            batch_id: batchId,
            sub_journal_id: subJournalId,
            row_number: rowNumber,
            error_type: 'NO_UNIT',
            raw_data: { sub_journal_id: subJournalId, raw_coa_code: rawCoaCode },
            reason: 'Baris tanpa unit',
          });
        } else {
          // Cari pola [9xxx]
          const bracketMatch = rawUnit.match(/\[([0-9]{4})\]/);
          if (bracketMatch && bracketMatch[1]) {
            const unitCode = bracketMatch[1];
            if (unitsByCode.has(unitCode)) {
              unitId = unitsByCode.get(unitCode);
            }
          }

          // Jika tidak ada [9xxx] atau kode tidak ditemukan, cari di alias
          if (!unitId) {
            const cleanUnitName = rawUnit.toLowerCase().trim();
            if (aliasMap.has(cleanUnitName)) {
              unitId = aliasMap.get(cleanUnitName);
            }
          }

          // Jika masih belum terpetakan
          if (!unitId) {
            rowsWithoutUnit++;
            errorChunk.push({
              batch_id: batchId,
              sub_journal_id: subJournalId,
              row_number: rowNumber,
              error_type: 'UNMAPPED_UNIT',
              raw_data: { raw_unit: rawUnit, sub_journal_id: subJournalId },
              reason: `Unit tidak dikenal: ${rawUnit}`,
            });
          }
        }

        // 7. Resolusi COA ID
        const coaId = coasByCode.get(rawCoaCode) || null;

        // 8. Pencocokan Barang untuk Baris "Pemakaian"
        let itemId = null;
        if (/pemakaian/i.test(description)) {
          const itemMatch = description.match(/\(([0-9]+)\)/);
          if (itemMatch && itemMatch[1]) {
            const itemCodeOrId = itemMatch[1];
            const numId = parseInt(itemCodeOrId, 10);
            if (itemsById.has(numId)) {
              itemId = itemsById.get(numId);
            } else if (itemsByCode.has(itemCodeOrId)) {
              itemId = itemsByCode.get(itemCodeOrId);
            } else {
              errorChunk.push({
                batch_id: batchId,
                sub_journal_id: subJournalId,
                row_number: rowNumber,
                error_type: 'UNMATCHED_ITEM',
                raw_data: { description, item_extracted: itemCodeOrId },
                reason: `ID barang dalam KETERANGAN (${itemCodeOrId}) tidak ditemukan di master`,
              });
            }
          } else {
            errorChunk.push({
              batch_id: batchId,
              sub_journal_id: subJournalId,
              row_number: rowNumber,
              error_type: 'UNMATCHED_ITEM',
              raw_data: { description },
              reason: 'Keterangan memuat kata pemakaian tetapi angka dalam tanda kurung tidak ditemukan',
            });
          }
        }

        // 9. Konversi Nilai Uang
        const debit = parseAmount(rawDebit);
        const credit = parseAmount(rawCredit);

        // Tambah ke buffer baris jurnal
        lineChunk.push({
          batch_id: batchId,
          sub_journal_id: subJournalId || `ROW-${rowNumber}`,
          journal_no: journalNo,
          trx_date: trxDate || new Date().toISOString().slice(0, 10),
          unit_id: unitId,
          raw_unit: rawUnit,
          coa_id: coaId,
          raw_coa_code: rawCoaCode,
          raw_coa_name: rawCoaName,
          debit,
          credit,
          description,
          item_id: itemId,
          status: 'PREVIEW',
        });

        // Flush Chunk ke Database jika sudah mencapai batas
        if (lineChunk.length >= CHUNK_SIZE) {
          // Jika mode append, filter duplikat sebelum insert
          if (isAppendMode) {
            const subIds = lineChunk.map((l) => l.sub_journal_id);
            const existingSet = await journalLineRepository.findExistingSubJournalIds(subIds);
            const nonDuplicates = lineChunk.filter((l) => !existingSet.has(l.sub_journal_id));
            await journalLineRepository.bulkInsertChunk(nonDuplicates);
          } else {
            await journalLineRepository.bulkInsertChunk(lineChunk);
          }
          lineChunk.length = 0;
        }

        if (errorChunk.length >= CHUNK_SIZE) {
          await realizationErrorRepository.bulkInsertErrors(errorChunk);
          errorChunk.length = 0;
        }

        // Update progress setiap 5.000 baris
        if (rowsRead % 5000 === 0) {
          await realizationBatchRepository.updateBatchProgress(batchId, {
            rows_read: rowsRead,
            rows_expense: rowsExpense,
            rows_investment: rowsInvestment,
            rows_skipped: rowsSkipped,
            rows_without_unit: rowsWithoutUnit,
          });
        }
      }
    }

    // Flush sisa baris
    if (lineChunk.length > 0) {
      if (isAppendMode) {
        const subIds = lineChunk.map((l) => l.sub_journal_id);
        const existingSet = await journalLineRepository.findExistingSubJournalIds(subIds);
        const nonDuplicates = lineChunk.filter((l) => !existingSet.has(l.sub_journal_id));
        await journalLineRepository.bulkInsertChunk(nonDuplicates);
      } else {
        await journalLineRepository.bulkInsertChunk(lineChunk);
      }
      lineChunk.length = 0;
    }

    if (errorChunk.length > 0) {
      await realizationErrorRepository.bulkInsertErrors(errorChunk);
      errorChunk.length = 0;
    }

    // Tentukan bulan periode yang paling banyak muncul
    let determinedPeriod = null;
    let maxCount = 0;
    for (const [month, count] of detectedMonths.entries()) {
      if (count > maxCount) {
        maxCount = count;
        determinedPeriod = month;
      }
    }

    const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
    const rowsUsed = rowsExpense + rowsInvestment;

    // Update status batch akhir ke PREVIEW
    await realizationBatchRepository.updateBatchProgress(batchId, {
      status: 'PREVIEW',
      period: determinedPeriod || batch.period,
      progress_percent: 100,
      rows_total: rowsRead,
      rows_read: rowsRead,
      rows_used: rowsUsed,
      rows_expense: rowsExpense,
      rows_investment: rowsInvestment,
      rows_skipped: rowsSkipped,
      rows_without_unit: rowsWithoutUnit,
      rows_error: rowsWithoutUnit,
      read_seconds: elapsedSeconds,
    });

    // Hapus file sementara dari folder uploads setelah selesai diproses
    if (filePath && filePath.includes('uploads') && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn(`Gagal menghapus file sementara ${filePath}:`, e.message);
      }
    }

    return await realizationBatchRepository.findById(batchId);
  } catch (err) {
    console.error(`Gagal memproses batch import ${batchId}:`, err);
    // Update batch menjadi FAILED
    await realizationBatchRepository.updateBatchProgress(batchId, {
      status: 'FAILED',
      error_message: err.message,
    });

    // Bersihkan file sementara di folder uploads
    if (filePath && filePath.includes('uploads') && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

/**
 * Mengambil detail batch import beserta rangkuman unmapped units.
 */
async function getImportBatch(batchId) {
  const batch = await realizationBatchRepository.findById(batchId);
  if (!batch) {
    const err = new Error(`Batch ID ${batchId} tidak ditemukan.`);
    err.status = 404;
    throw err;
  }

  const unmapped = await realizationBatchRepository.getUnmappedUnits(batchId);
  return {
    ...batch,
    unmapped_units_count: unmapped.length,
    unmapped_units_summary: unmapped,
  };
}

/**
 * Daftar riwayat batch import.
 */
async function listImportBatches(params) {
  return await realizationBatchRepository.findAll(params);
}

/**
 * Daftar unit yang belum terpetakan untuk batch tertentu.
 */
async function getUnmappedUnits(batchId) {
  const batch = await realizationBatchRepository.findById(batchId);
  if (!batch) {
    const err = new Error(`Batch ID ${batchId} tidak ditemukan.`);
    err.status = 404;
    throw err;
  }
  return await realizationBatchRepository.getUnmappedUnits(batchId);
}

/**
 * Daftar galat pada batch tertentu.
 */
async function getBatchErrors(batchId, params) {
  const batch = await realizationBatchRepository.findById(batchId);
  if (!batch) {
    const err = new Error(`Batch ID ${batchId} tidak ditemukan.`);
    err.status = 404;
    throw err;
  }
  return await realizationErrorRepository.findByBatchId(batchId, params);
}

/**
 * Menambah / memperbarui alias unit dan memetakan otomatis baris PREVIEW yang ada.
 */
async function updateUnitAlias({ companyId, aliasName, unitId, userId }) {
  if (!companyId || !aliasName || !unitId) {
    const err = new Error('Parameter company_id, alias_name, dan unit_id wajib diisi.');
    err.status = 400;
    throw err;
  }

  // 1. Simpan alias
  const alias = await unitAliasRepository.upsertAlias(
    companyId,
    aliasName,
    unitId,
    userId
  );

  // 2. Petakan ulang baris jurnal PREVIEW yang cocok dengan nama alias ini
  const remappedRowsCount = await journalLineRepository.remapLinesByAlias(
    companyId,
    aliasName,
    unitId
  );

  // 3. Perbarui hitungan rows_without_unit pada batch PREVIEW yang relevan
  const previewBatches = await realizationBatchRepository.findAll({
    company_id: companyId,
    status: 'PREVIEW',
  });

  for (const b of previewBatches.data) {
    const unmapped = await realizationBatchRepository.getUnmappedUnits(b.id);
    const unmappedRows = unmapped.reduce((sum, item) => sum + item.rows_count, 0);
    await realizationBatchRepository.updateBatchProgress(b.id, {
      rows_without_unit: unmappedRows,
      rows_error: unmappedRows,
    });
  }

  // 4. Catat Audit
  await AuditService.log(
    userId,
    'unit_aliases',
    alias.id,
    'UPSERT_UNIT_ALIAS',
    null,
    { company_id: companyId, alias_name: aliasName, unit_id: unitId, remappedRowsCount }
  );

  return {
    alias,
    remapped_rows: remappedRowsCount,
  };
}

/**
 * Konfirmasi batch import (PREVIEW -> CONFIRMED).
 * Menolak dengan 409 Conflict bila masih ada unit yang belum terpetakan.
 */
async function confirmImport(batchId, userId) {
  const batch = await realizationBatchRepository.findById(batchId);
  if (!batch) {
    const err = new Error(`Batch ID ${batchId} tidak ditemukan.`);
    err.status = 404;
    throw err;
  }

  if (batch.status !== 'PREVIEW') {
    const err = new Error(
      `Batch dengan status '${batch.status}' tidak dapat dikonfirmasi (hanya batch PREVIEW yang dapat dikonfirmasi).`
    );
    err.status = 400;
    throw err;
  }

  // Validasi: Cek unmapped units
  const unmapped = await realizationBatchRepository.getUnmappedUnits(batchId);
  if (unmapped.length > 0 || batch.rows_without_unit > 0) {
    const err = new Error(
      `Konfirmasi gagal: masih ada ${unmapped.length} unit (${batch.rows_without_unit} baris) yang belum terpetakan. Silakan petakan unit terlebih dahulu.`
    );
    err.status = 409; // 409 Conflict sesuai instruksi PRD & spesifikasi
    err.details = { unmapped_units: unmapped };
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Jika mode replace_month, hapus baris CONFIRMED sebelumnya untuk perusahaan dan periode yang sama
    if (batch.mode === 'replace_month' && batch.period) {
      await journalLineRepository.deleteExistingConfirmedLines(
        batch.company_id,
        batch.period,
        batch.id,
        client
      );
    }

    // Ubah status baris jurnal menjadi CONFIRMED
    await journalLineRepository.updateBatchLinesStatus(batchId, 'CONFIRMED', client);

    // Ubah status batch menjadi CONFIRMED
    const updatedBatch = await realizationBatchRepository.updateBatchProgress(
      batchId,
      { status: 'CONFIRMED' },
      client
    );

    // Catat Audit
    await AuditService.log(
      userId,
      'import_batches',
      batchId,
      'CONFIRM_REALIZATION',
      { status: 'PREVIEW' },
      { status: 'CONFIRMED', mode: batch.mode, period: batch.period },
      client
    );

    await client.query('COMMIT');
    return updatedBatch;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Pembatalan / Rollback batch import.
 */
async function rollbackImport(batchId, userId) {
  const batch = await realizationBatchRepository.findById(batchId);
  if (!batch) {
    const err = new Error(`Batch ID ${batchId} tidak ditemukan.`);
    err.status = 404;
    throw err;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Hapus seluruh baris jurnal
    await journalLineRepository.deleteByBatchId(batchId, client);

    // Hapus seluruh error
    await realizationErrorRepository.deleteByBatchId(batchId, client);

    // Update status batch menjadi ROLLED_BACK
    const updatedBatch = await realizationBatchRepository.updateBatchProgress(
      batchId,
      { status: 'ROLLED_BACK' },
      client
    );

    // Catat Audit
    await AuditService.log(
      userId,
      'import_batches',
      batchId,
      'ROLLBACK_REALIZATION',
      { status: batch.status },
      { status: 'ROLLED_BACK' },
      client
    );

    await client.query('COMMIT');
    return updatedBatch;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  validateWorkbookHeader,
  createImportBatch,
  processRealizationFile,
  getImportBatch,
  listImportBatches,
  getUnmappedUnits,
  getBatchErrors,
  updateUnitAlias,
  confirmImport,
  rollbackImport,
};
