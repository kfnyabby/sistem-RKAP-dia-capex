const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated',
        code: 'UNAUTHENTICATED',
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = (req.user.role || '').toLowerCase();

    const isAllowed = roles.map((r) => r.toLowerCase()).includes(userRole);
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Anda tidak memiliki akses untuk aksi ini',
        code: 'FORBIDDEN_ROLE',
      });
    }

    next();
  };
};

module.exports = requireRole;
