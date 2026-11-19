const workflowService = require('../services/workflow.service');

const submitDoc = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const updated = await workflowService.submitDoc(docId, req.user);
    res.json({
      success: true,
      message: 'Dokumen anggaran berhasil diajukan untuk validasi',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const approveDoc = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const updated = await workflowService.approveDoc(docId, req.user);
    res.json({
      success: true,
      message: 'Dokumen anggaran berhasil disetujui',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const returnDoc = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { note } = req.body;
    const updated = await workflowService.returnDoc(docId, { note }, req.user);
    res.json({
      success: true,
      message: 'Dokumen anggaran berhasil dikembalikan dengan catatan perbaikan',
      auto_reopened: updated.auto_reopened,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const finalizeDoc = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const updated = await workflowService.finalizeDoc(docId, req.user);
    res.json({
      success: true,
      message: 'Dokumen anggaran berhasil difinalisasi dan terkunci',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const finalizeBulk = async (req, res, next) => {
  try {
    const { doc_ids } = req.body;
    const result = await workflowService.finalizeBulk(doc_ids, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const reopenDoc = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const updated = await workflowService.reopenDoc(docId, { reason }, req.user);
    res.json({
      success: true,
      message: 'Dokumen anggaran berhasil dibuka kembali menjadi DRAFT',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const getDocHistory = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const result = await workflowService.getDocHistory(docId, req.user);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getReviewQueue = async (req, res, next) => {
  try {
    const result = await workflowService.getReviewQueue(req.query, req.user);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const addLineComment = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { lineType, lineId } = req.params;
    const { text } = req.body;

    const saved = await workflowService.addLineComment(
      docId,
      {
        line_type: lineType,
        line_id: parseInt(lineId, 10),
        text,
      },
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Komentar berhasil ditambahkan',
      data: saved,
    });
  } catch (err) {
    next(err);
  }
};

const getLineComments = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const { lineType, lineId } = req.params;

    const list = await workflowService.getLineComments(
      docId,
      lineType,
      parseInt(lineId, 10),
      req.user
    );

    res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
};

const deleteLineComment = async (req, res, next) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const result = await workflowService.deleteLineComment(commentId, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitDoc,
  approveDoc,
  returnDoc,
  finalizeDoc,
  finalizeBulk,
  reopenDoc,
  getDocHistory,
  getReviewQueue,
  addLineComment,
  getLineComments,
  deleteLineComment,
};
