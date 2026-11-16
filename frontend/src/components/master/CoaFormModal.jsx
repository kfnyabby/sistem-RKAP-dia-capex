import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2, Save } from 'lucide-react';
import masterApi from '../../api/master.api';

export default function CoaFormModal({ isOpen, onClose, coa, coaGroups = [], onSuccess }) {
  const [formData, setFormData] = useState(() => ({
    code: coa?.code || '',
    name: coa?.name || '',
    type: coa?.type || 'biaya',
    coa_group_id: coa?.coa_group_id || '',
    category: coa?.category || '',
    is_active: coa?.is_active !== undefined ? coa.is_active : true,
  }));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...formData,
        coa_group_id: formData.coa_group_id ? Number(formData.coa_group_id) : null,
      };

      if (coa?.id) {
        await masterApi.updateCoa(coa.id, payload);
      } else {
        await masterApi.createCoa(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data akun COA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md my-8 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-base font-bold text-slate-800">
            {coa?.id ? 'Ubah Akun COA' : 'Tambah Akun COA'}
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
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Kode Akun COA</label>
            <input
              type="text"
              required
              disabled={Boolean(coa?.id)}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="cth. 5.8.3"
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nama Akun COA</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Biaya Cetak & Fotocopy"
              className="w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Tipe Akun</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full text-xs"
              >
                <option value="biaya">Biaya</option>
                <option value="investasi">Investasi / Aset Tetap</option>
                <option value="pendapatan">Pendapatan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Kelompok Biaya</label>
              <select
                value={formData.coa_group_id}
                onChange={(e) => setFormData({ ...formData, coa_group_id: e.target.value })}
                className="w-full text-xs"
              >
                <option value="">-- Tanpa Kelompok --</option>
                {coaGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} - {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Kategori Tambahan</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="cth. Biaya Administrasi Umum"
              className="w-full text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="coa-active-check"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-slate-300"
            />
            <label htmlFor="coa-active-check" className="text-xs text-slate-700 font-medium cursor-pointer">
              Akun aktif
            </label>
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
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CoaFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  coa: PropTypes.object,
  coaGroups: PropTypes.array,
  onSuccess: PropTypes.func,
};
