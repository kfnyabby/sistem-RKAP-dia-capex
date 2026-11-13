import { Eye, Search, Filter } from 'lucide-react';

export default function DisplayPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Eye className="w-6 h-6 text-purple-700" />
          Display Anggaran (Read-Only)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Penelusuran dan pratinjau dokumen anggaran biaya dan investasi yang telah diajukan atau
          disetujui.
        </p>
      </div>

      {/* Filter Bar Placeholder */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari unit atau kode dokumen..."
              disabled
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200 cursor-not-allowed"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Display Content Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            <Eye className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Tampilan Dokumen Terkonsolidasi</h2>
          <p className="text-sm text-slate-500">
            Daftar anggaran per unit dengan status terkunci/final akan ditampilkan di sini tanpa
            akses ubah.
          </p>
        </div>
      </div>
    </div>
  );
}
