const dashboardRepository = require('../repositories/dashboard.repository');
const periodRepository = require('../repositories/period.repository');
const settingRepository = require('../repositories/setting.repository');
const userRepository = require('../repositories/user.repository');

/**
 * Service Dashboard Monitoring (Fase 7)
 */

/**
 * Helper untuk menentukan period, company, dan tahun
 */
async function resolvePeriodContext(companyId, periodId) {
  let period = null;
  if (periodId) {
    period = await periodRepository.findById(parseInt(periodId, 10));
  } else if (companyId) {
    const periods = await periodRepository.findAll({ company_id: parseInt(companyId, 10) });
    if (periods && periods.length > 0) {
      period = periods[0];
    }
  } else {
    const periods = await periodRepository.findAll({});
    if (periods && periods.length > 0) {
      period = periods[0];
    }
  }

  const resolvedCompanyId = companyId ? parseInt(companyId, 10) : period ? period.company_id : 1;
  const resolvedPeriodId = period ? period.id : periodId ? parseInt(periodId, 10) : 1;
  const resolvedYear = period ? period.year : 2027;

  return {
    period,
    companyId: resolvedCompanyId,
    periodId: resolvedPeriodId,
    year: resolvedYear,
  };
}

/**
 * Helper otorisasi unit fail-closed
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

/**
 * 1. GET /api/dashboard/summary
 */
const getSummary = async (query = {}, user = null) => {
  const { companyId, periodId, year } = await resolvePeriodContext(query.company_id, query.period_id);
  const accessibleUnitIds = await resolveAccessibleUnitIds(user);

  // Ambil konfigurasi dinamis dari tabel settings
  const [warningPercent, criticalPercent, assetCoas] = await Promise.all([
    settingRepository.getSetting('warning_percent', 80),
    settingRepository.getSetting('critical_percent', 100),
    settingRepository.getSetting('investment_asset_coas', ['1.2.1.1.4', '1.2.1.1.6']),
  ]);

  const summary = await dashboardRepository.getSummary(
    companyId,
    periodId,
    year,
    accessibleUnitIds,
    Array.isArray(assetCoas) ? assetCoas : ['1.2.1.1.4', '1.2.1.1.6']
  );

  return {
    company_id: companyId,
    period_id: periodId,
    period_year: year,
    rkap_biaya: summary.rkap_biaya !== null ? Number(summary.rkap_biaya) : null,
    rkap_investasi: summary.rkap_investasi !== null ? Number(summary.rkap_investasi) : null,
    realisasi_biaya: summary.realisasi_biaya !== null ? Number(summary.realisasi_biaya) : null,
    usage_biaya_percent: summary.usage_biaya_percent,
    realisasi_investasi: summary.realisasi_investasi !== null ? Number(summary.realisasi_investasi) : null,
    usage_investasi_percent: summary.usage_investasi_percent,
    threshold: {
      warning: Number(warningPercent) || 80,
      critical: Number(criticalPercent) || 100,
    },
  };
};

/**
 * 2. GET /api/dashboard/progress
 */
const getProgress = async (query = {}, user = null) => {
  const { companyId, periodId } = await resolvePeriodContext(query.company_id, query.period_id);
  const accessibleUnitIds = await resolveAccessibleUnitIds(user);

  const docType = query.type ? String(query.type).toUpperCase() : null;

  const progress = await dashboardRepository.getProgress(
    companyId,
    periodId,
    accessibleUnitIds,
    docType
  );

  return {
    company_id: companyId,
    period_id: periodId,
    draft: Number(progress.draft) || 0,
    diajukan: Number(progress.diajukan) || 0,
    disetujui: Number(progress.disetujui) || 0,
    dikembalikan: Number(progress.dikembalikan) || 0,
    final: Number(progress.final) || 0,
    not_started: Number(progress.not_started) || 0,
    late_units: Array.isArray(progress.late_units) ? progress.late_units : [],
  };
};

/**
 * 3. GET /api/dashboard/budget-vs-realization
 */
const getBudgetVsRealization = async (query = {}, user = null) => {
  const { companyId, periodId, year } = await resolvePeriodContext(query.company_id, query.period_id);
  const accessibleUnitIds = await resolveAccessibleUnitIds(user);

  const [warningPercent, criticalPercent, assetCoas] = await Promise.all([
    settingRepository.getSetting('warning_percent', 80),
    settingRepository.getSetting('critical_percent', 100),
    settingRepository.getSetting('investment_asset_coas', ['1.2.1.1.4', '1.2.1.1.6']),
  ]);

  const groupBy = (query.group_by || 'coa').toLowerCase();
  const filters = {
    unit_id: query.unit_id ? parseInt(query.unit_id, 10) : null,
    coa_id: query.coa_id ? parseInt(query.coa_id, 10) : null,
    item_id: query.item_id ? parseInt(query.item_id, 10) : null,
  };

  const rows = await dashboardRepository.getBudgetVsRealization(
    companyId,
    periodId,
    year,
    groupBy,
    filters,
    accessibleUnitIds,
    Array.isArray(assetCoas) ? assetCoas : ['1.2.1.1.4', '1.2.1.1.6'],
    Number(warningPercent) || 80,
    Number(criticalPercent) || 100
  );

  return rows.map((r) => ({
    ...r,
    rkap: r.rkap !== null ? Number(r.rkap) : null,
    realisasi: r.realisasi !== null ? Number(r.realisasi) : null,
  }));
};

module.exports = {
  getSummary,
  getProgress,
  getBudgetVsRealization,
};
