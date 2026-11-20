import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AppShell from './components/layout/AppShell';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EntryBiayaPage from './pages/EntryBiayaPage';
import EntryInvestasiPage from './pages/EntryInvestasiPage';
import LaptopPcPage from './pages/LaptopPcPage';
import ValidasiPage from './pages/ValidasiPage';
import RealisasiPage from './pages/RealisasiPage';
import LaporanRekapPage from './pages/LaporanRekapPage';
import LaporanMatriksPage from './pages/LaporanMatriksPage';
import PengaturanMasterPage from './pages/PengaturanMasterPage';
import PengaturanPenggunaPage from './pages/PengaturanPenggunaPage';
import PengaturanPeriodePage from './pages/PengaturanPeriodePage';
import PengaturanAuditPage from './pages/PengaturanAuditPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rute Publik */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rute Terproteksi di dalam AppShell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Entry */}
            <Route path="entry" element={<Navigate to="/entry/biaya" replace />} />
            <Route path="entry/biaya" element={<EntryBiayaPage />} />
            <Route path="entry/investasi" element={<EntryInvestasiPage />} />
            <Route path="entry/laptop-pc" element={<LaptopPcPage />} />

            {/* Proses */}
            <Route path="proses" element={<Navigate to="/proses/validasi" replace />} />
            <Route path="proses/validasi" element={<ValidasiPage />} />
            <Route
              path="proses/realisasi"
              element={
                <ProtectedRoute allowedRoles={['akuntansi', 'manager']}>
                  <RealisasiPage />
                </ProtectedRoute>
              }
            />

            {/* Display & Laporan */}
            <Route path="display" element={<Navigate to="/laporan/rekap" replace />} />
            <Route path="laporan" element={<Navigate to="/laporan/rekap" replace />} />
            <Route path="laporan/rekap" element={<LaporanRekapPage />} />
            <Route path="laporan/matriks" element={<LaporanMatriksPage />} />

            {/* Pengaturan (Khusus Akuntansi & Audit Log) */}
            <Route
              path="pengaturan"
              element={<Navigate to="/pengaturan/master" replace />}
            />
            <Route
              path="pengaturan/master"
              element={
                <ProtectedRoute allowedRoles={['akuntansi']}>
                  <PengaturanMasterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/pengguna"
              element={
                <ProtectedRoute allowedRoles={['akuntansi']}>
                  <PengaturanPenggunaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/periode"
              element={
                <ProtectedRoute allowedRoles={['akuntansi']}>
                  <PengaturanPeriodePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/audit"
              element={
                <ProtectedRoute allowedRoles={['akuntansi', 'manager']}>
                  <PengaturanAuditPage />
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
