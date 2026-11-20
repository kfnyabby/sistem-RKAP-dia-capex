import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Briefcase,
  Copy,
  AlertCircle,
  HelpCircle,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';
import { investmentApi } from '../../api/investment.api';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

const MONTH_NAMES = [
  'Januari (Bulan 1)',
  'Februari (Bulan 2)',
  'Maret (Bulan 3)',
  'April (Bulan 4)',
  'Mei (Bulan 5)',
  'Juni (Bulan 6)',
  'Juli (Bulan 7)',
  'Agustus (Bulan 8)',
  'September (Bulan 9)',
  'Oktober (Bulan 10)',
  'November (Bulan 11)',
  'Desember (Bulan 12)',
];

export default function InvestmentForm({
  docId,
  categories = [],
  priorities = [],
  editingLine = null,
  onSaveSuccess,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    category_id: '',
    priority_id: '',
    name: '',
    qty: 1,
    price: '',
    plan_month: 1,
    strategic_objective: '',
    kpi: '',
    work_program: '',
    strategic_action: '',
    note: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Suggestions state per field
  const [suggestions, setSuggestions] = useState({
    strategic_objective: [],
    kpi: [],
    work_program: [],
    strategic_action: [],
  });

  // Inisialisasi form saat mode edit atau mode tambah
  useEffect(() => {
    if (editingLine) {
      setFormData({
        category_id: editingLine.category_id || '',
        priority_id: editingLine.priority_id || '',
        name: editingLine.name || '',
        qty: editingLine.qty || 1,
        price: editingLine.price || '',
        plan_month: editingLine.plan_month || 1,
        strategic_objective: editingLine.strategic_objective || '',
        kpi: editingLine.kpi || '',
        work_program: editingLine.work_program || '',
        strategic_action: editingLine.strategic_action || '',
        note: editingLine.note || '',
      });
    } else {
      setFormData({
        category_id: categories.length > 0 ? categories[0].id : '',
        priority_id: priorities.length > 0 ? priorities[0].id : '',
        name: '',
        qty: 1,
        price: '',
        plan_month: 1,
        strategic_objective: '',
        kpi: '',
        work_program: '',
        strategic_action: '',
        note: '',
      });
    }
    setErrorMsg('');
  }, [editingLine, categories, priorities]);

  // Muat saran isian riwayat unit
  useEffect(() => {
    if (!docId) return;
    const loadAllSuggestions = async () => {
      try {
        const fields = ['strategic_objective', 'kpi', 'work_program', 'strategic_action'];
        const results = await Promise.all(
          fields.map((f) => investmentApi.getSuggestions(docId, f))
        );
        setSuggestions({
          strategic_objective: results[0].data || [],
          kpi: results[1].data || [],
          work_program: results[2].data || [],
          strategic_action: results[3].data || [],
        });
      } catch (err) {
        console.error('Gagal memuat saran teks:', err.message);
      }
    };
    loadAllSuggestions();
  }, [docId]);

  const selectedCategory = categories.find((c) => String(c.id) === String(formData.category_id));
  const usefulLifeMonths = selectedCategory?.useful_life_months || 0;
  const coaInfo = selectedCategory?.coa_code
    ? `${selectedCategory.coa_code} - ${selectedCategory.coa_name}`
    : selectedCategory?.depreciation_coa_id
      ? `COA ID: ${selectedCategory.depreciation_coa_id}`
      : 'Tanpa COA Penyusutan';

  const numQty = parseInt(formData.qty, 10) || 0;
  const numPrice = parseInt(formData.price, 10) || 0;
  const numAmount = Math.round(numQty * numPrice);

  // Estimasi penyusutan tahun berjalan (live preview)
  const planMonth = parseInt(formData.plan_month, 10) || 1;
  let liveDepreciation = 0;
  if (usefulLifeMonths > 0 && planMonth >= 1 && planMonth <= 12) {
    const remainingMonths = Math.max(0, 12 - planMonth);
    liveDepreciation = Math.round((numAmount / usefulLifeMonths) * remainingMonths);
  }

  // Peringatan ambang BR-01
  const isBelowThreshold = numPrice > 0 && numPrice <= 5000000;

  const handleSalinDariSebelumnya = async () => {
    if (!docId) return;
    try {
      const res = await investmentApi.getLastLineText(docId);
      if (res.data) {
        setFormData((prev) => ({
          ...prev,
          strategic_objective: res.data.strategic_objective || prev.strategic_objective,
          kpi: res.data.kpi || prev.kpi,
          work_program: res.data.work_program || prev.work_program,
          strategic_action: res.data.strategic_action || prev.strategic_action,
        }));
        setSuccessMsg('Teks strategi berhasil disalin dari baris sebelumnya.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        alert('Belum ada baris investasi sebelumnya pada unit ini untuk disalin.');
      }
    } catch (err) {
      alert('Gagal menyalin teks baris sebelumnya: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docId) return;

    if (!formData.name.trim()) {
      setErrorMsg('Nama barang atau kegiatan investasi wajib diisi.');
      return;
    }

    if (numQty < 1) {
      setErrorMsg('Jumlah (qty) minimal 1.');
      return;
    }

    if (numPrice <= 5000000) {
      setErrorMsg(
        `Nilai investasi (Harga satuan: Rp ${formatRupiah(numPrice)}) harus lebih besar dari ambang batas Rp 5.000.000 (BR-01). Item dengan nilai sampai ambang batas dimasukkan ke Anggaran Biaya.`
      );
      return;
    }

    // Validasi 300 karakter
    const textCheck = [
      { key: 'Strategi Objektif', val: formData.strategic_objective },
      { key: 'Counter Measure (KPI)', val: formData.kpi },
      { key: 'Program Kerja / Inisiatif Strategis', val: formData.work_program },
      { key: 'Strategic Action', val: formData.strategic_action },
    ];
    for (const f of textCheck) {
      if (f.val && f.val.trim().length > 300) {
        setErrorMsg(`Isian ${f.key} melebihi batas 300 karakter (${f.val.trim().length} karakter).`);
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        category_id: parseInt(formData.category_id, 10),
        priority_id: parseInt(formData.priority_id, 10),
        name: formData.name,
        qty: numQty,
        price: numPrice,
        plan_month: planMonth,
        strategic_objective: formData.strategic_objective,
        kpi: formData.kpi,
        work_program: formData.work_program,
        strategic_action: formData.strategic_action,
        note: formData.note,
        ...(editingLine ? { version: editingLine.version } : {}),
      };

      if (editingLine) {
        await investmentApi.updateInvestmentLine(editingLine.id, payload);
      } else {
        await investmentApi.createInvestmentLine(docId, payload);
      }

      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan baris investasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E6E0D6] shadow-2xs overflow-hidden mb-6">
      {/* Header Form */}
      <div className="p-4 border-b border-[#F0EBE2] bg-[#FAF7F2] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3D4E9C]/10 text-[#3D4E9C] flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1F2233]">
              {editingLine ? 'Edit Baris Anggaran Investasi' : '+ Tambah Item Anggaran Investasi (Capex)'}
            </h2>
            <p className="text-[11px] text-[#5E6070]">
              Pengadaan aset tetap dengan nilai lebih dari Rp 5.000.000 (BR-01). COA dan masa manfaat otomatis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSalinDariSebelumnya}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] border border-[#B9B4C9] hover:bg-[#F0EBE2] text-[#1F2233] rounded-md text-xs font-medium transition-colors cursor-pointer"
            title="Salin 4 isian teks dari baris investasi terakhir"
          >
            <Copy className="w-3.5 h-3.5 text-[#3D4E9C]" />
            Salin dari baris sebelumnya
          </button>
          {editingLine && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              title="Batal Edit"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Banner Informasi Ambang & Formula */}
      <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <b>Aturan BR-01 & BR-16:</b> Nilai item harus <b>&gt; Rp 5.000.000</b>. Penyusutan tahun berjalan ={' '}
            <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-[11px]">
              Jumlah ÷ Masa Manfaat × (12 − Bulan Rencana)
            </code>.
          </span>
        </div>
      </div>

      {/* Alert Error / Success */}
      {errorMsg && (
        <div className="mx-4 mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mx-4 mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4 text-left">
        {/* Row 1: Kategori, Prioritas, Nama Barang */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">
              Kategori Investasi <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full text-xs font-medium text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.useful_life_months} bln)
                </option>
              ))}
            </select>
            {/* Auto info COA & Masa Manfaat (BR-15) */}
            <div className="mt-1 text-[11px] text-[#5E6070] flex items-center justify-between">
              <span>COA: <b>{coaInfo}</b></span>
              <span>Susut: <b>{usefulLifeMonths} bulan</b></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">
              Prioritas <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.priority_id}
              onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
              className="w-full text-xs font-medium text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
              required
            >
              {priorities.map((prio) => (
                <option key={prio.id} value={prio.id}>
                  {prio.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">
              Nama Barang / Kegiatan Investasi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: USG 4D Live Doppler Obgyn"
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
              required
            />
          </div>
        </div>

        {/* Row 2: Qty, Harga Satuan, Jumlah, Bulan Rencana, Estimasi Penyusutan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 rounded-lg bg-[#FAF7F2] border border-[#E6E0D6] items-end">
          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">
              Qty <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
              className="w-full text-xs font-semibold text-center text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">
              Harga Satuan (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="> 5.000.000"
              className={`w-full text-xs font-semibold text-right text-[#1F2233] bg-white border rounded-md px-2.5 py-1.5 outline-none focus:border-[#3D4E9C] ${
                isBelowThreshold ? 'border-red-400 bg-red-50/50' : 'border-[#B9B4C9]'
              }`}
              required
            />
            {isBelowThreshold && (
              <span className="text-[10px] text-red-600 font-medium block mt-0.5">
                Nilai ≤ Rp 5.000.000 dialihkan ke Biaya!
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">
              Jumlah Investasi (Rp)
            </label>
            <div className="h-8 px-2.5 flex items-center justify-end font-bold text-xs text-[#14532D] bg-white border border-[#E6E0D6] rounded-md">
              Rp {formatRupiah(numAmount)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">
              Bulan Rencana <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.plan_month}
              onChange={(e) => setFormData({ ...formData, plan_month: e.target.value })}
              className="w-full text-xs font-medium text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1 flex items-center justify-between">
              <span>Penyusutan (Rp)</span>
              <span className="text-[10px] text-blue-600 font-normal">
                {usefulLifeMonths > 0 && planMonth < 12 ? `${12 - planMonth} bln` : '0 bln'}
              </span>
            </label>
            <div className="h-8 px-2.5 flex items-center justify-end font-bold text-xs text-blue-900 bg-blue-50/80 border border-blue-200 rounded-md">
              Rp {formatRupiah(liveDepreciation)}
            </div>
          </div>
        </div>

        {/* 4 Kotak Teks Panjang (FR-I6) */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-[#1F2233]">
            Deskripsi Strategis & Justifikasi Investasi (Maks. 300 Karakter per Kotak)
          </div>

          {/* 1. Strategi Objektif */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-[#5E6070]">
                1. Strategi Objektif
              </label>
              <span className={`text-[11px] font-mono ${formData.strategic_objective.length > 300 ? 'text-red-600 font-bold' : 'text-[#5E6070]'}`}>
                {formData.strategic_objective.length} / 300
              </span>
            </div>
            <textarea
              rows="2"
              value={formData.strategic_objective}
              onChange={(e) => setFormData({ ...formData, strategic_objective: e.target.value })}
              placeholder="Jelaskan tujuan strategis pengadaan aset ini..."
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
            />
            {/* Saran isian riwayat unit */}
            {suggestions.strategic_objective.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[10px] text-[#5E6070]">Saran unit:</span>
                {suggestions.strategic_objective.slice(0, 3).map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, strategic_objective: sugg })}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-2 py-0.5 border border-slate-200 truncate max-w-[250px] cursor-pointer"
                    title={sugg}
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Counter Measure (KPI) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-[#5E6070]">
                2. Counter Measure (KPI)
              </label>
              <span className={`text-[11px] font-mono ${formData.kpi.length > 300 ? 'text-red-600 font-bold' : 'text-[#5E6070]'}`}>
                {formData.kpi.length} / 300
              </span>
            </div>
            <textarea
              rows="2"
              value={formData.kpi}
              onChange={(e) => setFormData({ ...formData, kpi: e.target.value })}
              placeholder="Indikator kinerja atau ukuran keberhasilan investasi..."
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
            />
            {suggestions.kpi.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[10px] text-[#5E6070]">Saran unit:</span>
                {suggestions.kpi.slice(0, 3).map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, kpi: sugg })}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-2 py-0.5 border border-slate-200 truncate max-w-[250px] cursor-pointer"
                    title={sugg}
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Program Kerja / Inisiatif Strategis */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-[#5E6070]">
                3. Program Kerja / Inisiatif Strategis
              </label>
              <span className={`text-[11px] font-mono ${formData.work_program.length > 300 ? 'text-red-600 font-bold' : 'text-[#5E6070]'}`}>
                {formData.work_program.length} / 300
              </span>
            </div>
            <textarea
              rows="2"
              value={formData.work_program}
              onChange={(e) => setFormData({ ...formData, work_program: e.target.value })}
              placeholder="Program kerja atau payung inisiatif strategis terkait..."
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
            />
            {suggestions.work_program.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[10px] text-[#5E6070]">Saran unit:</span>
                {suggestions.work_program.slice(0, 3).map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, work_program: sugg })}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-2 py-0.5 border border-slate-200 truncate max-w-[250px] cursor-pointer"
                    title={sugg}
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Strategic Action */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-[#5E6070]">
                4. Strategic Action
              </label>
              <span className={`text-[11px] font-mono ${formData.strategic_action.length > 300 ? 'text-red-600 font-bold' : 'text-[#5E6070]'}`}>
                {formData.strategic_action.length} / 300
              </span>
            </div>
            <textarea
              rows="2"
              value={formData.strategic_action}
              onChange={(e) => setFormData({ ...formData, strategic_action: e.target.value })}
              placeholder="Langkah aksi nyata yang akan dilakukan unit..."
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
            />
            {suggestions.strategic_action.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[10px] text-[#5E6070]">Saran unit:</span>
                {suggestions.strategic_action.slice(0, 3).map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, strategic_action: sugg })}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-2 py-0.5 border border-slate-200 truncate max-w-[250px] cursor-pointer"
                    title={sugg}
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#F0EBE2]">
          {editingLine && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-[#5E6070] hover:bg-slate-100 rounded-md cursor-pointer"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#313f80] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {submitting ? 'Menyimpan...' : editingLine ? 'Perbarui Baris Investasi' : 'Simpan Baris Investasi'}
          </button>
        </div>
      </form>
    </div>
  );
}

InvestmentForm.propTypes = {
  docId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  categories: PropTypes.array,
  priorities: PropTypes.array,
  editingLine: PropTypes.object,
  onSaveSuccess: PropTypes.func,
  onCancel: PropTypes.func,
};
