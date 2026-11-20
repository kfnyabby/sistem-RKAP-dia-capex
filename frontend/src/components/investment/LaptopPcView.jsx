import { useState, useEffect, useCallback } from 'react';
import {
  Laptop,
  Search,
  Building2,
  RefreshCw,
  Coins,
  TrendingDown,
  ArrowLeft,
} from 'lucide-react';
import { investmentApi } from '../../api/investment.api';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function LaptopPcView({ onBack }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await investmentApi.listCrossUnitLines({
        search: search.trim() || undefined,
        company_id: companyId || undefined,
        category_name: 'PC/LAPTOP',
        per_page: 100,
      });
      setLines(res.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat daftar Laptop & PC lintas unit');
    } finally {
      setLoading(false);
    }
  }, [search, companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grandTotalAmount = lines.reduce((acc, l) => acc + (l.amount || 0), 0);
  const grandTotalQty = lines.reduce((acc, l) => acc + (l.qty || 0), 0);
  const grandTotalDepreciation = lines.reduce((acc, l) => acc + (l.depreciation_amount || 0), 0);

  return (
    <div className="space-y-4 text-left">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer mr-1"
                title="Kembali ke Entry Anggaran Investasi"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Laptop className="w-5 h-5 text-[#3D4E9C]" />
            <h1 className="text-base font-bold text-slate-800">
              Pengadaan Laptop & PC Lintas Unit (Mockup 15-laptop-pc)
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Daftar konsolidasi usulan pengadaan Laptop dan PC dari seluruh unit kerja untuk koordinasi
            pengadaan IT terpusat (khusus Akuntansi & Manager).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>Total Kuantitas Laptop / PC</span>
            <Laptop className="w-4 h-4 text-[#3D4E9C]" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {grandTotalQty} <span className="text-xs font-normal text-slate-500">unit</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Dari {lines.length} baris pengajuan
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>Total Anggaran Capex IT</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            Rp {formatRupiah(grandTotalAmount)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Estimasi total belanja modal IT
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
            <span>Total Beban Penyusutan RKAP</span>
            <TrendingDown className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">
            Rp {formatRupiah(grandTotalDepreciation)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Dihitung dari bulan rencana
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          className="flex items-center gap-2 flex-1 max-w-md"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang, spek, atau unit..."
              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 outline-none focus:border-[#3D4E9C]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#313f80] transition-colors cursor-pointer shrink-0"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Perusahaan:</span>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="text-xs text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
          >
            <option value="">Semua Perusahaan</option>
            <option value="1">PT Cipta Nirmala (CN)</option>
            <option value="2">PT Cipta Nirmala Husada (CNH)</option>
          </select>
        </div>
      </div>

      {/* Alert Error */}
      {errorMsg && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold w-10 text-center">No.</th>
                <th className="py-2.5 px-3 font-semibold min-w-[160px]">Unit Pengaju</th>
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Item Laptop / PC</th>
                <th className="py-2.5 px-3 font-semibold w-12 text-center">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">Harga (Rp)</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Jumlah (Rp)</th>
                <th className="py-2.5 px-3 font-semibold w-16 text-center">Jadwal</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-center">Prioritas</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Penyusutan</th>
                <th className="py-2.5 px-3 font-semibold min-w-[220px]">Strategi / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3D4E9C]" />
                    Memuat data usulan PC & Laptop...
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-500">
                    Tidak ada usulan pengadaan Laptop atau PC yang ditemukan.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">
                        [{line.unit_code}] {line.unit_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {line.company_code} · RKAP {line.period_year || '2027'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{line.name}</div>
                      {line.strategic_action && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          Aksi: {line.strategic_action}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                      {line.qty}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {formatRupiah(line.price)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {formatRupiah(line.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                      {MONTH_SHORT[(line.plan_month || 1) - 1]}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {line.priority_name || 'Strategic'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-blue-900">
                      {formatRupiah(line.depreciation_amount)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      <div className="line-clamp-2" title={line.strategic_objective || line.kpi || line.note}>
                        {line.strategic_objective || line.kpi || line.note || '—'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
          <span>Menampilkan <b>{lines.length}</b> usulan pengadaan Laptop & PC</span>
          <span className="font-bold text-slate-700">Total Kuantitas: {grandTotalQty} Unit</span>
        </div>
      </div>
    </div>
  );
}
