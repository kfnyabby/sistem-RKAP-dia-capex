import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2, Save, AlertTriangle } from 'lucide-react';
import masterApi from '../../api/master.api';

export default function UnitFormModal({ isOpen, onClose, unit, coaList = [], onSuccess }) {
  const [formData, setFormData] = useState(() => ({
    source_key: unit?.source_key || '',
    code: unit?.code || '',
    name: unit?.name || '',
    company_id: unit?.company_id || 1,
    classification: unit?.classification || 'Klinik Pratama',
    revenue_coa_id: unit?.revenue_coa_id || '',
    revenue_coa_code: unit?.revenue_coa_code || '',
    revenue_coa_name: unit?.revenue_coa_name || '',
    needs_review: unit?.needs_review !== undefined ? unit.needs_review : false,
    review_notes: unit?.review_notes || '',
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
        code: formData.code && formData.code.trim() ? formData.code.trim() : null,
        source_key: formData.source_key && formData.source_key.trim() ? formData.source_key.trim() : null,
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
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {unit?.id ? 'Ubah Unit Kerja' : 'Tambah Unit Kerja'}
            </h2>
            <p className="text-xs text-slate-500">
              {unit?.source_key ? `ID Draf: ${unit.source_key}` : 'Unit kerja master'}
            </p>
          </div>
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

          {formData.needs_review && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Unit Memerlukan Review:</span>
                {formData.review_notes || 'Kode unit belum ditentukan atau memiliki catatan draf.'}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                ID Draf (source_key)
              </label>
              <input
                type="text"
                value={formData.source_key}
                onChange={(e) => setFormData({ ...formData, source_key: e.target.value })}
                placeholder="cth. CN-001"
                className="w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Kode Unit (Opsional)
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="cth. 9901"
                className="w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Perusahaan</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full text-xs"
              >
                <option value={1}>PT CN</option>
                <option value={2}>PT CNH</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nama Unit Kerja</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="cth. RS Semen Gresik / Klinik Pratama"
              className="w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Klasifikasi / Instalasi
              </label>
              <input
                type="text"
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                placeholder="cth. PUSAT LABA / NON PUSAT LABA"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                COA Pendapatan
              </label>
              <select
                value={formData.revenue_coa_id}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selectedCoa = coaList.find((c) => String(c.id) === String(selectedId));
                  setFormData({
                    ...formData,
                    revenue_coa_id: selectedId,
                    revenue_coa_code: selectedCoa ? selectedCoa.code : formData.revenue_coa_code,
                    revenue_coa_name: selectedCoa ? selectedCoa.name : formData.revenue_coa_name,
                  });
                }}
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
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Catatan Akuntansi / Review
            </label>
            <textarea
              rows="2"
              value={formData.review_notes}
              onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
              placeholder="Catatan status unit, penggabungan, atau isu verifikasi..."
              className="w-full text-xs"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.needs_review}
                onChange={(e) => setFormData({ ...formData, needs_review: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded border-slate-300"
              />
              <span className="text-xs text-amber-900 font-medium">
                Tandai butuh review Akuntansi
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-slate-300"
              />
              <span className="text-xs text-slate-700 font-medium">Unit aktif</span>
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
