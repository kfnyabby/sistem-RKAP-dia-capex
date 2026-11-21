import api from './axios';

export const submissionAccessApi = {
  // Ambil status akses efektif dokumen
  getDocAccess: async (docId) => {
    const res = await api.get(`/budget-docs/${docId}/access`);
    return res.data;
  },

  // Akuntansi: Update deadline periode
  updateDeadlines: async (periodId, deadlines) => {
    const res = await api.put(`/periods/${periodId}/deadlines`, deadlines);
    return res.data;
  },

  // Akuntansi: Buka/Tutup pengajuan periode
  togglePeriodSubmission: async (periodId, state, reason) => {
    const res = await api.post(`/periods/${periodId}/toggle-submission`, { state, reason });
    return res.data;
  },

  // Papan status unit per periode
  getUnitAccessList: async (periodId) => {
    const res = await api.get(`/periods/${periodId}/unit-access`);
    return res.data;
  },

  // Akuntansi: Override buka/tutup unit
  overrideUnitAccess: async (data) => {
    const res = await api.post('/submission-access', data);
    return res.data;
  },

  // Akuntansi: Override massal buka/tutup unit
  bulkOverrideUnitAccess: async (data) => {
    const res = await api.post('/submission-access/bulk', data);
    return res.data;
  },
};

export default submissionAccessApi;
