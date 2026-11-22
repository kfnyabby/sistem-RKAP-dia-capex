import api from './axios';

export const reportApi = {
  // 1. Rekapitulasi Anggaran Biaya per COA
  getExpenseByCoa: async (params = {}) => {
    const res = await api.get('/reports/expense-by-coa', { params });
    return res.data;
  },

  // 2. Ringkasan Anggaran Investasi (group_by: 'category' | 'month')
  getInvestmentSummary: async (params = {}) => {
    const res = await api.get('/reports/investment-summary', { params });
    return res.data;
  },

  // 3. Laporan Rekap Gabungan CN & CNH (Hierarkis Perusahaan -> Unit -> Lines)
  getConsolidated: async (params = {}) => {
    const res = await api.get('/reports/consolidated', { params });
    return res.data;
  },

  // 4. Laporan Matriks Unit x COA (Format ERP)
  getMatrix: async (params = {}) => {
    const res = await api.get('/reports/matrix', { params });
    return res.data;
  },

  // 5. Ekspor Excel (.xlsx)
  exportExcel: async (reportType, params = {}) => {
    const res = await api.get('/reports/export', {
      params: {
        report: reportType,
        format: 'xlsx',
        ...params,
      },
      responseType: 'blob',
    });
    return res;
  },
};

export default reportApi;
