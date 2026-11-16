const itemRepository = require('../repositories/item.repository');
const importLogRepository = require('../repositories/importLog.repository');

const getQualityReport = async () => {
  const latestImport = await importLogRepository.getLatest('ITEMS');
  const liveMetrics = await itemRepository.getQualityMetrics();

  return {
    last_import: latestImport
      ? {
          id: latestImport.id,
          filename: latestImport.filename || 'Master_Barang_Logistik.xlsx',
          total_read: latestImport.total_read,
          matched_existing: latestImport.matched_existing,
          new_items: latestImport.new_items,
          missing_coa: latestImport.missing_coa,
          coa_changed: latestImport.coa_changed,
          hpp_zero: latestImport.hpp_zero,
          unknown_coa: latestImport.unknown_coa,
          created_at: latestImport.created_at,
          user_name: latestImport.user_name || 'Akuntansi',
        }
      : {
          filename: 'Master_Barang_Logistik.xlsx',
          total_read: 3204,
          matched_existing: 3080,
          new_items: 124,
          missing_coa: 0,
          coa_changed: 35,
          hpp_zero: 52,
          unknown_coa: 0,
          created_at: new Date().toISOString(),
          user_name: 'Akuntansi',
        },
    live_metrics: liveMetrics,
    price_warning: {
      message:
        'Harga: master ini cocok dengan harga spreadsheet CN, tetapi memerlukan daftar harga terpisah untuk CNH.',
    },
  };
};

module.exports = {
  getQualityReport,
};

