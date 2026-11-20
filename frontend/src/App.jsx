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
import DisplayPage from './pages/DisplayPage';
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

            {/* Entry (PIC, Manager, Akuntansi) */}
            <Route path="entry" element={<Navigate to="/entry/biaya" replace />} />
            <Route path="entry/biaya" element={<EntryBiayaPage />} />
            <Route path="entry/investasi" element={<EntryInvestasiPage />} />
            <Route path="entry/laptop-pc" element={<LaptopPcPage />} />

            {/* Proses (Sesuai PRD 3.2: Validasi hanya Manager & Akuntansi; Realisasi hanya Akuntansi) */}
            <Route
              path="proses"
              element={
                <ProtectedRoute
                  allowedRoles={['manager', 'akuntansi']}
                  deniedMessage="Akses ditolak: Menu Proses hanya dapat diakses oleh Manager dan Akuntansi."
                >
                  <Navigate to="/proses/validasi" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="proses/validasi"
              element={
                <ProtectedRoute
                  allowedRoles={['manager', 'akuntansi']}
                  deniedMessage="Akses ditolak: Antrian Validasi hanya dapat diakses oleh Manager dan Akuntansi."
                >
                  <ValidasiPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="proses/realisasi"
              element={
                <ProtectedRoute
                  allowedRoles={['akuntansi']}
                  deniedMessage="Akses ditolak: Input Realisasi hanya dapat diakses oleh Akuntansi."
                >
                  <RealisasiPage />
                </ProtectedRoute>
              }
            />

            {/* Display (Semua Role) */}
            <Route path="display" element={<DisplayPage />} />

            {/* Laporan (Semua Role) */}
            <Route path="laporan" element={<Navigate to="/laporan/rekap" replace />} />
            <Route path="laporan/rekap" element={<LaporanRekapPage />} />
            <Route path="laporan/matriks" element={<LaporanMatriksPage />} />

            {/* Pengaturan (Khusus Akuntansi Sesuai Instruksi User) */}
            <Route
              path="pengaturan"
              element={
                <ProtectedRoute
                  allowedRoles={['akuntansi']}
                  deniedMessage="Akses ditolak: Menu Pengaturan hanya dapat diakses oleh Akuntansi."
                >
                  <Navigate to="/pengaturan/master" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/master"
              element={
                <ProtectedRoute
                  allowedRoles={['akuntansi']}
                  deniedMessage="Akses ditolak: Menu Pengaturan hanya dapat diakses oleh Akuntansi."
                >
                  <PengaturanMasterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/pengguna"
              element={
                <ProtectedRoute
                  allowedRoles={['akuntansi']}
                  deniedMessage="Akses ditolak: Menu Pengaturan Pengguna hanya dapat diakses oleh Akuntansi."
                >
                  <PengaturanPenggunaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/periode"
              element={
                <ProtectedRoute
                  allowedRoles={['akuntansi']}
                  deniedMessage="Akses ditolak: Menu Pengaturan Periode hanya dapat diakses oleh Akuntansi."
                >
                  <PengaturanPeriodePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan/audit"
              element={
                <ProtectedRoute
                  allowedRoles={['akuntansi']}
                  deniedMessage="Akses ditolak: Menu Audit Log hanya dapat diakses oleh Akuntansi."
                >
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
