const db = require('../../db');
const itemRepository = require('../repositories/item.repository');
const coaRepository = require('../repositories/coa.repository');
const investmentCategoryRepository = require('../repositories/investmentCategory.repository');
const unitRepository = require('../repositories/unit.repository');
const referenceRepository = require('../repositories/reference.repository');
const auditService = require('./audit.service');

// --- ITEMS ---
const listItems = async (params) => {
  return await itemRepository.findAll(params);
};

const getItemDetail = async (id) => {
  const item = await itemRepository.findById(id);
  if (!item) {
    const error = new Error('Barang tidak ditemukan');
    error.status = 404;
    throw error;
  }
  return item;
};

const createItem = async (data, actorId) => {
  const existing = await itemRepository.findByCode(data.code);
  if (existing) {
    const error = new Error(`Kode barang '${data.code}' sudah digunakan`);
    error.status = 422;
    throw error;
  }

  let createdId;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const newItem = await itemRepository.upsertItem(data, client);
    createdId = newItem.id;

    if (Array.isArray(data.prices) && data.prices.length > 0) {
      for (const p of data.prices) {
        const compRes = await client.query(
          'SELECT id, code FROM companies WHERE UPPER(code) = UPPER($1)',
          [String(p.company_code).trim()]
        );
        if (compRes.rows.length === 0) {
          const error = new Error(`Perusahaan '${p.company_code}' tidak terdaftar`);
          error.status = 422;
          throw error;
        }
        const company = compRes.rows[0];
        const newPrice = Math.round(Number(p.price) || 0);

        await itemRepository.upsertPrice(newItem.id, company.id, newPrice, actorId, client);
        await itemRepository.recordPriceHistory(
          newItem.id,
          company.id,
          0,
          newPrice,
          'manual',
          actorId,
          client
        );
      }
    }

    await auditService.log(actorId, 'items', newItem.id, 'create_item', null, data, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await itemRepository.findById(createdId);
};

const updateItem = async (id, data, actorId) => {
  const existing = await itemRepository.findById(id);
  if (!existing) {
    const error = new Error('Barang tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await itemRepository.upsertItem(
      {
        ...existing,
        ...data,
        code: existing.code, // Kode tidak diubah
      },
      client
    );

    if (Array.isArray(data.prices) && data.prices.length > 0) {
      for (const p of data.prices) {
        const compRes = await client.query(
          'SELECT id, code FROM companies WHERE UPPER(code) = UPPER($1)',
          [String(p.company_code).trim()]
        );
        if (compRes.rows.length === 0) {
          const error = new Error(`Perusahaan '${p.company_code}' tidak terdaftar`);
          error.status = 422;
          throw error;
        }
        const company = compRes.rows[0];
        const newPrice = Math.round(Number(p.price) || 0);

        const oldPriceRes = await client.query(
          'SELECT price FROM item_prices WHERE item_id = $1 AND company_id = $2',
          [id, company.id]
        );
        const oldPrice = oldPriceRes.rows.length > 0 ? Number(oldPriceRes.rows[0].price) : 0;

        if (oldPrice !== newPrice) {
          await itemRepository.upsertPrice(id, company.id, newPrice, actorId, client);
          await itemRepository.recordPriceHistory(
            id,
            company.id,
            oldPrice,
            newPrice,
            'manual',
            actorId,
            client
          );
        }
      }
    }

    await auditService.log(actorId, 'items', id, 'update_item', existing, updated, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await itemRepository.findById(id);
};

const updateItemPrices = async (id, pricesData, actorId) => {
  const existing = await itemRepository.findById(id);
  if (!existing) {
    const error = new Error('Barang tidak ditemukan');
    error.status = 404;
    throw error;
  }

  if (!Array.isArray(pricesData) || pricesData.length === 0) {
    const error = new Error('Data harga (prices) harus berupa array yang tidak kosong');
    error.status = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    for (const p of pricesData) {
      const compCode = String(p.company_code || '').trim();
      const compRes = await client.query(
        'SELECT id, code FROM companies WHERE UPPER(code) = UPPER($1)',
        [compCode]
      );
      if (compRes.rows.length === 0) {
        const error = new Error(`Perusahaan '${compCode}' tidak terdaftar`);
        error.status = 422;
        throw error;
      }
      const company = compRes.rows[0];

      const oldPriceRes = await client.query(
        'SELECT price FROM item_prices WHERE item_id = $1 AND company_id = $2',
        [id, company.id]
      );
      const oldPrice = oldPriceRes.rows.length > 0 ? Number(oldPriceRes.rows[0].price) : 0;
      const newPrice = Math.round(Number(p.price) || 0);

      if (oldPrice !== newPrice) {
        await itemRepository.upsertPrice(id, company.id, newPrice, actorId, client);
        await itemRepository.recordPriceHistory(
          id,
          company.id,
          oldPrice,
          newPrice,
          'manual',
          actorId,
          client
        );
      }
    }

    await auditService.log(actorId, 'items', id, 'update_item_prices', null, pricesData, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await itemRepository.findById(id);
};

const updateItemStatus = async (id, isActive, actorId) => {
  const existing = await itemRepository.findById(id);
  if (!existing) {
    const error = new Error('Barang tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const updated = await itemRepository.updateStatus(id, isActive);
  await auditService.log(
    actorId,
    'items',
    id,
    isActive ? 'activate_item' : 'deactivate_item',
    { is_active: existing.is_active },
    { is_active: updated.is_active }
  );
  return updated;
};

// --- COAS ---
const listCoas = async (params) => {
  return await coaRepository.findAll(params);
};

const getCoaDetail = async (id) => {
  const coa = await coaRepository.findById(id);
  if (!coa) {
    const error = new Error('COA tidak ditemukan');
    error.status = 404;
    throw error;
  }
  return coa;
};

const createCoa = async (data, actorId) => {
  const existing = await coaRepository.findByCode(data.code);
  if (existing) {
    const error = new Error(`Kode COA '${data.code}' sudah terdaftar`);
    error.status = 422;
    throw error;
  }

  const newCoa = await coaRepository.upsertCoa(data);
  await auditService.log(actorId, 'coas', newCoa.id, 'create_coa', null, data);
  return newCoa;
};

const updateCoa = async (id, data, actorId) => {
  const existing = await coaRepository.findById(id);
  if (!existing) {
    const error = new Error('COA tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const updated = await coaRepository.upsertCoa({
    ...existing,
    ...data,
    code: existing.code,
  });
  await auditService.log(actorId, 'coas', id, 'update_coa', existing, updated);
  return updated;
};

const listCoaGroups = async () => {
  return await coaRepository.findGroupsWithCounts();
};

// --- INVESTMENT CATEGORIES ---
const listInvestmentCategories = async () => {
  return await investmentCategoryRepository.findAll();
};

const updateInvestmentCategory = async (id, data, actorId) => {
  const existing = await investmentCategoryRepository.findById(id);
  if (!existing) {
    const error = new Error('Kategori investasi tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const updated = await investmentCategoryRepository.update(id, data);
  await auditService.log(
    actorId,
    'investment_categories',
    id,
    'update_investment_category',
    existing,
    updated
  );
  return updated;
};

// --- UNITS ---
const listUnits = async (params) => {
  return await unitRepository.findAll(params);
};

const createUnit = async (data, actorId) => {
  const newUnit = await unitRepository.create(data);
  await auditService.log(actorId, 'units', newUnit.id, 'create_unit', null, data);
  return newUnit;
};

const updateUnit = async (id, data, actorId) => {
  const existing = await unitRepository.findById(id);
  if (!existing) {
    const error = new Error('Unit tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const updated = await unitRepository.update(id, data);
  await auditService.log(actorId, 'units', id, 'update_unit', existing, updated);
  return updated;
};

// --- REFERENCE DATA ---
const getReferenceData = async () => {
  return await referenceRepository.getAllReferenceData();
};

// --- PRICE HISTORY ---
const getItemPriceHistory = async (itemId, companyId = null) => {
  const item = await itemRepository.findById(itemId);
  if (!item) {
    const error = new Error('Barang tidak ditemukan');
    error.status = 404;
    throw error;
  }
  return await itemRepository.getPriceHistory(itemId, companyId);
};

// --- DELETE OPERATIONS (SAFE DELETION WITH DEPENDENCY CHECK & AUDIT) ---
const deleteItem = async (id, actorId) => {
  const existing = await itemRepository.findById(id);
  if (!existing) {
    const error = new Error('Barang tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const ref = await itemRepository.countReferences(id, client);
    if (ref.total > 0) {
      const details = [];
      if (ref.expense_lines > 0) details.push(`${ref.expense_lines} baris anggaran biaya`);
      if (ref.journal_lines > 0) details.push(`${ref.journal_lines} baris jurnal realisasi`);
      if (ref.new_item_requests > 0) details.push(`${ref.new_item_requests} usulan barang baru`);

      const error = new Error(
        `Barang "${existing.name}" tidak dapat dihapus permanen karena sudah memiliki riwayat (${details.join(', ')}). Silakan nonaktifkan status barang agar tidak dapat dipilih lagi.`
      );
      error.status = 409;
      error.can_deactivate = true;
      throw error;
    }

    await itemRepository.deleteItem(id, client);
    await auditService.log(actorId, 'items', id, 'delete_item', existing, null, client);

    await client.query('COMMIT');
    return { success: true, message: `Barang "${existing.name}" berhasil dihapus permanen.` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const deleteCoa = async (id, actorId) => {
  const existing = await coaRepository.findById(id);
  if (!existing) {
    const error = new Error('COA tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const ref = await coaRepository.countReferences(id, client);
    if (ref.total > 0) {
      const details = [];
      if (ref.items > 0) details.push(`${ref.items} master barang`);
      if (ref.investment_lines > 0) details.push(`${ref.investment_lines} baris anggaran investasi`);
      if (ref.categories > 0) details.push(`${ref.categories} kategori investasi`);
      if (ref.journal_lines > 0) details.push(`${ref.journal_lines} baris jurnal realisasi`);
      if (ref.new_item_requests > 0) details.push(`${ref.new_item_requests} usulan barang`);

      const error = new Error(
        `Akun COA "${existing.code} - ${existing.name}" tidak dapat dihapus permanen karena masih digunakan (${details.join(', ')}). Silakan nonaktifkan akun agar tidak dapat dipilih lagi.`
      );
      error.status = 409;
      error.can_deactivate = true;
      throw error;
    }

    await coaRepository.deleteCoa(id, client);
    await auditService.log(actorId, 'coas', id, 'delete_coa', existing, null, client);

    await client.query('COMMIT');
    return { success: true, message: `Akun COA "${existing.code} - ${existing.name}" berhasil dihapus permanen.` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const deleteUnit = async (id, actorId) => {
  const existing = await unitRepository.findById(id);
  if (!existing) {
    const error = new Error('Unit tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const ref = await unitRepository.countReferences(id, client);
    if (ref.total > 0) {
      const details = [];
      if (ref.budget_docs > 0) details.push(`${ref.budget_docs} dokumen anggaran`);
      if (ref.journal_lines > 0) details.push(`${ref.journal_lines} baris jurnal realisasi`);
      if (ref.user_units > 0) details.push(`${ref.user_units} penugasan pengguna`);
      if (ref.new_item_requests > 0) details.push(`${ref.new_item_requests} usulan barang`);

      const error = new Error(
        `Unit "${existing.code} - ${existing.name}" tidak dapat dihapus permanen karena masih digunakan (${details.join(', ')}). Silakan nonaktifkan unit agar tidak dapat dipilih lagi.`
      );
      error.status = 409;
      error.can_deactivate = true;
      throw error;
    }

    await unitRepository.deleteUnit(id, client);
    await auditService.log(actorId, 'units', id, 'delete_unit', existing, null, client);

    await client.query('COMMIT');
    return { success: true, message: `Unit "${existing.code} - ${existing.name}" berhasil dihapus permanen.` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  listItems,
  getItemDetail,
  createItem,
  updateItem,
  updateItemPrices,
  updateItemStatus,
  deleteItem,
  getItemPriceHistory,
  listCoas,
  getCoaDetail,
  createCoa,
  updateCoa,
  deleteCoa,
  listCoaGroups,
  listInvestmentCategories,
  updateInvestmentCategory,
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getReferenceData,
};

