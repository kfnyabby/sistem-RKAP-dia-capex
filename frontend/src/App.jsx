import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EntryPage from './pages/EntryPage';
import ProsesPage from './pages/ProsesPage';
import DisplayPage from './pages/DisplayPage';
import LaporanPage from './pages/LaporanPage';
import PengaturanPage from './pages/PengaturanPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rute Publik */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rute Terproteksi */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="entry" element={<EntryPage />} />
            <Route path="entry/biaya" element={<EntryPage />} />
            <Route path="proses" element={<ProsesPage />} />
            <Route path="proses/penentuan-coa" element={<ProsesPage />} />
            <Route path="display" element={<DisplayPage />} />
            <Route path="laporan" element={<LaporanPage />} />
            {/* Rute Pengaturan khusus Role Akuntansi */}
            <Route
              path="pengaturan"
              element={
                <ProtectedRoute allowedRoles={['akuntansi']}>
                  <PengaturanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/master-data"
              element={
                <ProtectedRoute allowedRoles={['akuntansi']}>
                  <PengaturanPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
