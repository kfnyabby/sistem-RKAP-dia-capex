const express = require('express');
const masterController = require('../controllers/master.controller');
const importController = require('../controllers/import.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Seluruh rute master data mewajibkan autentikasi
router.use(requireAuth);

// --- TEMPLATES IMPORT MASTER DATA (Dapat diunduh oleh semua role) ---
router.get('/master/templates', importController.downloadTemplate);
router.get('/master/templates/:type', importController.downloadTemplate);

// --- ITEMS & QUALITY REPORT ---
router.get('/items/quality-report', requireRole(['akuntansi']), masterController.getQualityReport);
router.post(
  '/items/import',
  requireRole(['akuntansi']),
  importController.upload.single('file'),
  importController.importItems
);
router.get('/items', masterController.getItems);
router.post('/items', requireRole(['akuntansi']), masterController.createItem);
router.get('/items/:id', masterController.getItemDetail);
router.get('/items/:id/price-history', requireRole(['akuntansi']), masterController.getItemPriceHistory);
router.put('/items/:id', requireRole(['akuntansi']), masterController.updateItem);
router.delete('/items/:id', requireRole(['akuntansi']), masterController.deleteItem);
router.patch('/items/:id/prices', requireRole(['akuntansi']), masterController.updateItemPrices);
router.patch('/items/:id/status', requireRole(['akuntansi']), masterController.updateItemStatus);

// --- COAS & GROUPS ---
router.post(
  '/coas/import',
  requireRole(['akuntansi']),
  importController.upload.single('file'),
  importController.importCoas
);
router.get('/coas', masterController.getCoas);
router.post('/coas', requireRole(['akuntansi']), masterController.createCoa);
router.get('/coas/:id', masterController.getCoaDetail);
router.put('/coas/:id', requireRole(['akuntansi']), masterController.updateCoa);
router.delete('/coas/:id', requireRole(['akuntansi']), masterController.deleteCoa);
router.get('/coa-groups', masterController.getCoaGroups);

// --- INVESTMENT CATEGORIES ---
router.get('/investment-categories', masterController.getInvestmentCategories);
router.put(
  '/investment-categories/:id',
  requireRole(['akuntansi']),
  masterController.updateInvestmentCategory
);

// --- UNITS ---
router.post(
  '/units/import',
  requireRole(['akuntansi']),
  importController.upload.single('file'),
  importController.importUnits
);
router.get('/units', masterController.getUnits);
router.post('/units', requireRole(['akuntansi']), masterController.createUnit);
router.put('/units/:id', requireRole(['akuntansi']), masterController.updateUnit);
router.delete('/units/:id', requireRole(['akuntansi']), masterController.deleteUnit);

// --- REFERENCE DATA ---
router.get('/reference-data', masterController.getReferenceData);

module.exports = router;

