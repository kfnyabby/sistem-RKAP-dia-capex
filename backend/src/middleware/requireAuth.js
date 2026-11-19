const userRepository = require('../repositories/user.repository');

const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthenticated',
      code: 'UNAUTHENTICATED',
    });
  }

  try {
    const user = await userRepository.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated',
        code: 'UNAUTHENTICATED',
      });
    }

    if (!user.is_active) {
      req.session.destroy(() => {});
      return res.status(403).json({
        success: false,
        message: 'Akun dinonaktifkan',
        code: 'ACCOUNT_DISABLED',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireAuth;

