const db = require('../backend/db');
async function check() {
  const p = await db.query("SELECT * FROM periods");
  console.log('Periods:', p.rows);
  const docs = await db.query("SELECT bd.id, bd.period_id, bd.unit_id, u.code, u.name as unit_name, bd.type, bd.status, bd.total_amount FROM budget_docs bd JOIN units u ON bd.unit_id = u.id");
  console.log('Docs in DB:', docs.rows);
  await db.pool.end();
}
check();
