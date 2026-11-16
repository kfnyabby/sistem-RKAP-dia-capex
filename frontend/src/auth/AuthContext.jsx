import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setCsrfToken } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfTokenState, setCsrfTokenState] = useState(null);

  // Ambil token CSRF dari server
  const fetchCsrf = useCallback(async () => {
    try {
      const res = await api.get('/auth/csrf');
      const token = res.data.csrf_token;
      setCsrfToken(token);
      setCsrfTokenState(token);
      return token;
    } catch (err) {
      console.error('Gagal mengambil CSRF token:', err.message);
      return null;
    }
  }, []);

  // Ambil profil pengguna saat ini (/auth/me)
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Inisialisasi saat aplikasi pertama kali dimuat
  useEffect(() => {
    async function initAuth() {
      setLoading(true);
      await fetchCsrf();
      await refreshUser();
      setLoading(false);
    }
    initAuth();
  }, [fetchCsrf, refreshUser]);

  // Fungsi Login
  const login = async (email, password) => {
    // Pastikan CSRF token sudah tersedia sebelum request POST
    let token = csrfTokenState;
    if (!token) {
      token = await fetchCsrf();
    }

    const res = await api.post('/auth/login', { email, password });
    const loggedInUser = res.data.user;
    setUser(loggedInUser);
    return loggedInUser;
  };

  // Fungsi Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      setUser(null);
      // Ambil token CSRF baru untuk sesi berikutnya
      await fetchCsrf();
    }
  };

  const value = {
    user,
    loading,
    csrfToken: csrfTokenState,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
}

