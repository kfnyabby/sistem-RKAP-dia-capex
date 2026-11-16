const db = require('../../db');

const getDatabaseTime = async () => {
  const result = await db.query('SELECT NOW() as current_time');
  return result.rows[0].current_time;
};

module.exports = {
  getDatabaseTime,
};
