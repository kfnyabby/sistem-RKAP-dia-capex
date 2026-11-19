import api from './axios';

export const workflowApi = {
  // Pengajuan Dokumen oleh PIC/Manager
  submitDoc: async (docId) => {
    const res = await api.post(`/budget-docs/${docId}/submit`);
    return res.data;
  },

  // Persetujuan Dokumen oleh Manager/Akuntansi
  approveDoc: async (docId) => {
    const res = await api.post(`/budget-docs/${docId}/approve`);
    return res.data;
  },

  // Pengembalian Dokumen dengan Catatan Wajib
  returnDoc: async (docId, note) => {
    const res = await api.post(`/budget-docs/${docId}/return`, { note });
    return res.data;
  },

  // Finalisasi Dokumen Tunggal oleh Akuntansi
  finalizeDoc: async (docId) => {
    const res = await api.post(`/budget-docs/${docId}/finalize`);
    return res.data;
  },

  // Finalisasi Dokumen Massal oleh Akuntansi
  finalizeBulk: async (docIds) => {
    const res = await api.post('/budget-docs/finalize-bulk', { doc_ids: docIds });
    return res.data;
  },

  // Buka Kembali Dokumen FINAL oleh Akuntansi
  reopenDoc: async (docId, reason) => {
    const res = await api.post(`/budget-docs/${docId}/reopen`, { reason });
    return res.data;
  },

  // Riwayat Status Dokumen
  getDocHistory: async (docId) => {
    const res = await api.get(`/budget-docs/${docId}/history`);
    return res.data;
  },

  // Antrean Dokumen untuk Ditelaah (Review Queue)
  getReviewQueue: async (params = {}) => {
    const res = await api.get('/budget-docs/review-queue', { params });
    return res.data;
  },

  // Komentar Validator per Baris
  getLineComments: async (docId, lineType, lineId) => {
    const res = await api.get(`/budget-docs/${docId}/lines/${lineType}/${lineId}/comments`);
    return res.data;
  },

  addLineComment: async (docId, lineType, lineId, text) => {
    const res = await api.post(`/budget-docs/${docId}/lines/${lineType}/${lineId}/comments`, { text });
    return res.data;
  },

  deleteLineComment: async (commentId) => {
    const res = await api.delete(`/line-comments/${commentId}`);
    return res.data;
  },
};
