const submissionAccessService = require('../services/submissionAccess.service');
const budgetDocRepository = require('../repositories/budgetDoc.repository');

const getDocAccess = async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const doc = await budgetDocRepository.findRawById(docId);
    if (!doc) {
      const err = new Error('Dokumen anggaran tidak ditemukan');
      err.status = 404;
      throw err;
    }

    const access = await submissionAccessService.getEffectiveAccess(
      doc.period_id,
      doc.unit_id,
      doc.type
    );

    res.json({
      success: true,
      doc_id: docId,
      doc_status: doc.status,
      ...access,
    });
  } catch (err) {
    next(err);
  }
};

const updateDeadlines = async (req, res, next) => {
  try {
    const periodId = parseInt(req.params.id, 10);
    const updated = await submissionAccessService.setPeriodDeadlines(
      periodId,
      req.body,
      req.user
    );
    res.json({
      success: true,
      message: 'Deadline periode berhasil diperbarui',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const toggleSubmission = async (req, res, next) => {
  try {
    const periodId = parseInt(req.params.id, 10);
    const { state, reason } = req.body;
    const updated = await submissionAccessService.togglePeriodSubmission(
      periodId,
      { state, reason },
      req.user
    );
    res.json({
      success: true,
      message: `Pengajuan periode berhasil diubah menjadi ${state}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const getUnitAccess = async (req, res, next) => {
  try {
    const periodId = parseInt(req.params.id, 10);
    const list = await submissionAccessService.getPeriodUnitAccess(periodId);
    res.json({
      success: true,
      period_id: periodId,
      data: list,
    });
  } catch (err) {
    next(err);
  }
};

const overrideUnit = async (req, res, next) => {
  try {
    const saved = await submissionAccessService.overrideUnitAccess(req.body, req.user);
    res.json({
      success: true,
      message: 'Status akses pengajuan unit berhasil diperbarui',
      data: saved,
    });
  } catch (err) {
    next(err);
  }
};

const bulkOverride = async (req, res, next) => {
  try {
    const { period_id, unit_ids, doc_type, state, deadline_override, reason } = req.body;
    if (!Array.isArray(unit_ids) || unit_ids.length === 0) {
      const err = new Error('Daftar unit_ids wajib berupa array tidak kosong');
      err.status = 422;
      throw err;
    }

    const results = [];
    for (const unitId of unit_ids) {
      const saved = await submissionAccessService.overrideUnitAccess(
        {
          period_id,
          unit_id: unitId,
          doc_type: doc_type || 'SEMUA',
          state: state || 'BUKA',
          deadline_override,
          reason,
        },
        req.user
      );
      results.push(saved);
    }

    res.json({
      success: true,
      message: `Berhasil memperbarui akses untuk ${results.length} unit`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDocAccess,
  updateDeadlines,
  toggleSubmission,
  getUnitAccess,
  overrideUnit,
  bulkOverride,
};
