const userRepository = require('../repositories/user.repository');

const requireUnitAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  // Akuntansi memiliki akses penuh ke seluruh unit di CN dan CNH
  if (req.user.role === 'akuntansi') {
    return next();
  }

  const rawUnitId = req.params.unit_id || req.query.unit_id || req.body?.unit_id;
  if (!rawUnitId) {
    // Jika endpoint tidak menargetkan unit tertentu, lanjutkan
    return next();
  }

  const targetUnitId = parseInt(rawUnitId, 10);
  if (isNaN(targetUnitId)) {
    return res.status(400).json({ message: 'Parameter unit_id tidak valid' });
  }

  try {
    const userUnits = await userRepository.getUserUnits(req.user.id);
    const hasAccess = userUnits.some((u) => u.unit_id === targetUnitId);

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Akses unit ditolak: Anda tidak memiliki wewenang untuk unit ini',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireUnitAccess;

