import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import EntryPage from './pages/EntryPage';
import ProsesPage from './pages/ProsesPage';
import DisplayPage from './pages/DisplayPage';
import LaporanPage from './pages/LaporanPage';
import PengaturanPage from './pages/PengaturanPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="entry" element={<EntryPage />} />
          <Route path="proses" element={<ProsesPage />} />
          <Route path="display" element={<DisplayPage />} />
          <Route path="laporan" element={<LaporanPage />} />
          <Route path="pengaturan" element={<PengaturanPage />} />
        </Route>
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
