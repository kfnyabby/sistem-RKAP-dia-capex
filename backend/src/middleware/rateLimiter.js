const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter Khusus Percobaan Login (Brute-force protection)
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimum 5 percobaan gagal per 15 menit
  skipSuccessfulRequests: true, // Login berhasil tidak dihitung limit
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Silakan coba lagi beberapa saat lagi.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Global Rate Limiter untuk seluruh endpoint /api
 * Mencegah serangan DoS / abuse flooding request
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: process.env.NODE_ENV === 'test' ? 10000 : 300, // 300 request / menit per IP (longgar di unit test)
  message: {
    success: false,
    message: 'Terlalu banyak permintaan dari alamat IP ini. Silakan coba beberapa saat lagi.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginRateLimiter,
  globalRateLimiter,
};
