import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  FilePlus2,
  Send,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Save,
} from 'lucide-react';
import { newItemRequestApi } from '../../api/newItemRequest.api';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

export default function NewItemRequestsSection({ doc, onLineAdded, disabled = false }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    spec: '',
    uom: 'Pcs',
    qty: '',
    est_price: '',
    reason: '',
  });

  // Edit State (modal or inline)
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    spec: '',
    uom: '',
    qty: '',
    est_price: '',
    reason: '',
  });

  const docId = doc?.id;

  const loadRequests = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await newItemRequestApi.getRequestsByDocId(docId);
      setRequests(res.data || []);
    } catch (err) {
      console.error('Gagal memuat permintaan barang baru:', err.message);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    if (!docId) return;
    if (!formData.name.trim() || !formData.uom.trim()) {
      setErrorMsg('Nama barang dan satuan wajib diisi.');
      return;
    }
    const qty = parseFloat(formData.qty);
    const estPrice = parseInt(formData.est_price, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Jumlah (qty) harus lebih besar dari 0.');
      return;
    }
    if (isNaN(estPrice) || estPrice < 0) {
      setErrorMsg('Estimasi harga harus bernilai 0 atau lebih.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await newItemRequestApi.createDraftRequest(docId, {
        name: formData.name,
        spec: formData.spec,
        uom: formData.uom,
        qty,
        est_price: estPrice,
        reason: formData.reason,
      });

      setFormData({
        name: '',
        spec: '',
        uom: 'Pcs',
        qty: '',
        est_price: '',
        reason: '',
      });

      setSuccessMsg('Draft permintaan barang baru berhasil ditambahkan.');
      await loadRequests();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menambahkan permintaan barang baru.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (req) => {
    setEditingItem(req);
    setEditFormData({
      name: req.name,
      spec: req.spec || '',
      uom: req.uom,
      qty: req.qty,
      est_price: req.est_price,
      reason: req.reason || '',
    });
    setErrorMsg('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const qty = parseFloat(editFormData.qty);
    const estPrice = parseInt(editFormData.est_price, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Jumlah (qty) harus lebih besar dari 0.');
      return;
    }
    if (isNaN(estPrice) || estPrice < 0) {
      setErrorMsg('Estimasi harga harus bernilai 0 atau lebih.');
      return;
    }

    setSubmitting(true);
    try {
      await newItemRequestApi.updateDraftRequest(editingItem.id, {
        name: editFormData.name,
        spec: editFormData.spec,
        uom: editFormData.uom,
        qty,
        est_price: estPrice,
        reason: editFormData.reason,
      });

      setEditingItem(null);
      setSuccessMsg('Permintaan barang baru berhasil diperbarui.');
      await loadRequests();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui permintaan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus draft permintaan ini?')) return;
    try {
      await newItemRequestApi.deleteDraftRequest(id);
      setSuccessMsg('Draft permintaan berhasil dihapus.');
      await loadRequests();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus permintaan.');
    }
  };

  const handleSendToAccounting = async () => {
    const draftCount = requests.filter((r) => r.status === 'DRAFT').length;
    if (draftCount === 0) {
      alert('Tidak ada permintaan berstatus DRAFT yang dapat dikirim.');
      return;
    }

    if (
      !window.confirm(
        `Kirim ${draftCount} permintaan barang baru ke Akuntansi? Setelah dikirim, permintaan tidak dapat diubah lagi.`
      )
    ) {
      return;
    }

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await newItemRequestApi.sendRequests(docId);
      setSuccessMsg(res.message || 'Permintaan berhasil dikirim ke Akuntansi.');
      await loadRequests();
      if (typeof onLineAdded === 'function') {
        onLineAdded();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengirim permintaan ke Akuntansi.');
    } finally {
      setSending(false);
    }
  };

  const draftRequests = requests.filter((r) => r.status === 'DRAFT');
  const isDocDraft = doc && (doc.status === 'DRAFT' || doc.status === 'DIKEMBALIKAN') && !disabled;

  return (
    <div className="bg-white rounded-lg border border-[#E6E0D6] shadow-2xs overflow-hidden mt-6">
      {/* Header Section */}
      <div className="p-4 border-b border-[#F0EBE2] bg-[#FAF7F2] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3D4E9C]/10 text-[#3D4E9C] flex items-center justify-center shrink-0">
            <FilePlus2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1F2233]">
              Permintaan Barang Baru (Belum Ada di Master)
            </h2>
            <p className="text-[11px] text-[#5E6070]">
              Ajukan barang logistik baru jika barang tidak ditemukan pada daftar master.
            </p>
          </div>
        </div>

        {isDocDraft && draftRequests.length > 0 && (
          <button
            type="button"
            onClick={handleSendToAccounting}
            disabled={sending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#313f80] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Mengirim...' : `Kirim ke Akuntansi (${draftRequests.length})`}
          </button>
        )}
      </div>

      {/* Banner Edukasi BR-17 */}
      <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <b>Aturan BR-17:</b> Barang baru belum masuk ke total anggaran biaya sampai Akuntansi
          menentukan COA-nya. Setelah COA ditentukan, baris biaya otomatis masuk ke dokumen.
        </span>
      </div>

      {/* Alert Messages */}
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

      {/* Form Tambah Permintaan (Hanya aktif saat dokumen DRAFT) */}
      {isDocDraft ? (
        <form onSubmit={handleCreateDraft} className="p-4 border-b border-[#F0EBE2] bg-white">
          <div className="text-xs font-bold text-[#1F2233] mb-2.5">
            + Tambah Draft Permintaan Barang
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-medium text-[#5E6070] mb-1">
                Nama Barang <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Contoh: Tabung Oksigen Portable 2L"
                className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#5E6070] mb-1">
                Spesifikasi
              </label>
              <input
                type="text"
                name="spec"
                value={formData.spec}
                onChange={handleInputChange}
                placeholder="Merk / tipe / spek"
                className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#5E6070] mb-1">
                Satuan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="uom"
                value={formData.uom}
                onChange={handleInputChange}
                placeholder="Pcs / Unit / Box"
                className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#5E6070] mb-1">
                Qty RKAP <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                name="qty"
                value={formData.qty}
                onChange={handleInputChange}
                placeholder="1"
                className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#5E6070] mb-1">
                Est. Harga Satuan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                name="est_price"
                value={formData.est_price}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
                required
              />
            </div>

            <div className="lg:col-span-5">
              <label className="block text-[11px] font-medium text-[#5E6070] mb-1">
                Alasan Kebutuhan
              </label>
              <input
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Contoh: Pengadaan alat darurat untuk kesiapan ruang ICU baru"
                className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-2.5 py-1.5 outline-none focus:border-[#3D4E9C]"
              />
            </div>

            <div className="lg:col-span-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-8 flex items-center justify-center gap-1.5 bg-[#FAF7F2] border border-[#B9B4C9] text-[#1F2233] hover:bg-[#F0EBE2] rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Simpan Draft
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {/* Tabel Permintaan */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E6E0D6] bg-[#FAF7F2] text-[#5E6070]">
              <th className="py-2.5 px-3 font-semibold w-10 text-center">No.</th>
              <th className="py-2.5 px-3 font-semibold min-w-[200px]">Barang & Spesifikasi</th>
              <th className="py-2.5 px-3 font-semibold w-16 text-center">Satuan</th>
              <th className="py-2.5 px-3 font-semibold w-16 text-center">Qty</th>
              <th className="py-2.5 px-3 font-semibold text-right w-24">Est. Harga (Rp)</th>
              <th className="py-2.5 px-3 font-semibold text-right w-28">Est. Jumlah (Rp)</th>
              <th className="py-2.5 px-3 font-semibold min-w-[150px]">Alasan</th>
              <th className="py-2.5 px-3 font-semibold w-36 text-center">Status</th>
              <th className="py-2.5 px-3 font-semibold min-w-[180px]">Penetapan Akuntansi</th>
              <th className="py-2.5 px-3 font-semibold w-16 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EBE2]">
            {loading ? (
              <tr>
                <td colSpan="10" className="py-6 text-center text-slate-400">
                  Memuat daftar permintaan barang...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-6 text-center text-slate-400">
                  Belum ada permintaan barang baru untuk dokumen ini.
                </td>
              </tr>
            ) : (
              requests.map((req, idx) => (
                <tr key={req.id} className="hover:bg-[#FAF7F2] transition-colors">
                  <td className="py-2.5 px-3 text-center text-[#5E6070]">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-[#1F2233]">{req.name}</div>
                    {req.spec && (
                      <div className="text-[11px] text-[#5E6070]">Spek: {req.spec}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#5E6070]">{req.uom}</td>
                  <td className="py-2.5 px-3 text-center font-medium text-[#1F2233]">{req.qty}</td>
                  <td className="py-2.5 px-3 text-right text-[#5E6070]">
                    {formatRupiah(req.est_price)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#14532D]">
                    {formatRupiah(req.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-[#5E6070]">
                    {req.reason || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {req.status === 'DRAFT' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-300">
                        Draft
                      </span>
                    )}
                    {req.status === 'MENUNGGU_COA' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-300">
                        <Clock className="w-3 h-3 mr-1" />
                        Menunggu COA
                      </span>
                    )}
                    {req.status === 'COA_DITENTUKAN' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        COA Ditentukan
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {req.status === 'COA_DITENTUKAN' ? (
                      <div>
                        <div className="font-bold text-[#3D4E9C]">
                          {req.coa_code} - {req.coa_name}
                        </div>
                        {req.item_code && (
                          <div className="text-[11px] text-[#5E6070]">
                            Kode: <span className="font-mono">{req.item_code}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">
                        — Belum ditentukan
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {req.status === 'DRAFT' && isDocDraft ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(req)}
                          title="Edit draft"
                          className="p-1 text-slate-400 hover:text-[#3D4E9C] rounded transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(req.id)}
                          title="Hapus draft"
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit Draft */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E6E0D6] max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0EBE2] bg-[#FAF7F2]">
              <h3 className="text-sm font-bold text-[#1F2233]">Edit Draft Permintaan Barang</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5E6070] mb-1">
                  Nama Barang <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-3 py-2 outline-none focus:border-[#3D4E9C]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5E6070] mb-1">
                    Spesifikasi
                  </label>
                  <input
                    type="text"
                    value={editFormData.spec}
                    onChange={(e) => setEditFormData({ ...editFormData, spec: e.target.value })}
                    className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-3 py-2 outline-none focus:border-[#3D4E9C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E6070] mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.uom}
                    onChange={(e) => setEditFormData({ ...editFormData, uom: e.target.value })}
                    className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-3 py-2 outline-none focus:border-[#3D4E9C]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5E6070] mb-1">
                    Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editFormData.qty}
                    onChange={(e) => setEditFormData({ ...editFormData, qty: e.target.value })}
                    className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-3 py-2 outline-none focus:border-[#3D4E9C]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E6070] mb-1">
                    Est. Harga (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.est_price}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, est_price: e.target.value })
                    }
                    className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-3 py-2 outline-none focus:border-[#3D4E9C]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5E6070] mb-1">Alasan</label>
                <textarea
                  rows="2"
                  value={editFormData.reason}
                  onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-3 py-2 outline-none focus:border-[#3D4E9C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0EBE2]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 text-xs text-[#5E6070] hover:bg-slate-100 rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#3D4E9C] text-white rounded text-xs font-semibold hover:bg-[#313f80] cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

NewItemRequestsSection.propTypes = {
  doc: PropTypes.object,
  onLineAdded: PropTypes.func,
  disabled: PropTypes.bool,
};
