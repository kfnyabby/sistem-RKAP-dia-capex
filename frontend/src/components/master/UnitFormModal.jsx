import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2, Save } from 'lucide-react';
import masterApi from '../../api/master.api';

export default function UnitFormModal({ isOpen, onClose, unit, coaList = [], onSuccess }) {
  const [formData, setFormData] = useState(() => ({
    code: unit?.code || '',
    name: unit?.name || '',
    company_id: unit?.company_id || 1,
    classification: unit?.classification || 'Klinik Pratama',
    revenue_coa_id: unit?.revenue_coa_id || '',
    is_active: unit?.is_active !== undefined ? unit.is_active : true,
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
        company_id: Number(formData.company_id),
        revenue_coa_id: formData.revenue_coa_id ? Number(formData.revenue_coa_id) : null,
      };

      if (unit?.id) {
        await masterApi.updateUnit(unit.id, payload);
      } else {
        await masterApi.createUnit(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data unit kerja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md my-8 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-base font-bold text-slate-800">
            {unit?.id ? 'Ubah Unit Kerja' : 'Tambah Unit Kerja'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Kode Unit</label>
              <input
                type="text"
                required
                disabled={Boolean(unit?.id)}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="cth. 9901"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Perusahaan</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full text-xs"
              >
                <option value={1}>PT Cipta Nirmala (CN)</option>
                <option value={2}>PT Cipta Nirmala Husada (CNH)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nama Unit</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="cth. RS Semen Gresik / Klinik Pratama"
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Klasifikasi / Instalasi</label>
            <input
              type="text"
              value={formData.classification}
              onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
              placeholder="cth. Rawat Inap, Kantor Pusat, Penunjang Medis"
              className="w-full text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">COA Pendapatan (Opsional)</label>
            <select
              value={formData.revenue_coa_id}
              onChange={(e) => setFormData({ ...formData, revenue_coa_id: e.target.value })}
              className="w-full text-xs"
            >
              <option value="">-- Belum Ditentukan --</option>
              {coaList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="unit-active-check"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-slate-300"
            />
            <label htmlFor="unit-active-check" className="text-xs text-slate-700 font-medium cursor-pointer">
              Unit aktif (dapat dipilih di pengajuan RKAP)
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

UnitFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  unit: PropTypes.object,
  coaList: PropTypes.array,
  onSuccess: PropTypes.func,
};
