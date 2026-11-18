const express = require('express');
const budgetDocController = require('../controllers/budgetDoc.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth);

// Dokumen Anggaran
router.get('/budget-docs', budgetDocController.getDocs);
router.post('/budget-docs', budgetDocController.createDoc);
router.get('/budget-docs/:id', budgetDocController.getDocById);
router.post('/budget-docs/:id/refresh-prices', budgetDocController.refreshDocPrices);

// Baris Anggaran Biaya
router.get('/budget-docs/:id/expense-lines', budgetDocController.getExpenseLines);
router.put('/budget-docs/:id/expense-lines', budgetDocController.updateExpenseLines);
router.delete('/expense-lines/:id', budgetDocController.deleteExpenseLine);

module.exports = router;

