const healthService = require('../services/health.service');

const getHealth = (req, res) => {
  const data = healthService.checkHealth();
  res.json(data);
};

const getTestDb = async (req, res) => {
  try {
    const data = await healthService.testDatabaseConnection();
    res.json(data);
  } catch (error) {
    console.error('Database connection error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
};

module.exports = {
  getHealth,
  getTestDb,
};
