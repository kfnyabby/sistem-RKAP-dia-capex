import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Save,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { newItemRequestApi } from '../../api/newItemRequest.api';
import { masterApi } from '../../api/master.api';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function PenentuanCoaSection() {
  const [queue, setQueue] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('MENUNGGU_COA');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [coasList, setCoasList] = useState([]);
  const [loadingCoas, setLoadingCoas] = useState(false);
  const [modalForm, setModalForm] = useState({
    coa_id: '',
    item_code: '',
    price: '',
  });
  const [submittingModal, setSubmittingModal] = useState(false);

  // Load Queue Data
  const loadQueue = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await newItemRequestApi.getAccountingQueue({
        status: statusFilter,
        search: search.trim() || undefined,
        per_page: 50,
      });
      setQueue(res.data || []);
      setTotalCount(res.meta?.total || 0);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat antrean penentuan COA');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Load Master COA for Dropdown
  const loadCoas = async () => {
    if (coasList.length > 0) return;
    setLoadingCoas(true);
    try {
      const res = await masterApi.getCoas({ category: 'biaya', per_page: 500 });
      setCoasList(res.data || []);
    } catch (err) {
      console.error('Gagal memuat master COA:', err.message);
    } finally {
      setLoadingCoas(false);
    }
  };

  const handleOpenAssignModal = (req) => {
    setSelectedReq(req);
    setModalForm({
      coa_id: '',
      item_code: `BRG-${req.id.toString().padStart(5, '0')}`,
      price: req.est_price,
    });
    setErrorMsg('');
    loadCoas();
  };

  const handleCloseModal = () => {
    setSelectedReq(null);
    setModalForm({ coa_id: '', item_code: '', price: '' });
  };

  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    if (!modalForm.coa_id) {
      alert('Silakan pilih COA yang sesuai.');
      return;
    }

    setSubmittingModal(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await newItemRequestApi.assignCoa(selectedReq.id, {
        coa_id: parseInt(modalForm.coa_id, 10),
        item_code: modalForm.item_code.trim() || undefined,
        price: parseInt(modalForm.price, 10),
      });

      setSuccessMsg(res.message || 'COA berhasil ditentukan dan barang baru ditambahkan ke master.');
      handleCloseModal();
      await loadQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menentukan COA');
    } finally {
      setSubmittingModal(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Top Banner / Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-700" />
            Antrean Penentuan COA Barang Baru (FR-M13)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Khusus Akuntansi (BR-18): Menentukan akun COA dan harga perusahaan untuk barang baru
            yang diajukan oleh unit kerja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadQueue}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadQueue();
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
              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 outline-none focus:border-purple-600"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-purple-700 text-white rounded-md text-xs font-semibold hover:bg-purple-800 transition-colors cursor-pointer shrink-0"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 outline-none focus:border-purple-600 font-medium"
          >
            <option value="MENUNGGU_COA">Menunggu Penentuan COA</option>
            <option value="COA_DITENTUKAN">Sudah Ditentukan</option>
            <option value="ALL">Semua Permintaan (Termasuk Selesai)</option>
          </select>
        </div>
      </div>

      {/* Antrean Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold w-10 text-center">No.</th>
                <th className="py-2.5 px-3 font-semibold w-28">Waktu Diajukan</th>
                <th className="py-2.5 px-3 font-semibold min-w-[150px]">Unit Pengaju</th>
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Barang & Spesifikasi</th>
                <th className="py-2.5 px-3 font-semibold w-20 text-center">Satuan / Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Est. Total</th>
                <th className="py-2.5 px-3 font-semibold min-w-[140px]">Alasan</th>
                <th className="py-2.5 px-3 font-semibold w-28 text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold min-w-[160px]">Penetapan COA</th>
                <th className="py-2.5 px-3 font-semibold w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Memuat antrean penentuan COA...
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-500">
                    Tidak ada permintaan barang baru dalam antrean ini.
                  </td>
                </tr>
              ) : (
                queue.map((req, idx) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">
                        [{req.unit_code || '-'}] {req.unit_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {req.company_code} · RKAP {req.period_year || '2027'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{req.name}</div>
                      {req.spec && (
                        <div className="text-[11px] text-slate-500">Spek: {req.spec}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-slate-800">{req.qty}</span>{' '}
                      <span className="text-[11px] text-slate-500">{req.uom}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="font-bold text-emerald-700">Rp {formatRupiah(req.amount)}</div>
                      <div className="text-[11px] text-slate-500">
                        @ Rp {formatRupiah(req.est_price)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                      {req.reason || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {req.status === 'MENUNGGU_COA' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Menunggu COA
                        </span>
                      ) : req.status === 'COA_DITENTUKAN' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          COA Ditentukan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {req.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {req.status === 'COA_DITENTUKAN' ? (
                        <div>
                          <div className="font-bold text-purple-700">
                            {req.coa_code} - {req.coa_name}
                          </div>
                          {req.item_code && (
                            <div className="text-[11px] text-slate-500">
                              Kode Barang: <span className="font-mono">{req.item_code}</span>
                            </div>
                          )}
                          {req.manual_handling_note && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 p-1 rounded mt-1 border border-amber-200">
                              {req.manual_handling_note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">— Belum ditentukan</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {req.status === 'MENUNGGU_COA' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(req)}
                          className="px-2.5 py-1.5 bg-purple-700 text-white hover:bg-purple-800 rounded text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                        >
                          Tentukan COA
                        </button>
                      ) : (
                        <span className="text-emerald-700 text-xs font-medium">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
          <span>Menampilkan <b>{queue.length}</b> dari total <b>{totalCount}</b> permintaan</span>
        </div>
      </div>

      {/* Modal Dialog Penentuan COA */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Penentuan COA & Master Barang Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssign} className="p-5 space-y-4">
              {/* Detail Ringkas Barang yang Diajukan */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Unit Pengaju:</span>
                  <span className="font-semibold text-slate-800">
                    [{selectedReq.unit_code}] {selectedReq.unit_name} ({selectedReq.company_code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Barang:</span>
                  <span className="font-bold text-slate-900">{selectedReq.name}</span>
                </div>
                {selectedReq.spec && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Spesifikasi:</span>
                    <span className="text-slate-700">{selectedReq.spec}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Qty & Satuan:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedReq.qty} {selectedReq.uom}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimasi Pengaju:</span>
                  <span className="font-semibold text-slate-800">
                    @ Rp {formatRupiah(selectedReq.est_price)} (Total: Rp{' '}
                    {formatRupiah(selectedReq.amount)})
                  </span>
                </div>
              </div>

              {/* Input Form Penentuan COA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Akun Biaya (COA) <span className="text-red-500">*</span>
                </label>
                {loadingCoas ? (
                  <div className="text-xs text-slate-400 py-1.5">Memuat master COA...</div>
                ) : (
                  <select
                    value={modalForm.coa_id}
                    onChange={(e) => setModalForm({ ...modalForm, coa_id: e.target.value })}
                    className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-purple-600 font-medium"
                    required
                  >
                    <option value="">-- Pilih COA Biaya --</option>
                    {coasList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} ({c.group_name || 'Biaya'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Barang Master
                  </label>
                  <input
                    type="text"
                    value={modalForm.item_code}
                    onChange={(e) => setModalForm({ ...modalForm, item_code: e.target.value })}
                    placeholder="Contoh: BRG-00123"
                    className="w-full text-xs font-mono text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-purple-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Otomatis unik jika dikosongkan.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Master Perusahaan (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.price}
                    onChange={(e) => setModalForm({ ...modalForm, price: e.target.value })}
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-purple-600"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Disimpan untuk perusahaan {selectedReq.company_code}.
                  </span>
                </div>
              </div>

              {/* Dampak Aturan Bisnis BR-17 */}
              <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200 text-purple-900 text-xs">
                <b>Aturan Bisnis BR-17 & Master Integrasi:</b>
                <p className="mt-0.5 text-[11px] text-purple-800">
                  Item baru akan dibuat di master barang dengan COA terpilih dan harga perusahaan.
                  Jika dokumen unit masih DRAFT, baris biaya otomatis masuk ke dokumen dan total
                  dokumen dihitung ulang.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingModal}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-700 text-white rounded-md text-xs font-semibold hover:bg-purple-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submittingModal ? 'Menyimpan...' : 'Simpan & Tentukan COA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
