import api from './axios';

export const realizationApi = {
  // Ambil data agregasi realisasi buku besar
  getRealizations: async (params = {}) => {
    const res = await api.get('/realizations', { params });
    return res.data;
  },

  // Riwayat batch import realisasi
  getRealizationImports: async (params = {}) => {
    const res = await api.get('/realization-imports', { params });
    return res.data;
  },
};

export default realizationApi;
