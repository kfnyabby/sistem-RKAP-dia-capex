const express = require('express');
const workflowController = require('../controllers/workflow.controller');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// 1. Antrean Validasi (PIC baca-saja unit terkait, Manager & Akuntansi)
router.get(
  '/budget-docs/review-queue',
  requireRole(['pic', 'manager', 'akuntansi']),
  workflowController.getReviewQueue
);

// 2. Finalisasi Massal (Akuntansi)
router.post(
  '/budget-docs/finalize-bulk',
  requireRole(['akuntansi']),
  workflowController.finalizeBulk
);

// 3. Workflow Actions per Dokumen
router.post('/budget-docs/:id/submit', workflowController.submitDoc);
router.post('/budget-docs/:id/approve', requireRole(['manager', 'akuntansi']), workflowController.approveDoc);
router.post('/budget-docs/:id/return', requireRole(['manager', 'akuntansi']), workflowController.returnDoc);
router.post('/budget-docs/:id/finalize', requireRole(['akuntansi']), workflowController.finalizeDoc);
router.post('/budget-docs/:id/reopen', requireRole(['akuntansi']), workflowController.reopenDoc);

// 4. Riwayat Status Dokumen
router.get('/budget-docs/:id/history', workflowController.getDocHistory);

// 5. Komentar Validator per Baris
router.get('/budget-docs/:id/lines/:lineType/:lineId/comments', workflowController.getLineComments);
router.post('/budget-docs/:id/lines/:lineType/:lineId/comments', workflowController.addLineComment);
router.delete('/line-comments/:id', workflowController.deleteLineComment);

module.exports = router;
