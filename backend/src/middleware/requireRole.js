const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = (req.user.role || '').toLowerCase();

    const isAllowed = roles.map((r) => r.toLowerCase()).includes(userRole);
    if (!isAllowed) {
      return res
        .status(403)
        .json({ message: 'Forbidden: Anda tidak memiliki akses untuk aksi ini' });
    }

    next();
  };
};

module.exports = requireRole;
