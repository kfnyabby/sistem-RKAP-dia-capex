import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2, Save } from 'lucide-react';
import masterApi from '../../api/master.api';

export default function InvestmentCategoryModal({ isOpen, onClose, category, coaList = [], onSuccess }) {
  const [usefulLifeMonths, setUsefulLifeMonths] = useState(() => category?.useful_life_months || 60);
  const [depreciationCoaId, setDepreciationCoaId] = useState(() => category?.depreciation_coa_id || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !category) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await masterApi.updateInvestmentCategory(category.id, {
        useful_life_months: Number(usefulLifeMonths),
        depreciation_coa_id: depreciationCoaId ? Number(depreciationCoaId) : null,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui kategori investasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md my-8 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-base font-bold text-slate-800">
            Ubah Kategori Investasi
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nama Kategori</label>
            <input
              type="text"
              disabled
              value={category.name || ''}
              className="w-full text-xs bg-slate-100 text-slate-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Masa Manfaat (Bulan)
            </label>
            <input
              type="number"
              min="1"
              required
              value={usefulLifeMonths}
              onChange={(e) => setUsefulLifeMonths(e.target.value)}
              className="w-full text-xs"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Contoh: 120 bulan (10 tahun), 60 bulan (5 tahun), 48 bulan (4 tahun).
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Akun COA Biaya Penyusutan
            </label>
            <select
              value={depreciationCoaId}
              onChange={(e) => setDepreciationCoaId(e.target.value)}
              className="w-full text-xs"
            >
              <option value="">-- Pilih Akun COA Penyusutan --</option>
              {coaList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Otomatis terisi saat unit memilih kategori ini di Entry Investasi (BR-15).
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

InvestmentCategoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  category: PropTypes.object,
  coaList: PropTypes.array,
  onSuccess: PropTypes.func,
};
