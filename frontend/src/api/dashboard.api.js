import api from './axios';

export const dashboardApi = {
  // 1. Ringkasan Pagu RKAP, Realisasi Pemakaian (Biaya & Investasi), serta Ambang Settings
  getSummary: async (params = {}) => {
    const res = await api.get('/dashboard/summary', { params });
    return res.data;
  },

  // 2. Progres Pengisian Unit per Status Dokumen & Unit Melewati Deadline
  getProgress: async (params = {}) => {
    const res = await api.get('/dashboard/progress', { params });
    return res.data;
  },

  // 3. Drill-down RKAP vs Realisasi per COA / Unit / Barang
  getBudgetVsRealization: async (params = {}) => {
    const res = await api.get('/dashboard/budget-vs-realization', { params });
    return res.data;
  },
};

export default dashboardApi;
