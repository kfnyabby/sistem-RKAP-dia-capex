const healthService = require('../services/health.service');

const getHealth = (req, res) => {
  const data = healthService.checkHealth();
  res.json(data);
};

const getTestDb = async (req, res) => {
  let dbInfo = {};
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      dbInfo = {
        source: 'DATABASE_URL',
        user: parsed.username,
        host: parsed.hostname,
        port: parsed.port || 5432,
        database: parsed.pathname.replace(/^\//, ''),
        ssl_enabled: process.env.DB_SSL !== 'false',
      };
    } catch {
      dbInfo = { source: 'DATABASE_URL (Format URL tidak valid)' };
    }
  } else {
    dbInfo = {
      source: 'Variabel DB_* terpisah',
      user: process.env.DB_USER || '(default: postgres)',
      host: process.env.DB_HOST || '(default: localhost)',
      port: process.env.DB_PORT || '(default: 5432)',
      database: process.env.DB_NAME || '(default: postgres)',
      ssl_enabled: process.env.DB_SSL === 'true' || Boolean(process.env.VERCEL),
    };
  }

  try {
    const data = await healthService.testDatabaseConnection();
    res.json({
      success: true,
      message: 'Koneksi database PostgreSQL berhasil!',
      config: dbInfo,
      server_time: data.server_time,
    });
  } catch (error) {
    console.error('Database connection error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Koneksi database gagal',
      error: error.message,
      config: dbInfo,
    });
  }
};

module.exports = {
  getHealth,
  getTestDb,
};
