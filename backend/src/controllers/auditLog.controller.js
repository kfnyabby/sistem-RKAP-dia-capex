const auditLogService = require('../services/auditLog.service');

const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditLogService.getAuditLogs(req.query, req.user);
    res.json({
      success: true,
      data: result.rows,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total_count,
        total_pages: result.total_pages,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total_count: result.total_count,
        total_pages: result.total_pages,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
