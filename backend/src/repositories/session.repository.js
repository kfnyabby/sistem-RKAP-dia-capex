const db = require('../../db');

const revokeOtherUserSessions = async (userId, currentSid = null, client = db) => {
  if (currentSid) {
    const res = await client.query(
      `DELETE FROM "session"
       WHERE (sess::jsonb->>'userId')::int = $1 AND sid != $2`,
      [userId, currentSid]
    );
    return res.rowCount;
  } else {
    const res = await client.query(
      `DELETE FROM "session"
       WHERE (sess::jsonb->>'userId')::int = $1`,
      [userId]
    );
    return res.rowCount;
  }
};

const countUserSessions = async (userId, client = db) => {
  const res = await client.query(
    `SELECT COUNT(*) as count FROM "session"
     WHERE (sess::jsonb->>'userId')::int = $1 AND expire > NOW()`,
    [userId]
  );
  return parseInt(res.rows[0].count, 10);
};

module.exports = {
  revokeOtherUserSessions,
  countUserSessions,
};

