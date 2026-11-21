import api from './axios';

export const userApi = {
  getUsers: async (params = {}) => {
    const res = await api.get('/users', { params });
    return res.data;
  },

  getUserDetail: async (id) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  createUser: async (data) => {
    const res = await api.post('/users', data);
    return res.data;
  },

  updateUser: async (id, data) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },

  updateStatus: async (id, is_active) => {
    const res = await api.patch(`/users/${id}/status`, { is_active });
    return res.data;
  },

  updateUnits: async (id, unit_ids) => {
    const res = await api.put(`/users/${id}/units`, { unit_ids });
    return res.data;
  },

  resetPassword: async (id, new_password = '') => {
    const res = await api.post(`/users/${id}/reset-password`, { new_password });
    return res.data;
  },
};

export default userApi;
