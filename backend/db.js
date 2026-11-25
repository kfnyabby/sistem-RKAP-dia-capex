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

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: sslOption,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      ssl: sslOption,
      connectionTimeoutMillis: 5000,
    };

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
