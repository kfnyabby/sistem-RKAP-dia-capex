const express = require('express');
const investmentController = require('../controllers/investment.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

// 1. Tampilan lintas unit Laptop & PC (khusus Akuntansi & Manager)
router.get('/investment-lines', investmentController.listCrossUnitLines);

// 1b. Referensi Prioritas Investasi
router.get('/priorities', investmentController.getPriorities);

// 2. Modifikasi & hapus per ID baris investasi (status DRAFT)
router.put('/investment-lines/:id', investmentController.updateInvestmentLine);
router.delete('/investment-lines/:id', investmentController.deleteInvestmentLine);

// 3. Saran isian dan salin baris teks sebelumnya
router.get('/budget-docs/:id/investment-lines/suggestions', investmentController.getSuggestions);
router.get('/budget-docs/:id/investment-lines/last-text', investmentController.getLastLineText);

// 4. Daftar & tambah baris investasi pada dokumen anggaran
router.get('/budget-docs/:id/investment-lines', investmentController.getInvestmentLines);
router.post('/budget-docs/:id/investment-lines', investmentController.createInvestmentLine);

module.exports = router;
