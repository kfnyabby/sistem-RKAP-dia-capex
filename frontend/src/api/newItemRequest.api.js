import api from './axios';

export const newItemRequestApi = {
  // Ambil daftar permintaan barang baru untuk dokumen anggaran tertentu
  getRequestsByDocId: async (docId) => {
    const res = await api.get(`/budget-docs/${docId}/new-item-requests`);
    return res.data;
  },

  // Tambah permintaan barang baru sebagai DRAFT
  createDraftRequest: async (docId, data) => {
    const res = await api.post(`/budget-docs/${docId}/new-item-requests`, data);
    return res.data;
  },

  // Perbarui draft permintaan barang baru
  updateDraftRequest: async (id, data) => {
    const res = await api.put(`/new-item-requests/${id}`, data);
    return res.data;
  },

  // Hapus draft permintaan barang baru
  deleteDraftRequest: async (id) => {
    const res = await api.delete(`/new-item-requests/${id}`);
    return res.data;
  },

  // Kirim permintaan barang baru ke Akuntansi (DRAFT -> MENUNGGU_COA)
  sendRequests: async (docId, requestIds = null) => {
    const res = await api.post(`/budget-docs/${docId}/new-item-requests/send`, {
      request_ids: requestIds,
    });
    return res.data;
  },

  // Antrean penentuan COA khusus Akuntansi
  getAccountingQueue: async (params = {}) => {
    const res = await api.get('/new-item-requests/queue', { params });
    return res.data;
  },

  // Akuntansi menentukan COA, membuat barang di master & menambahkan ke dokumen (BR-17 & BR-18)
  assignCoa: async (id, data) => {
    const res = await api.post(`/new-item-requests/${id}/assign-coa`, data);
    return res.data;
  },
};
