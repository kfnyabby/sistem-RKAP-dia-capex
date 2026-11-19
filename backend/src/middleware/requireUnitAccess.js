const userRepository = require('../repositories/user.repository');

const requireUnitAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthenticated',
      code: 'UNAUTHENTICATED',
    });
  }

  // Akuntansi memiliki akses penuh ke seluruh unit di CN dan CNH
  if (req.user.role === 'akuntansi') {
    return next();
  }

  const rawUnitId = req.params.unit_id || req.query.unit_id || req.body?.unit_id;
  if (!rawUnitId) {
    // Fail-closed: Jika endpoint memproteksi data unit tetapi unit tidak dapat ditentukan, tolak 403
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: unit target tidak dapat ditentukan',
      code: 'UNIT_REQUIRED',
    });
  }

  const targetUnitId = parseInt(rawUnitId, 10);
  if (isNaN(targetUnitId)) {
    return res.status(400).json({
      success: false,
      message: 'Parameter unit_id tidak valid',
      code: 'INVALID_UNIT_PARAMETER',
    });
  }

  try {
    const userUnits = await userRepository.getUserUnits(req.user.id);
    const hasAccess = userUnits.some((u) => u.unit_id === targetUnitId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Akses unit ditolak: Anda tidak memiliki wewenang untuk unit ini',
        code: 'UNIT_ACCESS_DENIED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireUnitAccess;

