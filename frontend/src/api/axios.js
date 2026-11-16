import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let currentCsrfToken = null;

export const setCsrfToken = (token) => {
  currentCsrfToken = token;
};

export const getCsrfToken = () => currentCsrfToken;

// Interceptor untuk menyisipkan header X-CSRF-Token pada setiap request non-GET
api.interceptors.request.use((config) => {
  const method = (config.method || '').toUpperCase();
  if (currentCsrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['X-CSRF-Token'] = currentCsrfToken;
  }
  return config;
});

export default api;

