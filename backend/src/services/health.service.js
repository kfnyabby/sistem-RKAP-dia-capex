const healthRepository = require('../repositories/health.repository');

const checkHealth = () => {
  return {
    status: 'ok',
    timestamp: new Date(),
  };
};

const testDatabaseConnection = async () => {
  const currentTime = await healthRepository.getDatabaseTime();
  return {
    success: true,
    message: 'Database connection successful!',
    server_time: currentTime,
  };
};

module.exports = {
  checkHealth,
  testDatabaseConnection,
};
