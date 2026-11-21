import api from './axios';

export const settingApi = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },

  updateSettings: async (settings) => {
    const res = await api.put('/settings', { settings });
    return res.data;
  },
};

export default settingApi;
