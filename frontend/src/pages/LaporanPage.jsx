import { useState } from 'react';
import { FileSpreadsheet, Download, FileText, BarChart3 } from 'lucide-react';

export default function LaporanPage() {
  const [activeReport, setActiveReport] = useState('rekap-unit');

  const reportTabs = [
    { id: 'rekap-unit', label: 'Rekap Gabungan per Unit' },
    { id: 'matriks-erp', label: 'Matriks Unit × COA (Format ERP)' },
    { id: 'biaya-coa', label: 'Rekap Biaya per COA' },
    { id: 'investasi', label: 'Rekap Investasi' },
    { id: 'realisasi', label: 'Realisasi vs RKAP' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-purple-700" />
            Laporan & Konsolidasi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rekap anggaran biaya dan investasi untuk PT Cipta Nirmala & Cipta Nirmala Husada.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold opacity-75 cursor-not-allowed shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold opacity-75 cursor-not-allowed shadow-xs"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveReport(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeReport === tab.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Preview Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            {reportTabs.find((t) => t.id === activeReport)?.label}
          </h2>
          <p className="text-sm text-slate-500">
            Laporan lengkap beserta agregasi data, sekat unit, dan subtotal per perusahaan akan
            diimplementasikan pada Fase 8.
          </p>
        </div>
      </div>
    </div>
  );
}
