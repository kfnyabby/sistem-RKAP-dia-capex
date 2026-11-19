const journalLineRepository = require('../repositories/journalLine.repository');
const settingRepository = require('../repositories/setting.repository');
const userRepository = require('../repositories/user.repository');

const getAccessibleUnitIds = async (user) => {
  if (!user) return [];
  if (user.role === 'akuntansi') {
    return null; // Akuntansi dapat mengakses semua unit
  }
  const units = await userRepository.getUserUnits(user.id);
  return units.map((u) => u.unit_id);
};

const getRealizations = async (filters, user) => {
  const accessibleUnitIds = await getAccessibleUnitIds(user);

  // Ambil daftar akun aset tetap dari tabel settings
  const assetCoasSetting = await settingRepository.getSetting(
    'investment_asset_coas',
    ['1.2.1.1.4', '1.2.1.1.6']
  );
  const investmentAssetCoas = Array.isArray(assetCoasSetting)
    ? assetCoasSetting
    : ['1.2.1.1.4', '1.2.1.1.6'];

  const results = await journalLineRepository.getRealizationsAggregation(
    filters,
    accessibleUnitIds,
    investmentAssetCoas
  );

  return results;
};

module.exports = {
  getAccessibleUnitIds,
  getRealizations,
};
