import api from './axios';

export const investmentApi = {
  // Ambil baris investasi pada suatu dokumen anggaran
  getInvestmentLines: async (docId, params = {}) => {
    const res = await api.get(`/budget-docs/${docId}/investment-lines`, { params });
    return res.data;
  },

  // Tambah baris investasi baru (status DRAFT)
  createInvestmentLine: async (docId, data) => {
    const res = await api.post(`/budget-docs/${docId}/investment-lines`, data);
    return res.data;
  },

  // Update baris investasi (status DRAFT, mendukung nomor versi)
  updateInvestmentLine: async (id, data) => {
    const res = await api.put(`/investment-lines/${id}`, data);
    return res.data;
  },

  // Hapus baris investasi
  deleteInvestmentLine: async (id) => {
    const res = await api.delete(`/investment-lines/${id}`);
    return res.data;
  },

  // Ambil saran teks riwayat unit
  getSuggestions: async (docId, field) => {
    const res = await api.get(`/budget-docs/${docId}/investment-lines/suggestions`, {
      params: { field },
    });
    return res.data;
  },

  // Salin 4 isian teks dari baris investasi terakhir
  getLastLineText: async (docId) => {
    const res = await api.get(`/budget-docs/${docId}/investment-lines/last-text`);
    return res.data;
  },

  // Tampilan lintas unit Laptop & PC (khusus Akuntansi & Manager)
  listCrossUnitLines: async (params = {}) => {
    const res = await api.get('/investment-lines', { params });
    return res.data;
  },

  // Referensi Kategori Investasi
  getInvestmentCategories: async () => {
    const res = await api.get('/investment-categories');
    return res.data;
  },

  // Referensi Prioritas
  getPriorities: async () => {
    const res = await api.get('/priorities');
    return res.data;
  },
};

export default investmentApi;
