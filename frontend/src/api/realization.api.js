import api from './axios';

export const realizationApi = {
  // 1. Unggah file Excel daftar jurnal (multipart/form-data)
  uploadRealization: async (formData) => {
    const res = await api.post('/realization-imports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // 2. Ambil detail progres & status batch import
  getImportDetail: async (batchId) => {
    const res = await api.get(`/realization-imports/${batchId}`);
    return res.data;
  },

  // 3. Ambil daftar riwayat batch import (paginasi)
  listImports: async (params = {}) => {
    const res = await api.get('/realization-imports', { params });
    return res.data;
  },

  // 4. Ambil daftar unit yang belum terpetakan untuk batch tertentu
  getUnmappedUnits: async (batchId) => {
    const res = await api.get(`/realization-imports/${batchId}/unmapped-units`);
    return res.data;
  },

  // 5. Ambil daftar baris galat pada batch tertentu
  getErrors: async (batchId, params = {}) => {
    const res = await api.get(`/realization-imports/${batchId}/errors`, { params });
    return res.data;
  },

  // 6. Simpan / perbarui alias unit dan memetakan otomatis baris PREVIEW
  updateUnitAlias: async (data) => {
    const res = await api.put('/unit-aliases', data);
    return res.data;
  },

  // 7. Konfirmasi batch import (PREVIEW -> CONFIRMED)
  confirmImport: async (batchId) => {
    const res = await api.post(`/realization-imports/${batchId}/confirm`);
    return res.data;
  },

  // 8. Rollback / batalkan batch import (PREVIEW -> ROLLED_BACK)
  rollbackImport: async (batchId) => {
    const res = await api.delete(`/realization-imports/${batchId}`);
    return res.data;
  },

  // 9. Ambil data agregasi realisasi buku besar
  getRealizations: async (params = {}) => {
    const res = await api.get('/realizations', { params });
    return res.data;
  },

  // Alias untuk kompatibilitas riwayat
  getRealizationImports: async (params = {}) => {
    const res = await api.get('/realization-imports', { params });
    return res.data;
  },
};

export default realizationApi;
