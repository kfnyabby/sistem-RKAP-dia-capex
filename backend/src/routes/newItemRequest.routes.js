const express = require('express');
const newItemRequestController = require('../controllers/newItemRequest.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// 1. Antrean khusus Akuntansi (harus sebelum rute dengan parameter :id)
router.get(
  '/new-item-requests/queue',
  requireRole(['akuntansi']),
  newItemRequestController.getAccountingQueue
);

// 2. Aksi penentuan COA khusus Akuntansi (BR-18)
router.post(
  '/new-item-requests/:id/assign-coa',
  requireRole(['akuntansi']),
  newItemRequestController.assignCoa
);

// 3. Modifikasi & hapus permintaan per ID (hanya saat DRAFT)
router.put('/new-item-requests/:id', newItemRequestController.updateDraftRequest);
router.delete('/new-item-requests/:id', newItemRequestController.deleteDraftRequest);

// 4. Pengelolaan permintaan barang baru berbasis dokumen anggaran
router.get('/budget-docs/:id/new-item-requests', newItemRequestController.getRequestsByDocId);
router.post('/budget-docs/:id/new-item-requests', newItemRequestController.createDraftRequest);
router.post('/budget-docs/:id/new-item-requests/send', newItemRequestController.sendRequests);

module.exports = router;
