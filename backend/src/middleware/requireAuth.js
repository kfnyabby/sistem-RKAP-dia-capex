const userRepository = require('../repositories/user.repository');

const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthenticated' });
  }

  try {
    const user = await userRepository.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    if (!user.is_active) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: 'Akun dinonaktifkan' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireAuth;

