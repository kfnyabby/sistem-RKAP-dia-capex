import api from './axios';

export const budgetApi = {
  // --- PERIODE ---
  getPeriods: async (params = {}) => {
    const res = await api.get('/periods', { params });
    return res.data;
  },

  createPeriod: async (data) => {
    const res = await api.post('/periods', data);
    return res.data;
  },

  // --- DOKUMEN ANGGARAN ---
  getBudgetDocs: async (params = {}) => {
    const res = await api.get('/budget-docs', { params });
    return res.data;
  },

  createBudgetDoc: async (data) => {
    const res = await api.post('/budget-docs', data);
    return res.data;
  },

  getBudgetDocById: async (id) => {
    const res = await api.get(`/budget-docs/${id}`);
    return res.data;
  },

  // --- BARIS BIAYA ---
  getExpenseLines: async (docId, params = {}) => {
    const res = await api.get(`/budget-docs/${docId}/expense-lines`, { params });
    return res.data;
  },

  saveExpenseLines: async (docId, lines) => {
    const res = await api.put(`/budget-docs/${docId}/expense-lines`, { lines });
    return res.data;
  },

  deleteExpenseLine: async (lineId) => {
    const res = await api.delete(`/expense-lines/${lineId}`);
    return res.data;
  },

  refreshDocPrices: async (docId) => {
    const res = await api.post(`/budget-docs/${docId}/refresh-prices`);
    return res.data;
  },

  // --- KATALOG BARANG UNTUK DOKUMEN ---
  getAvailableItems: async (docId, params = {}) => {
    const res = await api.get('/items', {
      params: {
        available_for_doc: docId,
        ...params,
      },
    });
    return res.data;
  },
};

