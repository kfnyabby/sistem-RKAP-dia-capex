const reportRepository = require('../repositories/report.repository');
const userRepository = require('../repositories/user.repository');

/**
 * Service Laporan Anggaran & Konsolidasi (Fase 7)
 */

async function resolveAccessibleUnitIds(user) {
  if (!user) return [];
  if (user.role === 'akuntansi') return null; // Akses penuh
  if (Array.isArray(user.unit_ids)) return user.unit_ids;
  if (Array.isArray(user.units)) return user.units.map((u) => u.id || u.unit_id);
  if (user.id) {
    const userUnits = await userRepository.getUserUnits(user.id);
    return userUnits.map((u) => u.unit_id);
  }
  return [];
}

function parseIdsArray(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val.map((v) => parseInt(v, 10)).filter(Boolean);
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((v) => parseInt(v.trim(), 10))
      .filter(Boolean);
  }
  return [parseInt(val, 10)].filter(Boolean);
}

/**
 * 1. GET /api/reports/expense-by-coa
 */
const getExpenseByCoa = async (query = {}, user = null) => {
  const accessibleUnitIds = await resolveAccessibleUnitIds(user);
  const rows = await reportRepository.getExpenseByCoa(query, accessibleUnitIds);

  return rows.map((r) => ({
    coa_id: r.coa_id,
    coa_code: r.coa_code,
    coa_name: r.coa_name,
    group_id: r.group_id,
    group_name: r.group_name,
    amount: r.amount !== null ? Number(r.amount) : null,
    line_count: Number(r.line_count) || 0,
  }));
};

/**
 * 2. GET /api/reports/investment-summary
 */
const getInvestmentSummary = async (query = {}, user = null) => {
  const accessibleUnitIds = await resolveAccessibleUnitIds(user);
  const rows = await reportRepository.getInvestmentSummary(query, accessibleUnitIds);

  return rows.map((r) => ({
    ...r,
    count: Number(r.count) || 0,
    amount: r.amount !== null ? Number(r.amount) : null,
    depreciation_amount: r.depreciation_amount !== null ? Number(r.depreciation_amount) : null,
  }));
};

/**
 * 3. GET /api/reports/consolidated
 */
const getConsolidated = async (query = {}, user = null) => {
  const accessibleUnitIds = await resolveAccessibleUnitIds(user);
  const periodYear = query.period_year ? parseInt(query.period_year, 10) : 2027;
  const companyIds = parseIdsArray(query.company_ids);
  const type = query.type ? String(query.type).toUpperCase() : 'ALL';
  const targetUnitId = query.unit_id ? parseInt(query.unit_id, 10) : null;

  const result = await reportRepository.getConsolidatedReport(
    periodYear,
    companyIds,
    type,
    targetUnitId,
    accessibleUnitIds
  );

  return result;
};

/**
 * 4. GET /api/reports/matrix
 */
const getMatrix = async (query = {}, user = null) => {
  const accessibleUnitIds = await resolveAccessibleUnitIds(user);
  const periodYear = query.period_year ? parseInt(query.period_year, 10) : 2027;
  const companyIds = parseIdsArray(query.company_ids);
  const groupIds = parseIdsArray(query.group_ids);

  // Default hide_empty = true sesuai aturan pengguna
  const hideEmpty = query.hide_empty !== 'false' && query.hide_empty !== false;

  const result = await reportRepository.getMatrixReport(
    periodYear,
    companyIds,
    groupIds,
    hideEmpty,
    accessibleUnitIds
  );

  return result;
};

module.exports = {
  getExpenseByCoa,
  getInvestmentSummary,
  getConsolidated,
  getMatrix,
};
