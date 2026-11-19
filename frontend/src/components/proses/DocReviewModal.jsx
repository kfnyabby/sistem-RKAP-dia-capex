import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  History,
  Send,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { workflowApi } from '../../api/workflow.api';
import { budgetApi } from '../../api/budget.api';
import { investmentApi } from '../../api/investment.api';
import { useAuth } from '../../auth/AuthContext';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function DocReviewModal({ doc, onClose, onSuccess }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('lines'); // 'lines' | 'history'

  // Data baris anggaran
  const [lines, setLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);

  // Riwayat status
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // State komentar aktif per baris
  const [selectedCommentLine, setSelectedCommentLine] = useState(null); // { lineId, lineType, title }
  const [lineComments, setLineComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // Dialog Return dengan Catatan Wajib (BR-08)
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load baris anggaran
  useEffect(() => {
    if (!doc?.id) return;
    setLoadingLines(true);
    if (doc.type === 'INVESTASI') {
      investmentApi
        .getInvestmentLines(doc.id)
        .then((res) => setLines(res.data || []))
        .catch((err) => console.error('Gagal memuat baris investasi:', err.message))
        .finally(() => setLoadingLines(false));
    } else {
      budgetApi
        .getExpenseLines(doc.id, { per_page: 250 })
        .then((res) => setLines(res.data || []))
        .catch((err) => console.error('Gagal memuat baris biaya:', err.message))
        .finally(() => setLoadingLines(false));
    }
  }, [doc?.id, doc?.type]);

  // Load riwayat status saat tab history aktif
  useEffect(() => {
    if (activeTab === 'history' && doc?.id) {
      setLoadingHistory(true);
      workflowApi
        .getDocHistory(doc.id)
        .then((res) => setHistoryList(res.history || []))
        .catch((err) => console.error('Gagal memuat riwayat dokumen:', err.message))
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab, doc?.id]);

  // Load komentar baris saat popup komentar dibuka
  const openLineComments = async (line) => {
    const lineType = doc.type === 'INVESTASI' ? 'investment' : 'expense';
    const lineId = line.id;
    const title = line.name || line.item_name || 'Baris Anggaran';
    setSelectedCommentLine({ lineId, lineType, title });
    setLoadingComments(true);
    try {
      const res = await workflowApi.getLineComments(doc.id, lineType, lineId);
      setLineComments(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil komentar:', err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedCommentLine) return;
    try {
      const res = await workflowApi.addLineComment(
        doc.id,
        selectedCommentLine.lineType,
        selectedCommentLine.lineId,
        newCommentText.trim()
      );
      setLineComments((prev) => [...prev, res.data]);
      setNewCommentText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan komentar');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await workflowApi.deleteLineComment(commentId);
      setLineComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus komentar');
    }
  };

  // 1. Setujui Dokumen
  const handleApprove = async () => {
    if (!window.confirm(`Setujui dokumen anggaran ${doc.type} unit [${doc.unit_code}] ${doc.unit_name}?`)) {
      return;
    }
    setActionLoading(true);
    setErrorMessage('');
    try {
      await workflowApi.approveDoc(doc.id);
      alert('Dokumen berhasil disetujui');
      onSuccess();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menyetujui dokumen');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Kembalikan Dokumen (Catatan Wajib BR-08)
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnNote.trim()) {
      alert('Catatan pengembalian wajib diisi (BR-08)');
      return;
    }
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await workflowApi.returnDoc(doc.id, returnNote.trim());
      alert(
        `Dokumen berhasil dikembalikan.${
          res.auto_reopened
            ? ' Akses pengisian unit telah dibuka otomatis untuk perbaikan (BR-14).'
            : ''
        }`
      );
      setShowReturnDialog(false);
      onSuccess();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengembalikan dokumen');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Finalisasi Dokumen (Akuntansi)
  const handleFinalize = async () => {
    if (
      !window.confirm(
        `Finalisasi dokumen ini? Dokumen akan berstatus FINAL dan terkunci dari perubahan.`
      )
    ) {
      return;
    }
    setActionLoading(true);
    setErrorMessage('');
    try {
      await workflowApi.finalizeDoc(doc.id);
      alert('Dokumen berhasil difinalisasi');
      onSuccess();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal memfinalisasi dokumen');
    } finally {
      setActionLoading(false);
    }
  };

  // Maker-Checker check (BR-07)
  const isMaker = doc.submitted_by === user?.id;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-[#E6E0D6] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E6E0D6] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-[#1F2233]">
                Telaah Dokumen Anggaran · {doc.type}
              </span>
              <span className="chip nt">
                [{doc.unit_code || 'UNIT'}] {doc.unit_name}
              </span>
              <span
                className={`chip ${
                  doc.status === 'FINAL'
                    ? 'ok'
                    : doc.status === 'DISETUJUI'
                      ? 'ok'
                      : doc.status === 'DIKEMBALIKAN'
                        ? 'bd'
                        : 'wn'
                }`}
              >
                Status: {doc.status}
              </span>
            </div>
            <p className="text-xs text-[#5E6070] mt-1">
              Periode RKAP {doc.period_year} ({doc.company_code}) · Total Anggaran:{' '}
              <b className="text-[#1F2233]">Rp {formatRupiah(doc.total_amount)}</b> · Diajukan oleh:{' '}
              <span>{doc.submitted_by_name || 'PIC Unit'}</span> ({formatDate(doc.submitted_at)})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#5E6070] hover:text-[#1F2233] hover:bg-[#F0EBE2] rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Maker-Checker Warning */}
        {isMaker && (user?.role === 'manager' || user?.role === 'akuntansi') && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <b>Pemberitahuan Maker-Checker (BR-07):</b> Anda adalah pengaju dokumen ini. Anda tidak
              dapat menyetujui dokumen yang Anda ajukan sendiri. Persetujuan harus dilakukan oleh
              Validator/Manager lain atau Akuntansi.
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-[#E6E0D6] flex gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('lines')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'lines'
                ? 'border-[#3D4E9C] text-[#3D4E9C]'
                : 'border-transparent text-[#5E6070] hover:text-[#1F2233]'
            }`}
          >
            Rincian Baris Anggaran ({lines.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#3D4E9C] text-[#3D4E9C]'
                : 'border-transparent text-[#5E6070] hover:text-[#1F2233]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat Status & Audit
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'lines' ? (
            loadingLines ? (
              <div className="py-12 text-center text-xs text-[#5E6070]">Memuat rincian baris...</div>
            ) : lines.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#5E6070]">
                Belum ada baris anggaran pada dokumen ini.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#E6E0D6] rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAF7F2] text-[#1F2233] font-bold border-b border-[#E6E0D6]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">
                        {doc.type === 'INVESTASI' ? 'Nama Kegiatan / Investasi' : 'Barang Logistik'}
                      </th>
                      {doc.type === 'INVESTASI' ? (
                        <>
                          <th className="py-2.5 px-3">Kategori</th>
                          <th className="py-2.5 px-3">Prioritas</th>
                          <th className="py-2.5 px-3 text-center">Bulan</th>
                          <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Total (Rp)</th>
                          <th className="py-2.5 px-3 text-right">Penyusutan</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-3">Satuan</th>
                          <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                          <th className="py-2.5 px-3 text-center">Qty RKAP</th>
                          <th className="py-2.5 px-3 text-right">Total Biaya (Rp)</th>
                          <th className="py-2.5 px-3">COA Beban</th>
                        </>
                      )}
                      <th className="py-2.5 px-3 text-center w-20">Komentar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE2]">
                    {lines.map((l, idx) => (
                      <tr key={l.id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-2.5 px-3 text-center text-[#5E6070]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#1F2233]">
                          {doc.type === 'INVESTASI' ? l.name : l.item_name}
                          {l.note && <div className="text-[11px] text-[#5E6070] font-normal italic">{l.note}</div>}
                        </td>
                        {doc.type === 'INVESTASI' ? (
                          <>
                            <td className="py-2.5 px-3 text-[#5E6070]">{l.category_name}</td>
                            <td className="py-2.5 px-3">
                              <span className="chip nt text-[10px]">{l.priority_name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">{l.plan_month}</td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              Rp {formatRupiah(l.price)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">{l.qty}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1F2233]">
                              Rp {formatRupiah(l.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#5E6070]">
                              Rp {formatRupiah(l.depreciation_amount)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 text-[#5E6070]">{l.uom || 'Unit'}</td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              Rp {formatRupiah(l.price || l.price_snapshot)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">{l.qty}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1F2233]">
                              Rp {formatRupiah(l.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-[#5E6070]">
                              [{l.coa_code}] {l.coa_name}
                            </td>
                          </>
                        )}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => openLineComments(l)}
                            className="p-1 rounded hover:bg-[#F0EBE2] text-[#3D4E9C] transition cursor-pointer"
                            title="Komentar Validator"
                          >
                            <MessageSquare className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Tab Timeline Riwayat Status */
            loadingHistory ? (
              <div className="py-12 text-center text-xs text-[#5E6070]">Memuat riwayat status...</div>
            ) : historyList.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#5E6070]">
                Belum ada riwayat transisi status tercatat.
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl mx-auto py-2">
                {historyList.map((h, i) => (
                  <div key={h.id || i} className="flex items-start gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-[#3D4E9C]/10 text-[#3D4E9C] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="flex-1 bg-[#FAF7F2] p-3.5 rounded-lg border border-[#E6E0D6]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#1F2233]">
                          {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
                        </span>
                        <span className="text-[11px] text-[#5E6070] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(h.at)}
                        </span>
                      </div>
                      <p className="text-xs text-[#5E6070] mt-1">
                        Oleh: <b>{h.actor_name || 'Sistem'}</b> ({h.actor_role || '-'})
                      </p>
                      {h.note && (
                        <div className="mt-2 text-xs bg-white p-2.5 rounded border border-[#E6E0D6] text-[#1F2233]">
                          <b>Catatan:</b> "{h.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Modal Footer / Workflow Action Buttons */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-t border-[#E6E0D6] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#5E6070]">
            Dokumen:{' '}
            <b className="text-[#1F2233]">
              [{doc.unit_code}] {doc.unit_name}
            </b>{' '}
            · Status: <b>{doc.status}</b>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#B9B4C9] text-[#1F2233] hover:bg-[#F0EBE2] rounded-md text-xs font-semibold transition cursor-pointer"
            >
              Tutup
            </button>

            {/* Tombol Kembalikan (Manager / Akuntansi saat DIAJUKAN atau DISETUJUI) */}
            {(user?.role === 'manager' || user?.role === 'akuntansi') &&
              (doc.status === 'DIAJUKAN' || (doc.status === 'DISETUJUI' && user?.role === 'akuntansi')) && (
                <button
                  type="button"
                  onClick={() => setShowReturnDialog(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#F8D9D6] border border-red-300 text-[#8A1F1B] hover:bg-red-100 rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Kembalikan
                </button>
              )}

            {/* Tombol Setujui (Manager / Akuntansi saat DIAJUKAN, Maker-Checker BR-07) */}
            {(user?.role === 'manager' || user?.role === 'akuntansi') && doc.status === 'DIAJUKAN' && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading || isMaker}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#DDF1E4] border border-[#9ACDAA] text-[#14532D] hover:bg-green-100 rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={isMaker ? 'Pengaju dilarang menyetujui dokumen sendiri (BR-07)' : 'Setujui dokumen ini'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Setujui Dokumen
              </button>
            )}

            {/* Tombol Finalisasi (Khusus Akuntansi saat DISETUJUI) */}
            {user?.role === 'akuntansi' && doc.status === 'DISETUJUI' && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#232B4A] text-white hover:bg-[#3A4577] rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                Finalisasi Dokumen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drawer / Popover Komentar Per Baris */}
      {selectedCommentLine && (
        <div className="fixed inset-0 bg-slate-900/30 flex items-center justify-end z-60 animate-in fade-in duration-100">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#E6E0D6] flex flex-col">
            <div className="p-4 bg-[#FAF7F2] border-b border-[#E6E0D6] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#1F2233]">Komentar Validator</h4>
                <p className="text-[11px] text-[#5E6070] truncate max-w-xs">{selectedCommentLine.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCommentLine(null)}
                className="p-1 text-[#5E6070] hover:text-[#1F2233] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingComments ? (
                <div className="text-center text-xs text-[#5E6070] py-8">Memuat komentar...</div>
              ) : lineComments.length === 0 ? (
                <div className="text-center text-xs text-[#5E6070] py-8">
                  Belum ada komentar untuk baris ini.
                </div>
              ) : (
                lineComments.map((c) => (
                  <div key={c.id} className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E6E0D6] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1F2233]">
                        {c.author_name} ({c.author_role})
                      </span>
                      <span className="text-[10px] text-[#5E6070]">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-[#1F2233] leading-relaxed">{c.text}</p>
                    {(c.author_id === user?.id || user?.role === 'akuntansi') && (
                      <div className="text-right pt-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-[10px] text-red-600 hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Form Tambah Komentar */}
            <form onSubmit={handleAddComment} className="p-3 border-t border-[#E6E0D6] bg-white flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Tulis catatan validator..."
                className="flex-1 text-xs px-3 py-2 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#2F3E7C] transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Catatan Pengembalian (BR-08) */}
      {showReturnDialog && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-70 animate-in fade-in zoom-in-95 duration-100">
          <div className="bg-white rounded-xl shadow-xl border border-[#E6E0D6] max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#1F2233]">Kembalikan Dokumen Anggaran</h3>
              <p className="text-xs text-[#5E6070] mt-1">
                Catatan alasan wajib diisi (BR-08) agar unit dapat melakukan perbaikan yang diperlukan.
              </p>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Catatan Perbaikan <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Contoh: Tolong sesuaikan kuantitas obat antibiotik dengan riwayat pemakaian triwulan 1..."
                  className="w-full text-xs p-3 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnDialog(false)}
                  className="px-4 py-2 border border-[#B9B4C9] text-[#1F2233] hover:bg-[#F0EBE2] rounded-md text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !returnNote.trim()}
                  className="px-4 py-2 bg-[#8A1F1B] text-white hover:bg-red-800 rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Kembalikan Dokumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
