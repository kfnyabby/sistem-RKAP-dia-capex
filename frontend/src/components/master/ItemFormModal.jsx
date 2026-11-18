import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Loader2, Save } from 'lucide-react';
import masterApi from '../../api/master.api';

export default function ItemFormModal({ isOpen, onClose, item, coaList = [], onSuccess }) {
  const initialPriceCn =
    item?.prices?.find((p) => p.company_code === 'CN')?.price ?? item?.price_cn ?? 0;
  const initialPriceCnh =
    item?.prices?.find((p) => p.company_code === 'CNH')?.price ?? item?.price_cnh ?? 0;

  const [formData, setFormData] = useState(() => ({
    code: item?.code || '',
    product_code: item?.product_code || '',
    name: item?.name || '',
    group_name: item?.group_name || 'Umum',
    uom: item?.uom || 'Pcs',
    price_cn: initialPriceCn,
    price_cnh: initialPriceCnh,
    coa_id: item?.coa_id || '',
    inventory_coa_id: item?.inventory_coa_id || '',
    is_active: item?.is_active !== undefined ? item.is_active : true,
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
        prices: [
          { company_code: 'CN', period_year: 2027, price: Number(formData.price_cn) || 0 },
          { company_code: 'CNH', period_year: 2027, price: Number(formData.price_cnh) || 0 },
        ],
        coa_id: formData.coa_id ? Number(formData.coa_id) : null,
        inventory_coa_id: formData.inventory_coa_id ? Number(formData.inventory_coa_id) : null,
      };

      if (item?.id) {
        await masterApi.updateItem(item.id, payload);
      } else {
        await masterApi.createItem(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data master barang');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-base font-bold text-slate-800">
            {item?.id ? 'Ubah Master Barang' : 'Tambah Master Barang'}
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
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Kode Barang (ID)</label>
              <input
                type="text"
                required
                disabled={Boolean(item?.id)}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="cth. 101 atau BRG-001"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Kode Produk (Opsional)</label>
              <input
                type="text"
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                placeholder="cth. 6L"
                className="w-full text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nama Barang</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nama spesifikasi lengkap barang..."
              className="w-full text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Golongan</label>
              <input
                type="text"
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                placeholder="Bahan Cetakan"
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Satuan Beli</label>
              <input
                type="text"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                placeholder="Pcs / Lembar"
                className="w-full text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">HPP CN (Rupiah)</label>
              <input
                type="number"
                min="0"
                value={formData.price_cn}
                onChange={(e) => setFormData({ ...formData, price_cn: e.target.value })}
                placeholder="0"
                className="w-full text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">HPP CNH (Rupiah)</label>
              <input
                type="number"
                min="0"
                value={formData.price_cnh}
                onChange={(e) => setFormData({ ...formData, price_cnh: e.target.value })}
                placeholder="0"
                className="w-full text-xs bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Akun COA Biaya</label>
            <select
              value={formData.coa_id}
              onChange={(e) => setFormData({ ...formData, coa_id: e.target.value })}
              className="w-full text-xs"
            >
              <option value="">-- Tanpa COA (Belum Ditentukan) --</option>
              {coaList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">COA Persediaan (Opsional)</label>
            <select
              value={formData.inventory_coa_id}
              onChange={(e) => setFormData({ ...formData, inventory_coa_id: e.target.value })}
              className="w-full text-xs"
            >
              <option value="">-- Tidak Ada --</option>
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
              id="item-active-check"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-600 rounded border-slate-300"
            />
            <label htmlFor="item-active-check" className="text-xs text-slate-700 font-medium cursor-pointer">
              Barang aktif (dapat dipilih di pengajuan anggaran)
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

ItemFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  item: PropTypes.object,
  coaList: PropTypes.array,
  onSuccess: PropTypes.func,
};
