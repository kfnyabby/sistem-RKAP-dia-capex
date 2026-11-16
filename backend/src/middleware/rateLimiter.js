const rateLimit = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimum 5 percobaan gagal per 15 menit
  skipSuccessfulRequests: true, // Login berhasil tidak dihitung limit
  message: {
    message: 'Terlalu banyak percobaan login. Silakan coba lagi beberapa saat lagi.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginRateLimiter,
};

