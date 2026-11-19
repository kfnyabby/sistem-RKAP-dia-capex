const newItemRequestService = require('../services/newItemRequest.service');

const getRequestsByDocId = async (req, res, next) => {
  try {
    const data = await newItemRequestService.getRequestsByDocId(req.params.id, req.user);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const createDraftRequest = async (req, res, next) => {
  try {
    const data = await newItemRequestService.createDraftRequest(
      req.params.id,
      req.body,
      req.user
    );
    res.status(201).json({
      success: true,
      message: 'Permintaan barang baru berhasil dibuat sebagai DRAFT',
      data,
    });
  } catch (err) {
    next(err);
  }
};

const updateDraftRequest = async (req, res, next) => {
  try {
    const data = await newItemRequestService.updateDraftRequest(
      req.params.id,
      req.body,
      req.user
    );
    res.json({
      success: true,
      message: 'Permintaan barang baru berhasil diperbarui',
      data,
    });
  } catch (err) {
    next(err);
  }
};

const deleteDraftRequest = async (req, res, next) => {
  try {
    const result = await newItemRequestService.deleteDraftRequest(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const sendRequests = async (req, res, next) => {
  try {
    const result = await newItemRequestService.sendRequests(
      req.params.id,
      req.body?.request_ids,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getAccountingQueue = async (req, res, next) => {
  try {
    const result = await newItemRequestService.getAccountingQueue(req.query, req.user);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const assignCoa = async (req, res, next) => {
  try {
    const result = await newItemRequestService.assignCoa(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRequestsByDocId,
  createDraftRequest,
  updateDraftRequest,
  deleteDraftRequest,
  sendRequests,
  getAccountingQueue,
  assignCoa,
};
