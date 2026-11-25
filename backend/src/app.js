const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const db = require('../db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { csrfProtection } = require('./middleware/csrfProtection');
const { globalRateLimiter } = require('./middleware/rateLimiter');

// Validasi variabel lingkungan sesi dengan fallback aman untuk serverless/cloud
const sessionSecret =
  process.env.SESSION_SECRET ||
  'rkap_session_fallback_secret_key_cipta_nirmala_production_2026';

if (!process.env.SESSION_SECRET) {
  console.warn(
    '[CONFIG WARNING] Variabel lingkungan SESSION_SECRET belum disetel. Menggunakan fallback kunci sesi bawaan.'
  );
}

const app = express();

// Trust proxy if behind reverse proxy
app.set('trust proxy', 1);

// Security Headers HTTP via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Menghindari bentrok CSP pada aset SPA frontend/dev
    crossOriginEmbedderPolicy: false,
  })
);

// Middleware CORS Dinamis dari Variabel Lingkungan
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : defaultOrigins;
const isVercel = Boolean(process.env.VERCEL);

// Helper untuk mendeteksi origin jaringan lokal / LAN (WiFi / Ethernet)
const isLocalOrLanOrigin = (origin) => {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti Supertest, curl, server-to-server), origin di whitelist, domain vercel, atau IP LAN lokal
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (isVercel && origin.endsWith('.vercel.app')) ||
        isLocalOrLanOrigin(origin)
      ) {
        return callback(null, true);
      }
      const err = new Error(`Akses diblokir oleh kebijakan CORS untuk origin: ${origin}`);
      err.status = 403;
      err.code = 'CORS_NOT_ALLOWED';
      return callback(err);
    },
    credentials: true,
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting untuk semua rute /api
app.use('/api', globalRateLimiter);

// Session Store PostgreSQL
app.use(
  session({
    store: new pgSession({
      pool: db.pool,
      tableName: 'session',
      createTableIfMissing: false,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 jam
    },
  })
);

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'API RKAP Server is running' });
});

// Proteksi CSRF untuk semua rute /api
app.use('/api', csrfProtection);

// API Routes
app.use('/api', routes);

// Error Handling Terpusat
app.use(errorHandler);

module.exports = app;
