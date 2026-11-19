const db = require('../backend/db');
async function check() {
  const cnh = await db.query("SELECT id FROM companies WHERE code = 'CNH'");
  const cnhId = cnh.rows[0].id;
  const docs = await db.query("SELECT bd.id, bd.unit_id, u.name as unit_name, bd.type, bd.total_amount, p.year FROM budget_docs bd JOIN units u ON bd.unit_id = u.id JOIN periods p ON bd.period_id = p.id WHERE u.company_id = $1", [cnhId]);
  console.log('CNH docs:', docs.rows);
  const p = await db.query("SELECT * FROM periods WHERE company_id = $1", [cnhId]);
  console.log('CNH periods:', p.rows);
  await db.pool.end();
}
check();
