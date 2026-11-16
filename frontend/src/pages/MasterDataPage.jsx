import MasterDataView from '../components/master/MasterDataView';

export default function MasterDataPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan · Master Data
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pengelolaan katalog barang logistik, bagan akun (COA), kategori investasi, unit kerja, dan referensi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            Akuntansi
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Fase 2
          </span>
        </div>
      </div>

      <MasterDataView />
    </div>
  );
}

