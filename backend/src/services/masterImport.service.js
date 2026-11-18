const ExcelJS = require('exceljs');
const db = require('../../db');
const itemRepository = require('../repositories/item.repository');
const coaRepository = require('../repositories/coa.repository');
const investmentCategoryRepository = require('../repositories/investmentCategory.repository');
const importLogRepository = require('../repositories/importLog.repository');
const auditService = require('./audit.service');

const normalizeHeader = (h) =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

const importItems = async (fileBuffer, filename = 'Master_Barang.xlsx', options = {}) => {
  const {
    dry_run = true,
    actorId = null,
    company_code = 'CN',
    update_prices = false,
  } = options;

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer);
  } catch {
    const err = new Error('Berkas Excel rusak atau tidak dapat dibaca');
    err.status = 400;
    throw err;
  }

  // Validasi Perusahaan (ID dicari dari tabel companies)
  const companyRes = await db.query(
    'SELECT id, code, name FROM companies WHERE UPPER(code) = UPPER($1)',
    [String(company_code).trim()]
  );
  if (companyRes.rows.length === 0) {
    const err = new Error(`Perusahaan dengan kode '${company_code}' tidak ditemukan`);
    err.status = 422;
    throw err;
  }
  const company = companyRes.rows[0];

  // Cari worksheet MASTER_BARANG atau worksheet pertama
  let sheet = workbook.worksheets.find((ws) =>
    ws.name.toUpperCase().includes('MASTER_BARANG')
  );
  if (!sheet) {
    sheet = workbook.worksheets[0];
  }
  if (!sheet) {
    throw new Error('Berkas Excel tidak memiliki sheet yang valid');
  }

  // Petakan index kolom dari header (baris 1)
  const headerMap = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const norm = normalizeHeader(cell.value);
    headerMap[norm] = colNumber;
  });

  const getCol = (possibleNames) => {
    for (const name of possibleNames) {
      const norm = normalizeHeader(name);
      if (headerMap[norm]) return headerMap[norm];
    }
    return null;
  };

  const colId = getCol(['id_barang', 'id', 'kode_barang', 'kode']);
  const colProdCode = getCol(['kode_produk', 'kodeproduk', 'kode_prod']);
  const colName = getCol(['nama_barang', 'namabarang', 'nama', 'item_name']);
  const colGroup = getCol(['golongan', 'group', 'kelompok', 'kategori_barang']);
  const colUom = getCol(['satuan_beli', 'satuan', 'uom', 'satuan_dasar']);
  const colHpp = getCol(['hpp', 'harga', 'harga_satuan', 'price']);
  const colStatus = getCol(['status', 'is_active', 'aktif']);
  const colCoaBiaya = getCol(['coa_biaya', 'kode_coa', 'coa', 'akun_biaya']);
  const colCoaPersediaan = getCol(['coa_persediaan', 'inventory_coa']);
  const colKatCoa = getCol(['kategori_coa', 'jenis_coa']);

  if (!colName) {
    throw new Error('Kolom NAMA_BARANG tidak ditemukan pada sheet Excel');
  }

  // Siapkan map COA yang ada di database untuk validasi
  const allCoasRes = await db.query('SELECT id, code, name FROM coas');
  const coaMap = new Map();
  allCoasRes.rows.forEach((c) => coaMap.set(c.code.trim(), c.id));

  // Siapkan map barang yang sudah ada di database untuk deteksi cocok & coa berubah
  const existingItemsRes = await db.query('SELECT id, code, name, coa_id FROM items');
  const existingCodeMap = new Map();
  const existingNameMap = new Map();
  existingItemsRes.rows.forEach((item) => {
    existingCodeMap.set(String(item.code).trim(), item);
    existingNameMap.set(String(item.name).trim().toLowerCase(), item);
  });

  // Siapkan map harga barang eksisting untuk perusahaan terkait
  const existingPricesRes = await db.query(
    'SELECT item_id, price FROM item_prices WHERE company_id = $1',
    [company.id]
  );
  const existingPriceMap = new Map();
  existingPricesRes.rows.forEach((p) => {
    existingPriceMap.set(p.item_id, Number(p.price));
  });

  let totalRead = 0;
  let matchedExisting = 0;
  let newItems = 0;
  let coaChanged = 0;
  let hppZero = 0;
  let missingCoa = 0;
  let unknownCoa = 0;
  let pricesToUpdate = 0;

  const rowErrors = [];
  const parsedRows = [];

  const rowCount = sheet.rowCount;
  for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const nameVal = colName ? String(row.getCell(colName).value || '').trim() : '';
    if (!nameVal) {
      continue; // Lewati baris kosong
    }

    totalRead++;

    const rawId = colId ? row.getCell(colId).value : null;
    const rawProdCode = colProdCode ? String(row.getCell(colProdCode).value || '').trim() : '';
    const rawGroup = colGroup ? String(row.getCell(colGroup).value || '').trim() : '';
    const rawUom = colUom ? String(row.getCell(colUom).value || '').trim() : 'Pcs';
    const rawHpp = colHpp ? row.getCell(colHpp).value : 0;
    const rawStatus = colStatus ? String(row.getCell(colStatus).value || '').trim() : 'Aktif';
    const rawCoaBiaya = colCoaBiaya ? String(row.getCell(colCoaBiaya).value || '').trim() : '';
    const rawCoaInv = colCoaPersediaan ? String(row.getCell(colCoaPersediaan).value || '').trim() : '';
    const rawKatCoa = colKatCoa ? String(row.getCell(colKatCoa).value || '').trim() : '';

    // Bersihkan nilai angka HPP
    let hppNum = 0;
    if (typeof rawHpp === 'number') {
      hppNum = Math.round(rawHpp);
    } else if (typeof rawHpp === 'string') {
      const cleanHpp = rawHpp.replace(/[^0-9.-]+/g, '');
      hppNum = Math.round(parseFloat(cleanHpp) || 0);
    }

    if (hppNum === 0) {
      hppZero++;
    }

    // Resolusi Kode Barang unik
    let itemCode;
    if (rawId) {
      itemCode = String(rawId).trim();
    } else if (rawProdCode) {
      itemCode = rawProdCode;
    } else {
      itemCode = `BRG-${rowNumber}`;
    }

    // Validasi COA
    let coaId = null;
    if (!rawCoaBiaya) {
      missingCoa++;
    } else {
      if (coaMap.has(rawCoaBiaya)) {
        coaId = coaMap.get(rawCoaBiaya);
      } else {
        unknownCoa++;
        rowErrors.push({
          row: rowNumber,
          code: itemCode,
          name: nameVal,
          error: `COA Biaya '${rawCoaBiaya}' tidak ditemukan di Master COA`,
        });
      }
    }

    // Cek COA Persediaan jika ada
    let invCoaId = null;
    if (rawCoaInv && coaMap.has(rawCoaInv)) {
      invCoaId = coaMap.get(rawCoaInv);
    }

    // Cek apakah barang cocok dengan master lama
    const existing = existingCodeMap.get(itemCode) || existingNameMap.get(nameVal.toLowerCase());
    let isNew = !existing;
    let oldPrice = null;
    let willPriceChange = false;

    if (existing) {
      matchedExisting++;
      if (coaId && existing.coa_id && existing.coa_id !== coaId) {
        coaChanged++;
      }
      if (existingPriceMap.has(existing.id)) {
        oldPrice = existingPriceMap.get(existing.id);
        if (oldPrice !== hppNum) {
          willPriceChange = true;
          pricesToUpdate++;
        }
      } else if (hppNum > 0) {
        // Barang lama tapi belum pernah punya harga di perusahaan ini
        willPriceChange = true;
        pricesToUpdate++;
      }
    } else {
      newItems++;
    }

    const isActive = !rawStatus.toLowerCase().includes('tidak') && !rawStatus.toLowerCase().includes('non');

    const itemRecord = {
      row_number: rowNumber,
      code: itemCode,
      product_code: rawProdCode || null,
      name: nameVal,
      group_name: rawGroup || 'Umum',
      uom: rawUom || 'Pcs',
      price: hppNum,
      is_active: isActive,
      coa_id: coaId,
      inventory_coa_id: invCoaId,
      coa_category: rawKatCoa || null,
      raw_coa_code: rawCoaBiaya,
      is_new: isNew,
      old_price: oldPrice,
      will_price_change: willPriceChange,
    };

    parsedRows.push(itemRecord);
  }

  const summary = {
    total_read: totalRead,
    matched_existing: matchedExisting,
    new_items: newItems,
    coa_changed: coaChanged,
    hpp_zero: hppZero,
    missing_coa: missingCoa,
    unknown_coa: unknownCoa,
    prices_to_update: pricesToUpdate,
  };

  // Jika BUKAN dry run, eksekusi penyimpanan transaksi ke database
  if (!dry_run) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      for (const row of parsedRows) {
        const savedItem = await itemRepository.upsertItem(
          {
            code: row.code,
            name: row.name,
            product_code: row.product_code,
            group_name: row.group_name,
            uom: row.uom,
            coa_id: row.coa_id,
            inventory_coa_id: row.inventory_coa_id,
            coa_category: row.coa_category,
            is_active: row.is_active,
          },
          client
        );

        // Update harga:
        // 1. Barang baru: SELALU simpan harga dan catat history (old_price = 0)
        if (row.is_new) {
          await itemRepository.upsertPrice(savedItem.id, company.id, row.price, actorId, client);
          await itemRepository.recordPriceHistory(
            savedItem.id,
            company.id,
            0,
            row.price,
            'import',
            actorId,
            client
          );
        } else if (update_prices && row.will_price_change) {
          // 2. Barang lama: hanya simpan jika update_prices = true dan harga berubah
          await itemRepository.upsertPrice(savedItem.id, company.id, row.price, actorId, client);
          await itemRepository.recordPriceHistory(
            savedItem.id,
            company.id,
            row.old_price ?? 0,
            row.price,
            'import',
            actorId,
            client
          );
        }
      }

      // Catat ke log import
      await importLogRepository.create(
        {
          type: 'ITEMS',
          filename,
          total_read: summary.total_read,
          matched_existing: summary.matched_existing,
          new_items: summary.new_items,
          coa_changed: summary.coa_changed,
          hpp_zero: summary.hpp_zero,
          missing_coa: summary.missing_coa,
          unknown_coa: summary.unknown_coa,
          raw_summary: summary,
          created_by: actorId,
        },
        client
      );

      await auditService.log(
        actorId,
        'items',
        null,
        'import_items',
        null,
        { filename, ...summary },
        client
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    success: true,
    is_dry_run: Boolean(dry_run),
    summary,
    row_errors: rowErrors,
    preview_data: parsedRows.slice(0, 25),
  };
};

const importCoas = async (fileBuffer, filename = 'Master_COA.xlsx', options = {}) => {
  const { dry_run = true, actorId = null } = options;

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer);
  } catch {
    const err = new Error('Berkas Excel rusak atau tidak dapat dibaca');
    err.status = 400;
    throw err;
  }

  const sheetMasterCoa = workbook.worksheets.find(
    (ws) => normalizeHeader(ws.name) === 'mastercoa' || ws.name.toLowerCase().includes('master coa')
  ) || workbook.worksheets[0];

  const sheetKatBiaya = workbook.worksheets.find(
    (ws) => ws.name.toLowerCase().includes('kategori biaya') || ws.name.toLowerCase().includes('kelompok')
  );

  const sheetKatInv = workbook.worksheets.find(
    (ws) => ws.name.toLowerCase().includes('kategori investasi') || ws.name.toLowerCase().includes('investasi')
  );

  const summary = {
    coa_read: 0,
    groups_read: 0,
    investment_categories_read: 0,
  };
  const rowErrors = [];

  const parsedGroups = [];
  const parsedCoas = [];
  const parsedInvCats = [];

  // 1. Parse Sheet Kategori Biaya (Kelompok COA)
  if (sheetKatBiaya) {
    for (let r = 2; r <= sheetKatBiaya.rowCount; r++) {
      const row = sheetKatBiaya.getRow(r);
      const code = String(row.getCell(1).value || '').trim();
      const name = String(row.getCell(2).value || '').trim();
      if (!code || !name) continue;

      summary.groups_read++;
      parsedGroups.push({ code, name });
    }
  }

  // 2. Parse Sheet Master COA
  if (sheetMasterCoa) {
    for (let r = 2; r <= sheetMasterCoa.rowCount; r++) {
      const row = sheetMasterCoa.getRow(r);
      const code = String(row.getCell(1).value || '').trim();
      const name = String(row.getCell(2).value || '').trim();
      const rawCat = String(row.getCell(3).value || '').trim().toLowerCase();
      if (!code || !name) continue;

      summary.coa_read++;
      const category = rawCat.includes('invest') ? 'investasi' : 'biaya';
      parsedCoas.push({ code, name, category, row: r });
    }
  }

  // 3. Parse Sheet Kategori Investasi
  if (sheetKatInv) {
    for (let r = 2; r <= sheetKatInv.rowCount; r++) {
      const row = sheetKatInv.getRow(r);
      const name = String(row.getCell(1).value || '').trim();
      const rawMonths = row.getCell(2).value;
      const coaCode = String(row.getCell(3).value || '').trim();
      if (!name) continue;

      summary.investment_categories_read++;
      const months = parseInt(rawMonths, 10) || 60;
      parsedInvCats.push({ name, useful_life_months: months, coa_code: coaCode });
    }
  }

  // Eksekusi jika bukan dry_run
  if (!dry_run) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Upsert Groups
      for (const g of parsedGroups) {
        await coaRepository.upsertGroup(g, client);
      }

      // Ambil seluruh groups untuk pemetaan group_id pada COA
      const allGroupsRes = await client.query('SELECT id, code FROM coa_groups');
      const groupMap = new Map();
      allGroupsRes.rows.forEach((g) => groupMap.set(g.code.trim(), g.id));

      // 2. Upsert COA
      for (const c of parsedCoas) {
        // Tentukan group_id dari prefix kode COA (misal '4.1.7' -> '4.1', '5.8.3' -> '5.8')
        const parts = c.code.split('.');
        const prefix = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : null;
        const groupId = prefix && groupMap.has(prefix) ? groupMap.get(prefix) : null;

        await coaRepository.upsertCoa(
          {
            code: c.code,
            name: c.name,
            category: c.category,
            group_id: groupId,
          },
          client
        );
      }

      // Ambil kembali seluruh COA untuk foreign key kategori investasi
      const allCoasRes = await client.query('SELECT id, code FROM coas');
      const coaCodeMap = new Map();
      allCoasRes.rows.forEach((c) => coaCodeMap.set(c.code.trim(), c.id));

      // 3. Upsert Kategori Investasi
      for (const ic of parsedInvCats) {
        const depCoaId = ic.coa_code && coaCodeMap.has(ic.coa_code) ? coaCodeMap.get(ic.coa_code) : null;
        await investmentCategoryRepository.upsert(
          {
            name: ic.name,
            useful_life_months: ic.useful_life_months,
            depreciation_coa_id: depCoaId,
          },
          client
        );
      }

      // Log import
      await importLogRepository.create(
        {
          type: 'COAS',
          filename,
          total_read: summary.coa_read,
          raw_summary: summary,
          created_by: actorId,
        },
        client
      );

      await auditService.log(
        actorId,
        'coas',
        null,
        'import_coas',
        null,
        { filename, ...summary },
        client
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    success: true,
    is_dry_run: Boolean(dry_run),
    summary,
    row_errors: rowErrors,
    preview_coas: parsedCoas.slice(0, 15),
    preview_groups: parsedGroups.slice(0, 15),
    preview_inv_cats: parsedInvCats.slice(0, 15),
  };
};

module.exports = {
  importItems,
  importCoas,
};
