const crypto = require('crypto');

const generateCsrfToken = (req) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
};

const csrfProtection = (req, res, next) => {
  // Safe HTTP methods pass through
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const tokenFromHeader = req.headers['x-csrf-token'];
  const sessionToken = req.session ? req.session.csrfToken : null;

  if (!tokenFromHeader || !sessionToken || tokenFromHeader !== sessionToken) {
    return res.status(403).json({
      message: 'Invalid or missing CSRF token',
    });
  }

  next();
};

module.exports = {
  csrfProtection,
  generateCsrfToken,
};

