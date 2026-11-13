import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const [healthStatus, setHealthStatus] = useState({ loading: true, data: null, error: null });
  const [dbStatus, setDbStatus] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    // Check backend health
    axios
      .get('/api/health')
      .then((res) => setHealthStatus({ loading: false, data: res.data, error: null }))
      .catch((err) => setHealthStatus({ loading: false, data: null, error: err.message }));

    // Check database
    axios
      .get('/api/test-db')
      .then((res) => setDbStatus({ loading: false, data: res.data, error: null }))
      .catch((err) =>
        setDbStatus({ loading: false, data: null, error: err.response?.data?.error || err.message })
      );
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-purple-700" />
          Dashboard Utama
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ringkasan progres penyusunan RKAP, kontrol realisasi, dan status sistem DIA CAPEX.
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Backend Status Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              API Backend
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                healthStatus.data
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {healthStatus.loading ? 'Memeriksa...' : healthStatus.data ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-lg font-bold text-slate-800">Express 5 REST API</div>
            <p className="text-xs text-slate-500 mt-1">
              {healthStatus.data
                ? 'Endpoint /api/health aktif dan berjalan normal.'
                : healthStatus.error || 'Menghubungkan ke server...'}
            </p>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Database
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                dbStatus.data ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {dbStatus.loading ? 'Memeriksa...' : dbStatus.data ? 'Connected' : 'Error'}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-lg font-bold text-slate-800">PostgreSQL (28 Tabel P0)</div>
            <p className="text-xs text-slate-500 mt-1">
              {dbStatus.data
                ? `Terhubung ke DB. Server time: ${new Date(dbStatus.data.server_time).toLocaleTimeString()}`
                : dbStatus.error || 'Memeriksa pool PostgreSQL...'}
            </p>
          </div>
        </div>

        {/* Fondasi Fase 0 Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status Fase
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
              Fase 0 (Fondasi)
            </span>
          </div>
          <div className="mt-4">
            <div className="text-lg font-bold text-slate-800">Arsitektur Modular</div>
            <p className="text-xs text-slate-500 mt-1">
              Tailwind CSS, React Router, Vitest, dan ESLint aktif.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>TOTAL RKAP BIAYA</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">Rp 2.500.000.000</div>
          <div className="text-xs text-slate-500 mt-1">Realisasi: Rp 1.450.000.000 (58%)</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>TOTAL RKAP INVESTASI</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">Rp 1.800.000.000</div>
          <div className="text-xs text-slate-500 mt-1">Realisasi: Rp 610.000.000 (34%)</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>STATUS UNIT KERJA</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">6 Unit</div>
          <div className="text-xs text-slate-500 mt-1">CN: 3 Unit | CNH: 3 Unit</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>PERINGATAN ANGGARAN</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">0 Unit</div>
          <div className="text-xs text-slate-500 mt-1">Ambang batas normal (&lt; 80%)</div>
        </div>
      </div>
    </div>
  );
}
