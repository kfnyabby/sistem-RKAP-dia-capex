const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');
const { generateCsrfToken } = require('../middleware/csrfProtection');
const { loginSchema, changePasswordSchema } = require('../validators/auth.validator');

const getCsrf = (req, res) => {
  const token = generateCsrfToken(req);
  res.json({ csrf_token: token });
};

const login = async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(422).json({
        message: 'Validasi input gagal',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parseResult.data;
    const userProfile = await authService.login(email, password);

    // Regenerasi sesi untuk mencegah session fixation dan buat CSRF token baru
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      req.session.userId = userProfile.user_id;
      req.session.role = userProfile.role;
      const newCsrfToken = generateCsrfToken(req, true);

      res.setHeader('X-CSRF-Token', newCsrfToken);
      res.json({
        user: userProfile,
        csrf_token: newCsrfToken,
      });
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      await auditService.log(req.session.userId, 'users', req.session.userId, 'logout');
    }

    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(422).json({
        message: 'Validasi password gagal',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const { current_password, new_password } = parseResult.data;
    const result = await authService.changePassword(
      req.user.id,
      current_password,
      new_password,
      req.sessionID
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCsrf,
  login,
  logout,
  getMe,
  updatePassword,
};

