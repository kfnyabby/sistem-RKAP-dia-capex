const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const db = require('../db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { csrfProtection } = require('./middleware/csrfProtection');

const app = express();

// Trust proxy if behind reverse proxy
app.set('trust proxy', 1);

// Middleware CORS
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store PostgreSQL
app.use(
  session({
    store: new pgSession({
      pool: db.pool,
      tableName: 'session',
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET || 'rkap-dia-capex-secret-key-2027',
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
