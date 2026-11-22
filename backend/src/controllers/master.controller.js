const masterDataService = require('../services/masterData.service');
const masterQualityService = require('../services/masterQuality.service');
const expenseBudgetService = require('../services/expenseBudget.service');

// Items
const getItems = async (req, res, next) => {
  try {
    if (req.query.available_for_doc) {
      const result = await expenseBudgetService.getAvailableItemsForDoc(
        req.query.available_for_doc,
        req.query,
        req.user
      );
      return res.json(result);
    }
    const result = await masterDataService.listItems(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getItemDetail = async (req, res, next) => {
  try {
    const item = await masterDataService.getItemDetail(req.params.id);
    res.json(item);
  } catch (err) {
    next(err);
  }
};

const createItem = async (req, res, next) => {
  try {
    const item = await masterDataService.createItem(req.body, req.user.id);
    res.status(201).json({ message: 'Barang berhasil ditambahkan', data: item });
  } catch (err) {
    next(err);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const item = await masterDataService.updateItem(req.params.id, req.body, req.user.id);
    res.json({ message: 'Barang berhasil diperbarui', data: item });
  } catch (err) {
    next(err);
  }
};

const updateItemStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const item = await masterDataService.updateItemStatus(req.params.id, is_active, req.user.id);
    res.json({ message: 'Status barang berhasil diperbarui', data: item });
  } catch (err) {
    next(err);
  }
};

const updateItemPrices = async (req, res, next) => {
  try {
    const { prices } = req.body;
    const item = await masterDataService.updateItemPrices(req.params.id, prices, req.user.id);
    res.json({ message: 'Harga barang berhasil diperbarui', data: item });
  } catch (err) {
    next(err);
  }
};

const getItemPriceHistory = async (req, res, next) => {
  try {
    const data = await masterDataService.getItemPriceHistory(req.params.id, req.query.company_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Quality Report
const getQualityReport = async (req, res, next) => {
  try {
    const report = await masterQualityService.getQualityReport();
    res.json(report);
  } catch (err) {
    next(err);
  }
};

// COAs
const getCoas = async (req, res, next) => {
  try {
    const result = await masterDataService.listCoas(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getCoaDetail = async (req, res, next) => {
  try {
    const coa = await masterDataService.getCoaDetail(req.params.id);
    res.json(coa);
  } catch (err) {
    next(err);
  }
};

const createCoa = async (req, res, next) => {
  try {
    const coa = await masterDataService.createCoa(req.body, req.user.id);
    res.status(201).json({ message: 'COA berhasil ditambahkan', data: coa });
  } catch (err) {
    next(err);
  }
};

const updateCoa = async (req, res, next) => {
  try {
    const coa = await masterDataService.updateCoa(req.params.id, req.body, req.user.id);
    res.json({ message: 'COA berhasil diperbarui', data: coa });
  } catch (err) {
    next(err);
  }
};

const getCoaGroups = async (req, res, next) => {
  try {
    const groups = await masterDataService.listCoaGroups();
    res.json({
      data: groups,
      meta: { total: groups.length },
    });
  } catch (err) {
    next(err);
  }
};

// Investment Categories
const getInvestmentCategories = async (req, res, next) => {
  try {
    const categories = await masterDataService.listInvestmentCategories();
    res.json({
      data: categories,
      meta: { total: categories.length },
    });
  } catch (err) {
    next(err);
  }
};

const updateInvestmentCategory = async (req, res, next) => {
  try {
    const updated = await masterDataService.updateInvestmentCategory(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json({ message: 'Kategori investasi berhasil diperbarui', data: updated });
  } catch (err) {
    next(err);
  }
};

// Units
const getUnits = async (req, res, next) => {
  try {
    const units = await masterDataService.listUnits(req.query);
    res.json({
      data: units,
      meta: { total: units.length },
    });
  } catch (err) {
    next(err);
  }
};

const createUnit = async (req, res, next) => {
  try {
    const unit = await masterDataService.createUnit(req.body, req.user.id);
    res.status(201).json({ message: 'Unit berhasil ditambahkan', data: unit });
  } catch (err) {
    next(err);
  }
};

const updateUnit = async (req, res, next) => {
  try {
    const unit = await masterDataService.updateUnit(req.params.id, req.body, req.user.id);
    res.json({ message: 'Unit berhasil diperbarui', data: unit });
  } catch (err) {
    next(err);
  }
};

// Reference Data
const getReferenceData = async (req, res, next) => {
  try {
    const data = await masterDataService.getReferenceData();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const result = await masterDataService.deleteItem(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteCoa = async (req, res, next) => {
  try {
    const result = await masterDataService.deleteCoa(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteUnit = async (req, res, next) => {
  try {
    const result = await masterDataService.deleteUnit(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getItems,
  getItemDetail,
  createItem,
  updateItem,
  updateItemPrices,
  updateItemStatus,
  deleteItem,
  getItemPriceHistory,
  getQualityReport,
  getCoas,
  getCoaDetail,
  createCoa,
  updateCoa,
  deleteCoa,
  getCoaGroups,
  getInvestmentCategories,
  updateInvestmentCategory,
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getReferenceData,
};

