import api from './axios';

export const auditApi = {
  // 1. Ambil Jejak Rekam Mutasi Data & Perubahan Status (dengan filter & paginasi server)
  getAuditLogs: async (params = {}) => {
    const res = await api.get('/audit-logs', { params });
    return res.data;
  },
};

export default auditApi;
