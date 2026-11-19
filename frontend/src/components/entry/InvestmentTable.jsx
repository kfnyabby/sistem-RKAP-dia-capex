import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  TrendingDown,
  Coins,
  CheckCircle2,
} from 'lucide-react';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function InvestmentTable({
  lines = [],
  summary = {},
  isDocDraft = true,
  onEdit,
  onDelete,
}) {
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalAmount = summary?.total_amount || 0;
  const totalDepreciation = summary?.total_depreciation || 0;
  const byCategory = summary?.by_category || [];
  const byPriority = summary?.by_priority || [];

  return (
    <div className="space-y-4 text-left">
      {/* 1. Summary Cards (FR-I4: Total per Unit, Kategori, Prioritas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Investasi */}
        <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#5E6070] text-xs font-medium mb-1">
            <span>Total Investasi Unit</span>
            <Coins className="w-4 h-4 text-[#3D4E9C]" />
          </div>
          <div className="text-xl font-bold tracking-tight text-[#1F2233]">
            Rp {formatRupiah(totalAmount)}
          </div>
          <div className="text-[11px] text-[#5E6070] mt-1">
            Total {lines.length} item pengadaan aset
          </div>
        </div>

        {/* Card 2: Total Penyusutan */}
        <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#5E6070] text-xs font-medium mb-1">
            <span>Estimasi Penyusutan RKAP</span>
            <TrendingDown className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-blue-900">
            Rp {formatRupiah(totalDepreciation)}
          </div>
          <div className="text-[11px] text-[#5E6070] mt-1">
            Dihitung dari bulan rencana s.d. akhir tahun
          </div>
        </div>

        {/* Card 3: Rekap per Kategori */}
        <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs lg:col-span-2">
          <div className="text-xs font-semibold text-[#5E6070] mb-2">
            Rekapitulasi per Kategori Investasi:
          </div>
          {byCategory.length === 0 ? (
            <div className="text-xs text-slate-400 italic">Belum ada baris investasi</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {byCategory.map((cat) => (
                <div
                  key={cat.category_id || cat.category_name}
                  className="inline-flex items-center gap-1.5 bg-[#FAF7F2] border border-[#E6E0D6] rounded px-2.5 py-1 text-xs"
                >
                  <span className="font-semibold text-[#1F2233]">{cat.category_name}</span>
                  <span className="text-[#5E6070]">({cat.item_count})</span>
                  <span className="font-bold text-[#14532D] ml-1">
                    Rp {formatRupiah(cat.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Rekap Prioritas */}
      {byPriority.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E6E0D6] px-4 py-2.5 shadow-2xs flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-[#5E6070]">Prioritas:</span>
          <div className="flex flex-wrap gap-2">
            {byPriority.map((prio) => (
              <span
                key={prio.priority_id || prio.priority_name}
                className="inline-flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700"
              >
                <span className="font-medium">{prio.priority_name}:</span>
                <span className="font-bold text-[#3D4E9C]">Rp {formatRupiah(prio.amount)}</span>
                <span className="text-[10px] text-slate-400">({prio.item_count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tabel Data Investasi */}
      <div className="bg-white rounded-lg border border-[#E6E0D6] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E6E0D6] bg-[#FAF7F2] text-[#5E6070]">
                <th className="py-2.5 px-3 font-semibold w-10 text-center">No.</th>
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Barang / Kegiatan</th>
                <th className="py-2.5 px-3 font-semibold min-w-[140px]">Kategori</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-center">Prioritas</th>
                <th className="py-2.5 px-3 font-semibold w-20 text-center">Jadwal</th>
                <th className="py-2.5 px-3 font-semibold w-12 text-center">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">Harga (Rp)</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Jumlah (Rp)</th>
                <th className="py-2.5 px-3 font-semibold min-w-[160px]">COA</th>
                <th className="py-2.5 px-3 font-semibold w-16 text-center">Susut</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Penyusutan</th>
                <th className="py-2.5 px-3 font-semibold w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE2]">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-8 text-center text-[#5E6070]">
                    <p className="font-semibold text-slate-700">Belum ada item anggaran investasi.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Gunakan form di atas untuk menambahkan pengadaan aset baru (nilai &gt; Rp 5.000.000).
                    </p>
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const isExpanded = expandedRowIds.has(line.id);
                  const hasDetails =
                    line.strategic_objective ||
                    line.kpi ||
                    line.work_program ||
                    line.strategic_action ||
                    line.note;

                  return (
                    <React.Fragment key={line.id}>
                      <tr className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-2.5 px-3 text-center text-[#5E6070] font-medium">
                          {idx + 1}
                        </td>

                        {/* Nama Barang / Kegiatan (dengan tombol expand jika ada detail) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-start gap-1.5">
                            {hasDetails ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(line.id)}
                                className="mt-0.5 text-slate-400 hover:text-[#3D4E9C] cursor-pointer"
                                title={isExpanded ? 'Tutup detail' : 'Buka detail'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 inline-block" />
                            )}
                            <div>
                              <div className="font-semibold text-[#1F2233]">{line.name}</div>
                              {hasDetails && !isExpanded && (
                                <div className="text-[10px] text-blue-600 cursor-pointer" onClick={() => toggleExpand(line.id)}>
                                  Klik untuk lihat justifikasi & strategi
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="py-2.5 px-3 font-medium text-[#1F2233]">
                          {line.category_name}
                        </td>

                        {/* Prioritas */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {line.priority_name || 'Strategic'}
                          </span>
                        </td>

                        {/* Jadwal Bulan Rencana */}
                        <td className="py-2.5 px-3 text-center font-medium text-[#1F2233]">
                          {MONTH_SHORT[(line.plan_month || 1) - 1]}
                        </td>

                        {/* Qty */}
                        <td className="py-2.5 px-3 text-center font-semibold text-[#1F2233]">
                          {line.qty}
                        </td>

                        {/* Harga Satuan */}
                        <td className="py-2.5 px-3 text-right text-[#5E6070]">
                          {formatRupiah(line.price)}
                        </td>

                        {/* Jumlah Investasi */}
                        <td className="py-2.5 px-3 text-right font-bold text-[#14532D]">
                          {formatRupiah(line.amount)}
                        </td>

                        {/* COA Otomatis */}
                        <td className="py-2.5 px-3">
                          {line.coa_code ? (
                            <div>
                              <span className="font-bold text-[#3D4E9C]">{line.coa_code}</span>
                              <div className="text-[11px] text-[#5E6070] truncate max-w-[150px]" title={line.coa_name}>
                                {line.coa_name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">—</span>
                          )}
                        </td>

                        {/* Masa Manfaat Susut */}
                        <td className="py-2.5 px-3 text-center text-[#5E6070]">
                          {line.useful_life_months > 0 ? `${line.useful_life_months} bln` : '—'}
                        </td>

                        {/* Estimasi Penyusutan */}
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-900">
                          {formatRupiah(line.depreciation_amount)}
                        </td>

                        {/* Aksi Edit & Hapus */}
                        <td className="py-2.5 px-3 text-center">
                          {isDocDraft ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEdit(line)}
                                title="Edit baris investasi"
                                className="p-1 text-slate-400 hover:text-[#3D4E9C] rounded cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(line.id)}
                                title="Hapus baris investasi"
                                className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Accordion Detail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b border-[#E6E0D6]">
                          <td colSpan="12" className="py-3 px-6 text-xs text-[#1F2233]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                              <div>
                                <span className="font-semibold text-[#5E6070] block text-[11px] mb-0.5">
                                  1. Strategi Objektif:
                                </span>
                                <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                                  {line.strategic_objective || '—'}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-[#5E6070] block text-[11px] mb-0.5">
                                  2. Counter Measure (KPI):
                                </span>
                                <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                                  {line.kpi || '—'}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-[#5E6070] block text-[11px] mb-0.5">
                                  3. Program Kerja / Inisiatif Strategis:
                                </span>
                                <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                                  {line.work_program || '—'}
                                </p>
                              </div>
                              <div>
                                <span className="font-semibold text-[#5E6070] block text-[11px] mb-0.5">
                                  4. Strategic Action:
                                </span>
                                <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                                  {line.strategic_action || '—'}
                                </p>
                              </div>
                              {line.note && (
                                <div className="md:col-span-2">
                                  <span className="font-semibold text-[#5E6070] block text-[11px] mb-0.5">
                                    Catatan Tambahan:
                                  </span>
                                  <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                    {line.note}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel */}
        <div className="border-t border-[#E6E0D6] bg-[#FAF7F2] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5E6070]">
          <div className="flex items-center gap-2">
            <span className="chip ok flex items-center gap-1.5" role="status">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tersimpan otomatis
            </span>
            <span className="text-[11px] text-[#5E6070]">
              Baris investasi otomatis terkalkulasi ke ringkasan dokumen.
            </span>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-xs text-[#5E6070] mr-1.5">Total Investasi:</span>
              <span className="text-base font-bold text-[#14532D]">
                Rp {formatRupiah(totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#5E6070] mr-1.5">Total Penyusutan:</span>
              <span className="text-base font-bold text-blue-900">
                Rp {formatRupiah(totalDepreciation)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

InvestmentTable.propTypes = {
  lines: PropTypes.array,
  summary: PropTypes.object,
  isDocDraft: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
