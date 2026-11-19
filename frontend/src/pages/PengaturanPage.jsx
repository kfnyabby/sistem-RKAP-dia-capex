import { useState } from 'react';
import { Settings, Database, Calendar, Users, Sliders, History } from 'lucide-react';
import MasterDataView from '../components/master/MasterDataView';
import PeriodSubmissionSection from '../components/pengaturan/PeriodSubmissionSection';

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState('master');

  const settingsTabs = [
    { id: 'master', label: 'Master Data', icon: Database },
    { id: 'periode', label: 'Periode RKAP', icon: Calendar },
    { id: 'users', label: 'Pengguna & Role', icon: Users },
    { id: 'ambang', label: 'Ambang & Pengaturan', icon: Sliders },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-700" />
            Pengaturan Sistem (Akuntansi)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan master data, periode anggaran, akses pengguna, dan audit log sistem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            Role: Akuntansi
          </span>
        </div>
      </div>

      {/* Settings Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600 text-purple-900'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'master' ? (
        <MasterDataView />
      ) : activeTab === 'periode' ? (
        <PeriodSubmissionSection />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center">
          <div className="max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold text-slate-800">
              Panel {settingsTabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-slate-500">
              {activeTab === 'periode' && 'Pengaturan periode RKAP aktif, batas waktu validasi, dan penutupan otomatis (Fase 3).'}
              {activeTab === 'users' && 'Manajemen pengguna, penugasan unit kerja, dan hak akses sistem.'}
              {activeTab === 'ambang' && 'Konfigurasi ambang investasi DIA CAPEX, akun realisasi, dan parameter bisnis.'}
              {activeTab === 'audit' && 'Riwayat log audit perubahan data transaksi dan master sistem.'}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Khusus Role Akuntansi
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
