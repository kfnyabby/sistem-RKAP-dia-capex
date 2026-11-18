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

  const newItem = await itemRepository.upsertItem(data);

  if (Array.isArray(data.prices) && data.prices.length > 0) {
    for (const p of data.prices) {
      const compRes = await db.query(
        'SELECT id, code FROM companies WHERE UPPER(code) = UPPER($1)',
        [String(p.company_code).trim()]
      );
      if (compRes.rows.length === 0) {
        const error = new Error(`Perusahaan '${p.company_code}' tidak terdaftar`);
        error.status = 422;
        throw error;
      }
      const company = compRes.rows[0];

      const periodRes = await db.query(
        'SELECT id FROM periods WHERE company_id = $1 AND year = $2',
        [company.id, parseInt(p.period_year, 10)]
      );
      if (periodRes.rows.length === 0) {
        const error = new Error(
          `Periode untuk perusahaan ${company.code} tahun ${p.period_year} belum terdaftar`
        );
        error.status = 422;
        throw error;
      }
      const period = periodRes.rows[0];

      await itemRepository.upsertPrice(
        newItem.id,
        company.id,
        period.id,
        Math.round(Number(p.price) || 0)
      );
    }
  } else {
    if (data.price !== undefined || data.price_cn !== undefined) {
      const pVal = data.price !== undefined ? data.price : data.price_cn;
      await itemRepository.upsertPrice(newItem.id, 1, 1, Math.round(Number(pVal) || 0));
    }
    if (data.price_cnh !== undefined) {
      await itemRepository.upsertPrice(newItem.id, 2, 2, Math.round(Number(data.price_cnh) || 0));
    }
  }

  await auditService.log(actorId, 'items', newItem.id, 'create_item', null, data);
  return await itemRepository.findById(newItem.id);
};

const updateItem = async (id, data, actorId) => {
  const existing = await itemRepository.findById(id);
  if (!existing) {
    const error = new Error('Barang tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const updated = await itemRepository.upsertItem({
    ...existing,
    ...data,
    code: existing.code, // Kode tidak diubah
  });

  if (Array.isArray(data.prices) && data.prices.length > 0) {
    for (const p of data.prices) {
      const compRes = await db.query(
        'SELECT id, code FROM companies WHERE UPPER(code) = UPPER($1)',
        [String(p.company_code).trim()]
      );
      if (compRes.rows.length === 0) {
        const error = new Error(`Perusahaan '${p.company_code}' tidak terdaftar`);
        error.status = 422;
        throw error;
      }
      const company = compRes.rows[0];

      const periodRes = await db.query(
        'SELECT id FROM periods WHERE company_id = $1 AND year = $2',
        [company.id, parseInt(p.period_year, 10)]
      );
      if (periodRes.rows.length === 0) {
        const error = new Error(
          `Periode untuk perusahaan ${company.code} tahun ${p.period_year} belum terdaftar`
        );
        error.status = 422;
        throw error;
      }
      const period = periodRes.rows[0];

      await itemRepository.upsertPrice(
        id,
        company.id,
        period.id,
        Math.round(Number(p.price) || 0)
      );
    }
  } else {
    if (data.price !== undefined || data.price_cn !== undefined) {
      const pVal = data.price !== undefined ? data.price : data.price_cn;
      await itemRepository.upsertPrice(id, 1, 1, Math.round(Number(pVal) || 0));
    }
    if (data.price_cnh !== undefined) {
      await itemRepository.upsertPrice(id, 2, 2, Math.round(Number(data.price_cnh) || 0));
    }
  }

  await auditService.log(actorId, 'items', id, 'update_item', existing, updated);
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

module.exports = {
  listItems,
  getItemDetail,
  createItem,
  updateItem,
  updateItemStatus,
  listCoas,
  getCoaDetail,
  createCoa,
  updateCoa,
  listCoaGroups,
  listInvestmentCategories,
  updateInvestmentCategory,
  listUnits,
  createUnit,
  updateUnit,
  getReferenceData,
};

