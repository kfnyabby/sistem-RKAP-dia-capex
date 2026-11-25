import api from './axios';

export const masterApi = {
  // --- ITEMS ---
  getItems: async (params = {}) => {
    const res = await api.get('/items', { params });
    return res.data;
  },

  getItemDetail: async (id) => {
    const res = await api.get(`/items/${id}`);
    return res.data;
  },

  createItem: async (data) => {
    const res = await api.post('/items', data);
    return res.data;
  },

  updateItem: async (id, data) => {
    const res = await api.put(`/items/${id}`, data);
    return res.data;
  },

  deleteItem: async (id) => {
    const res = await api.delete(`/items/${id}`);
    return res.data;
  },

  updateItemStatus: async (id, is_active) => {
    const res = await api.patch(`/items/${id}/status`, { is_active });
    return res.data;
  },

  updateItemPrices: async (id, prices) => {
    const res = await api.patch(`/items/${id}/prices`, { prices });
    return res.data;
  },

  getQualityReport: async () => {
    const res = await api.get('/items/quality-report');
    return res.data;
  },

  importItems: async (file, dry_run = false, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dry_run', dry_run);
    if (options.company_code) formData.append('company_code', options.company_code);
    if (options.update_prices !== undefined) formData.append('update_prices', options.update_prices);
    const res = await api.post(`/items/import?dry_run=${dry_run ? 'true' : 'false'}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // --- COAS & GROUPS ---
  getCoas: async (params = {}) => {
    const res = await api.get('/coas', { params });
    return res.data;
  },

  getCoaDetail: async (id) => {
    const res = await api.get(`/coas/${id}`);
    return res.data;
  },

  createCoa: async (data) => {
    const res = await api.post('/coas', data);
    return res.data;
  },

  updateCoa: async (id, data) => {
    const res = await api.put(`/coas/${id}`, data);
    return res.data;
  },

  deleteCoa: async (id) => {
    const res = await api.delete(`/coas/${id}`);
    return res.data;
  },

  getCoaGroups: async () => {
    const res = await api.get('/coa-groups');
    return res.data;
  },

  importCoas: async (file, dry_run = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dry_run', dry_run);
    const res = await api.post(`/coas/import?dry_run=${dry_run ? 'true' : 'false'}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // --- INVESTMENT CATEGORIES ---
  getInvestmentCategories: async () => {
    const res = await api.get('/investment-categories');
    return res.data;
  },

  updateInvestmentCategory: async (id, data) => {
    const res = await api.put(`/investment-categories/${id}`, data);
    return res.data;
  },

  // --- UNITS ---
  getUnits: async (params = {}) => {
    const res = await api.get('/units', { params });
    return res.data;
  },

  createUnit: async (data) => {
    const res = await api.post('/units', data);
    return res.data;
  },

  updateUnit: async (id, data) => {
    const res = await api.put(`/units/${id}`, data);
    return res.data;
  },

  deleteUnit: async (id) => {
    const res = await api.delete(`/units/${id}`);
    return res.data;
  },

  importUnits: async (file, dry_run = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dry_run', dry_run);
    const res = await api.post(`/units/import?dry_run=${dry_run ? 'true' : 'false'}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // --- REFERENCE DATA ---
  getReferenceData: async () => {
    const res = await api.get('/reference-data');
    return res.data;
  },

  // --- ITEM PRICE HISTORY ---
  getItemPriceHistory: async (id, params = {}) => {
    const res = await api.get(`/items/${id}/price-history`, { params });
    return res.data;
  },

  // --- ITEM AUDIT LOGS / PRICE HISTORY ---
  getItemPriceAuditLogs: async () => {
    const res = await api.get('/audit-logs', {
      params: {
        entity: 'items',
        action: 'update_item_prices',
        limit: 50,
      },
    });
    return res.data;
  },

  // --- DOWNLOAD IMPORT TEMPLATES ---
  downloadTemplate: async (type) => {
    const res = await api.get('/master/templates', {
      params: { type },
      responseType: 'blob',
    });
    return res;
  },
};

export default masterApi;

