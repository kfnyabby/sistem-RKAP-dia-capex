import { useState } from 'react';
import { FileEdit, DollarSign, Briefcase } from 'lucide-react';

export default function EntryPage() {
  const [activeTab, setActiveTab] = useState('biaya');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileEdit className="w-6 h-6 text-purple-700" />
          Entry Anggaran
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pengisian Anggaran Biaya operasional dan Anggaran Investasi (Capex) per unit kerja.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('biaya')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'biaya'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Anggaran Biaya
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('investasi')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'investasi'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Anggaran Investasi (Capex)
        </button>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            {activeTab === 'biaya' ? (
              <DollarSign className="w-6 h-6" />
            ) : (
              <Briefcase className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Form {activeTab === 'biaya' ? 'Anggaran Biaya' : 'Anggaran Investasi'}
          </h2>
          <p className="text-sm text-slate-500">
            {activeTab === 'biaya'
              ? 'Tabel entri biaya dengan filter COA, riwayat realisasi, dan simpan otomatis (akan dibangun pada Fase 4).'
              : 'Form input investasi dengan validasi BR-01 (> Rp 5.000.000), penentuan COA susut otomatis, dan perhitungan penyusutan (akan dibangun pada Fase 5).'}
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Modul Siap Diimplementasikan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
