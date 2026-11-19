import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Workflow,
  CheckSquare,
  Lock,
  UploadCloud,
  CalendarClock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import PenentuanCoaSection from '../components/proses/PenentuanCoaSection';

export default function ProsesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Cek apakah ada query param ?tab=penentuan-coa atau jika role akuntansi
  const initialTab =
    searchParams.get('tab') === 'penentuan-coa' ||
    window.location.pathname.includes('penentuan-coa')
      ? 'penentuan-coa'
      : user?.role === 'akuntansi'
        ? 'penentuan-coa'
        : 'validasi';

  const [activeProcess, setActiveProcess] = useState(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveProcess(tabParam);
    }
  }, [searchParams]);

  const processList = [
    ...(user?.role === 'akuntansi'
      ? [
          {
            id: 'penentuan-coa',
            title: 'Penentuan COA',
            icon: Layers,
            desc: 'Penentuan COA & Master Barang Baru (FR-M13)',
          },
        ]
      : []),
    {
      id: 'validasi',
      title: 'Antrian Validasi',
      icon: CheckSquare,
      desc: 'Persetujuan dokumen oleh Manager',
    },
    {
      id: 'finalisasi',
      title: 'Finalisasi Dokumen',
      icon: Lock,
      desc: 'Penguncian dokumen oleh Akuntansi',
    },
    {
      id: 'import',
      title: 'Import Realisasi',
      icon: UploadCloud,
      desc: 'Unggah buku besar jurnal (XLSX)',
    },
    {
      id: 'deadline',
      title: 'Deadline & Buka/Tutup',
      icon: CalendarClock,
      desc: 'Kelola akses pengajuan per unit',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Workflow className="w-6 h-6 text-purple-700" />
          Proses & Validasi
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Alur kerja validasi, finalisasi dokumen, import data realisasi, dan penentuan COA barang
          baru.
        </p>
      </div>

      {/* Process Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {processList.map((proc) => {
          const Icon = proc.icon;
          const isSelected = activeProcess === proc.id;
          return (
            <button
              key={proc.id}
              type="button"
              onClick={() => setActiveProcess(proc.id)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600'
                  : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{proc.title}</div>
                  <div className="text-xs text-slate-500">{proc.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Process Content */}
      {activeProcess === 'penentuan-coa' && user?.role === 'akuntansi' ? (
        <PenentuanCoaSection />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center">
          <div className="max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold text-slate-800">
              {processList.find((p) => p.id === activeProcess)?.title}
            </h2>
            <p className="text-sm text-slate-500">
              Modul proses ini akan diintegrasikan dengan workflow approval dan aturan bisnis pada
              tahap berikutnya.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Menunggu Fase Workflow & Persetujuan
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
