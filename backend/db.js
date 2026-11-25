const { Pool } = require('pg');
require('dotenv').config();

const isRemoteDb =
  (process.env.DB_HOST && (process.env.DB_HOST.includes('supabase') || process.env.DB_HOST !== 'localhost')) ||
  (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) ||
  Boolean(process.env.VERCEL);

const sslOption =
  process.env.DB_SSL === 'false'
    ? false
    : process.env.DB_SSL === 'true' || isRemoteDb
      ? { rejectUnauthorized: false }
      : false;

let poolConfig;

if (process.env.DATABASE_URL) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    poolConfig = {
      user: decodeURIComponent(parsed.username),
      password: process.env.DB_PASSWORD || decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      database: parsed.pathname.replace(/^\//, '') || 'postgres',
      ssl: sslOption,
      max: 2,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 5000,
    };
  } catch {
    poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: sslOption,
      max: 2,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 5000,
    };
  }
} else {
  poolConfig = {
    host: process.env.DB_HOST || process.env.DB_RKAP_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || process.env.DB_RKAP_POSTGRES_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.DB_RKAP_POSTGRES_PASSWORD || 'postgres',
    database: process.env.DB_NAME || process.env.DB_RKAP_POSTGRES_DATABASE || 'postgres',
    ssl: sslOption,
    max: 2,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

if (process.env.NODE_ENV !== 'test') {
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      console.log(`[DB Config] Menggunakan DATABASE_URL: user="${parsed.username}", host="${parsed.hostname}", port=${parsed.port || 5432}, db="${parsed.pathname.replace(/^\//, '')}"`);
    } catch {
      console.log('[DB Config] Menggunakan DATABASE_URL');
    }
  } else {
    console.log(`[DB Config] Menggunakan variabel DB_*: user="${process.env.DB_USER || 'postgres'}", host="${process.env.DB_HOST || 'localhost'}", port=${process.env.DB_PORT || 5432}, db="${process.env.DB_NAME || 'postgres'}"`);
  }
}

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
