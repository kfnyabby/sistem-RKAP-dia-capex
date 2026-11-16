const db = require('../../db');

const getAllReferenceData = async (client = db) => {
  const companiesRes = await client.query('SELECT id, code, name FROM companies ORDER BY id ASC');
  const orgGroupsRes = await client.query(
    'SELECT id, company_id, name, type FROM org_groups ORDER BY id ASC'
  );
  const prioritiesRes = await client.query('SELECT id, name FROM priorities ORDER BY id ASC');
  const groupsRes = await client.query(
    'SELECT DISTINCT group_name FROM items WHERE group_name IS NOT NULL ORDER BY group_name ASC'
  );

  return {
    companies: companiesRes.rows,
    org_groups: orgGroupsRes.rows,
    priorities: prioritiesRes.rows,
    item_groups: groupsRes.rows.map((r) => r.group_name),
    classifications: ['Penunjang Intermediate', 'Pusat Biaya', 'Pusat Laba'],
  };
};

module.exports = {
  getAllReferenceData,
};

