import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workflowApi from '../../api/workflow.api';
import budgetApi from '../../api/budget.api';
import investmentApi from '../../api/investment.api';
import { useAuth } from '../../auth/AuthContext';
import Chip from '../common/Chip';

function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('id-ID').format(val);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
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

export default function DocDetailModal({ doc, onClose, onRefreshQueue }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('lines'); // 'lines' | 'history'
  const [actionNote, setActionNote] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Komentar per baris state
  const [activeCommentLine, setActiveCommentLine] = useState(null); // { id, name, lineType }
  const [newCommentText, setNewCommentText] = useState('');

  const isExpense = doc?.type === 'BIAYA';
  const lineType = isExpense ? 'expense' : 'investment';
  const isSelfSubmitted = doc?.submitted_by === user?.id;
  const isAkuntansi = user?.role === 'akuntansi';
  const isManager = user?.role === 'manager';
  const canModify = isAkuntansi || isManager;

  // 1. Query Baris Dokumen
  const linesQuery = useQuery({
    queryKey: ['doc-lines', doc?.id, doc?.type],
    queryFn: async () => {
      if (!doc?.id) return [];
      if (isExpense) {
        const res = await budgetApi.getExpenseLines(doc.id, { per_page: 500 });
        return res?.data || [];
      } else {
        const res = await investmentApi.getInvestmentLines(doc.id);
        return res?.data || [];
      }
    },
    enabled: Boolean(doc?.id) && activeTab === 'lines',
  });

  // 2. Query Riwayat Status
  const historyQuery = useQuery({
    queryKey: ['doc-history', doc?.id],
    queryFn: async () => {
      if (!doc?.id) return [];
      const res = await workflowApi.getDocHistory(doc.id);
      return res?.history || [];
    },
    enabled: Boolean(doc?.id) && activeTab === 'history',
  });

  // 3. Query Komentar Baris yang sedang aktif dipilih
  const commentsQuery = useQuery({
    queryKey: ['line-comments', doc?.id, lineType, activeCommentLine?.id],
    queryFn: async () => {
      if (!doc?.id || !activeCommentLine?.id) return [];
      const res = await workflowApi.getLineComments(doc.id, lineType, activeCommentLine.id);
      return res?.data || [];
    },
    enabled: Boolean(doc?.id && activeCommentLine?.id),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => workflowApi.approveDoc(doc.id),
    onSuccess: () => {
      setSuccessMessage('Dokumen berhasil disetujui');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['doc-history', doc.id] });
      onRefreshQueue?.();
      setTimeout(() => onClose(), 1200);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Gagal menyetujui dokumen');
    },
  });

  const returnMutation = useMutation({
    mutationFn: (note) => workflowApi.returnDoc(doc.id, note),
    onSuccess: (data) => {
      const reopenMsg = data?.auto_reopened
        ? ' Akses pengisian unit telah dibuka otomatis untuk perbaikan (BR-14).'
        : '';
      setSuccessMessage(`Dokumen berhasil dikembalikan.${reopenMsg}`);
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['doc-history', doc.id] });
      onRefreshQueue?.();
      setTimeout(() => onClose(), 1500);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Gagal mengembalikan dokumen');
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => workflowApi.finalizeDoc(doc.id),
    onSuccess: () => {
      setSuccessMessage('Dokumen berhasil difinalisasi dan terkunci (FINAL)');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['doc-history', doc.id] });
      onRefreshQueue?.();
      setTimeout(() => onClose(), 1200);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Gagal memfinalisasi dokumen');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (reason) => workflowApi.reopenDoc(doc.id, reason),
    onSuccess: () => {
      setSuccessMessage('Dokumen berhasil dibuka kembali menjadi DRAFT');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['doc-history', doc.id] });
      onRefreshQueue?.();
      setTimeout(() => onClose(), 1200);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Gagal membuka kembali dokumen');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (text) => workflowApi.addLineComment(doc.id, lineType, activeCommentLine.id, text),
    onSuccess: () => {
      setNewCommentText('');
      queryClient.invalidateQueries({
        queryKey: ['line-comments', doc.id, lineType, activeCommentLine?.id],
      });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal menambahkan komentar');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => workflowApi.deleteLineComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['line-comments', doc.id, lineType, activeCommentLine?.id],
      });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal menghapus komentar');
    },
  });

  // Action Handlers
  const handleApprove = () => {
    if (isSelfSubmitted) {
      setErrorMessage('Pengaju tidak boleh menyetujui dokumen yang diajukannya sendiri (BR-07)');
      return;
    }
    if (!window.confirm(`Setujui dokumen anggaran ${doc.type} [${doc.unit_code}] ${doc.unit_name}?`)) {
      return;
    }
    approveMutation.mutate();
  };

  const handleReturn = () => {
    if (!actionNote.trim()) {
      setErrorMessage('Catatan pengembalian wajib diisi (BR-08)');
      return;
    }
    if (!window.confirm(`Kembalikan dokumen anggaran ini dengan catatan perbaikan?`)) {
      return;
    }
    returnMutation.mutate(actionNote.trim());
  };

  const handleFinalize = () => {
    if (!window.confirm(`Finalisasi dokumen ini? Status akan menjadi FINAL dan terkunci secara permanen.`)) {
      return;
    }
    finalizeMutation.mutate();
  };

  const handleReopen = () => {
    if (!actionNote.trim()) {
      setErrorMessage('Alasan pembukaan kembali dokumen wajib diisi (BR-06)');
      return;
    }
    if (!window.confirm(`Buka kembali dokumen FINAL ini menjadi DRAFT?`)) {
      return;
    }
    reopenMutation.mutate(actionNote.trim());
  };

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addCommentMutation.mutate(newCommentText.trim());
  };

  const lines = linesQuery.data || [];
  const historyList = historyQuery.data || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FAF7F2',
          borderRadius: 8,
          border: '1px solid #E6E0D6',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 20px',
            background: '#fff',
            borderBottom: '1px solid #E6E0D6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1F2233' }}>
                Telaah Dokumen Anggaran · {doc.type}
              </h2>
              <Chip variant="nt">[{doc.unit_code || 'UNIT'}] {doc.unit_name}</Chip>
              <Chip
                variant={
                  doc.status === 'FINAL'
                    ? 'ok'
                    : doc.status === 'DISETUJUI'
                      ? 'ok'
                      : doc.status === 'DIKEMBALIKAN'
                        ? 'bd'
                        : 'wn'
                }
              >
                {doc.status}
              </Chip>
              {isSelfSubmitted && <Chip variant="nt">Diajukan sendiri</Chip>}
            </div>
            <div style={{ fontSize: 12, color: '#5E6070', marginTop: 4 }}>
              Periode RKAP {doc.period_year || '—'} · Total:{' '}
              <b style={{ color: '#1F2233' }}>Rp {formatRupiah(doc.total_amount)}</b> · Diajukan oleh:{' '}
              <b>{isSelfSubmitted ? 'Anda' : doc.submitted_by_name || '—'}</b> ({formatDate(doc.submitted_at)})
            </div>
          </div>
          <button
            type="button"
            className="btn b2"
            onClick={onClose}
            style={{ minHeight: '36px', padding: '0 12px', fontSize: 13 }}
          >
            ✕ Tutup
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            padding: '8px 20px',
            background: '#FAF7F2',
            borderBottom: '1px solid #E6E0D6',
            display: 'flex',
            gap: 8,
          }}
        >
          <button
            type="button"
            className={`btn ${activeTab === 'lines' ? '' : 'b2'}`}
            onClick={() => setActiveTab('lines')}
            style={{ minHeight: '36px', padding: '0 14px', fontSize: 13 }}
          >
            Rincian Baris Anggaran ({lines.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? '' : 'b2'}`}
            onClick={() => setActiveTab('history')}
            style={{ minHeight: '36px', padding: '0 14px', fontSize: 13 }}
          >
            Riwayat Status Dokumen
          </button>
        </div>

        {/* Notifikasi Sukses / Galat */}
        {successMessage && (
          <div
            style={{
              padding: '10px 20px',
              background: '#DDF1E4',
              color: '#14532D',
              fontSize: 13,
              fontWeight: 500,
              borderBottom: '1px solid #B7DFC7',
            }}
          >
            ✓ {successMessage}
          </div>
        )}
        {errorMessage && (
          <div
            style={{
              padding: '10px 20px',
              background: '#F8D9D6',
              color: '#8A1F1B',
              fontSize: 13,
              fontWeight: 500,
              borderBottom: '1px solid #ECC0BC',
            }}
          >
            ✕ {errorMessage}
          </div>
        )}

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', gap: 16 }}>
          {/* Main Content Area */}
          <div style={{ flex: activeCommentLine ? '1 1 65%' : '1 1 100%', minWidth: 0 }}>
            {activeTab === 'lines' && (
              <div className="card sc" style={{ background: '#fff', padding: 0 }}>
                {linesQuery.isLoading ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
                    Memuat rincian baris anggaran...
                  </div>
                ) : lines.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
                    Belum ada baris anggaran pada dokumen ini.
                  </div>
                ) : isExpense ? (
                  /* Tabel Rincian Biaya */
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>No.</th>
                        <th>Nama Barang / Jasa</th>
                        <th>COA Beban</th>
                        <th>Sat</th>
                        <th className="r">Vol Total</th>
                        <th className="r">Harga Satuan</th>
                        <th className="r">Total Biaya</th>
                        <th style={{ textAlign: 'center' }}>Komentar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={line.id || idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1F2233' }}>
                              {line.item_name || line.name || '—'}
                            </div>
                            <div style={{ fontSize: 11, color: '#5E6070' }}>
                              Kode: {line.item_code || '—'}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 12 }}>
                              {line.coa_code ? `[${line.coa_code}] ${line.coa_name || ''}` : '—'}
                            </span>
                          </td>
                          <td>{line.unit || 'pcs'}</td>
                          <td className="r">
                            {formatRupiah(line.total_qty ?? line.quantity ?? 0)}
                          </td>
                          <td className="r">
                            Rp {formatRupiah(line.unit_price || 0)}
                          </td>
                          <td className="r" style={{ fontWeight: 600 }}>
                            Rp {formatRupiah(line.total_amount || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn b2"
                              onClick={() =>
                                setActiveCommentLine(
                                  activeCommentLine?.id === line.id
                                    ? null
                                    : { id: line.id, name: line.item_name || line.name || `Baris #${idx + 1}` }
                                )
                              }
                              style={{
                                minHeight: '32px',
                                padding: '0 10px',
                                fontSize: 12,
                                background: activeCommentLine?.id === line.id ? '#3A4577' : undefined,
                                color: activeCommentLine?.id === line.id ? '#fff' : undefined,
                              }}
                            >
                              💬 Komentar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#FAF7F2', fontWeight: 600 }}>
                        <td colSpan={6} style={{ textAlign: 'right', padding: '10px 8px' }}>
                          Total Anggaran Biaya:
                        </td>
                        <td className="r" style={{ padding: '10px 8px', color: '#1F2233' }}>
                          Rp {formatRupiah(doc.total_amount || 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  /* Tabel Rincian Investasi */
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>No.</th>
                        <th>Nama Barang / Aset</th>
                        <th>Kategori</th>
                        <th className="r">Susut (bln)</th>
                        <th className="r">Penyusutan</th>
                        <th className="r">Vol</th>
                        <th>Sat</th>
                        <th className="r">Harga Satuan</th>
                        <th className="r">Total Nilai</th>
                        <th style={{ textAlign: 'center' }}>Bln</th>
                        <th style={{ textAlign: 'center' }}>Prioritas</th>
                        <th style={{ textAlign: 'center' }}>Komentar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={line.id || idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <details style={{ cursor: 'pointer' }}>
                              <summary style={{ fontWeight: 600, color: '#1F2233' }}>
                                {line.name}
                              </summary>
                              <div
                                style={{
                                  marginTop: 6,
                                  padding: 8,
                                  background: '#FAF7F2',
                                  borderRadius: 4,
                                  border: '1px solid #E6E0D6',
                                  fontSize: 12,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                <div><b>Spesifikasi:</b> {line.specification || '—'}</div>
                                <div><b>Urgensi & Dampak:</b> {line.urgency_reason || '—'}</div>
                                <div><b>Program Kerja:</b> {line.work_program || '—'}</div>
                                <div><b>Lokasi:</b> {line.target_location || '—'}</div>
                              </div>
                            </details>
                          </td>
                          <td>{line.category_name || '—'}</td>
                          <td className="r">{line.useful_life_months || 0}</td>
                          <td className="r">
                            Rp {formatRupiah(line.depreciation_cost_annual || 0)}
                          </td>
                          <td className="r">{line.quantity || 0}</td>
                          <td>{line.unit || 'Unit'}</td>
                          <td className="r">Rp {formatRupiah(line.unit_price || 0)}</td>
                          <td className="r" style={{ fontWeight: 600 }}>
                            Rp {formatRupiah(line.total_amount || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>Bln {line.plan_month || 1}</td>
                          <td style={{ textAlign: 'center' }}>
                            <Chip variant={line.priority === 'HIGH' ? 'bd' : line.priority === 'MEDIUM' ? 'wn' : 'ok'}>
                              {line.priority || 'NORMAL'}
                            </Chip>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn b2"
                              onClick={() =>
                                setActiveCommentLine(
                                  activeCommentLine?.id === line.id
                                    ? null
                                    : { id: line.id, name: line.name || `Baris #${idx + 1}` }
                                )
                              }
                              style={{
                                minHeight: '32px',
                                padding: '0 10px',
                                fontSize: 12,
                                background: activeCommentLine?.id === line.id ? '#3A4577' : undefined,
                                color: activeCommentLine?.id === line.id ? '#fff' : undefined,
                              }}
                            >
                              💬 Komentar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#FAF7F2', fontWeight: 600 }}>
                        <td colSpan={8} style={{ textAlign: 'right', padding: '10px 8px' }}>
                          Total Nilai Investasi:
                        </td>
                        <td className="r" style={{ padding: '10px 8px', color: '#1F2233' }}>
                          Rp {formatRupiah(doc.total_amount || 0)}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="card sc" style={{ background: '#fff', padding: 16 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Riwayat Status & Audit Dokumen</h3>
                {historyQuery.isLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
                    Memuat riwayat status dokumen...
                  </div>
                ) : historyList.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
                    Belum ada catatan riwayat perubahan status untuk dokumen ini.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>Waktu</th>
                        <th style={{ width: 120 }}>Dari Status</th>
                        <th style={{ width: 120 }}>Menjadi Status</th>
                        <th>Aktor (User)</th>
                        <th>Catatan / Alasan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((h, i) => (
                        <tr key={h.id || i}>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {formatDate(h.created_at)}
                          </td>
                          <td>
                            <Chip variant="nt">{h.from_status || '—'}</Chip>
                          </td>
                          <td>
                            <Chip
                              variant={
                                h.to_status === 'FINAL'
                                  ? 'ok'
                                  : h.to_status === 'DISETUJUI'
                                    ? 'ok'
                                    : h.to_status === 'DIKEMBALIKAN'
                                      ? 'bd'
                                      : 'wn'
                              }
                            >
                              {h.to_status}
                            </Chip>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{h.actor_name || 'System'}</div>
                            <div style={{ fontSize: 11, color: '#5E6070' }}>{h.actor_role || ''}</div>
                          </td>
                          <td style={{ fontSize: 13, color: '#1F2233' }}>
                            {h.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Drawer / Popover Komentar Baris */}
          {activeCommentLine && (
            <div
              className="card"
              style={{
                flex: '0 0 340px',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                height: 'fit-content',
                maxHeight: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 14, color: '#1F2233' }}>
                  Komentar: {activeCommentLine.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveCommentLine(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#5E6070',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Daftar Komentar */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingRight: 4,
                }}
              >
                {commentsQuery.isLoading ? (
                  <div style={{ fontSize: 12, color: '#5E6070' }}>Memuat komentar...</div>
                ) : (commentsQuery.data || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: '#5E6070', fontStyle: 'italic' }}>
                    Belum ada komentar pada baris ini.
                  </div>
                ) : (
                  (commentsQuery.data || []).map((c) => {
                    const canDelete = c.author_id === user?.id || isAkuntansi;
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: '#FAF7F2',
                          border: '1px solid #E6E0D6',
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#1F2233' }}>
                            {c.author_name} ({c.author_role || 'validator'})
                          </span>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Hapus komentar ini?')) {
                                  deleteCommentMutation.mutate(c.id);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#8A1F1B',
                                cursor: 'pointer',
                                fontSize: 11,
                                padding: 0,
                              }}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <div style={{ color: '#1F2233', whiteSpace: 'pre-wrap' }}>{c.text}</div>
                        <div style={{ fontSize: 10, color: '#5E6070', marginTop: 4 }}>
                          {formatDate(c.created_at)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Form Tambah Komentar (Khusus Validator Manager/Akuntansi) */}
              {canModify && (
                <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    rows={2}
                    placeholder="Tulis catatan / masukan perbaikan untuk baris ini..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    style={{ width: '100%', fontSize: 12, padding: 8 }}
                  />
                  <button
                    type="submit"
                    className="btn"
                    disabled={!newCommentText.trim() || addCommentMutation.isPending}
                    style={{ minHeight: '34px', fontSize: 12, alignSelf: 'flex-end' }}
                  >
                    {addCommentMutation.isPending ? 'Mengirim...' : 'Kirim Komentar'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal Aksi Pengesahan */}
        <div
          style={{
            padding: '14px 20px',
            background: '#fff',
            borderTop: '1px solid #E6E0D6',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {!canModify ? (
            <div
              style={{
                color: '#5E6070',
                fontSize: 13,
                background: '#FAF7F2',
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid #E6E0D6',
                width: '100%',
                lineHeight: '1.5',
              }}
            >
              ℹ️ <b>Mode Baca-Saja:</b> Peran PIC hanya dapat memantau rincian dokumen dan riwayat telaah anggaran. Anda tidak memiliki hak akses untuk menyetujui, mengembalikan, atau memfinalisasi dokumen ini.
            </div>
          ) : (
            <>
              {isSelfSubmitted && (
                <div style={{ color: '#8A1F1B', fontSize: 12, fontWeight: 600 }}>
                  ⚠️ Perhatian: Anda adalah pengaju dokumen ini. Sesuai prinsip Maker-Checker (BR-07), Anda tidak dapat menyetujui dokumen yang Anda ajukan sendiri.
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <label htmlFor="modal-cat" style={{ fontSize: 12, color: '#5E6070', display: 'block', marginBottom: 4 }}>
                    Catatan (Wajib jika dikembalikan / Alasan jika buka kembali dokumen FINAL):
                  </label>
                  <textarea
                    id="modal-cat"
                    rows={2}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Tuliskan catatan arahan revisi atau alasan pembukaan kembali..."
                    style={{ width: '100%', fontSize: 13, padding: 8 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* DIAJUKAN actions */}
                  {doc.status === 'DIAJUKAN' && (
                    <>
                      {!isSelfSubmitted && (
                        <button
                          type="button"
                          className="btn"
                          onClick={handleApprove}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? 'Menyetujui...' : 'Setujui Dokumen'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn b3"
                        onClick={handleReturn}
                        disabled={returnMutation.isPending}
                      >
                        {returnMutation.isPending ? 'Mengembalikan...' : 'Kembalikan'}
                      </button>
                    </>
                  )}

                  {/* DISETUJUI actions (Khusus Akuntansi) */}
                  {doc.status === 'DISETUJUI' && isAkuntansi && (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={handleFinalize}
                        disabled={finalizeMutation.isPending}
                      >
                        {finalizeMutation.isPending ? 'Memfinalisasi...' : 'Finalisasi Dokumen (FINAL)'}
                      </button>
                      <button
                        type="button"
                        className="btn b3"
                        onClick={handleReturn}
                        disabled={returnMutation.isPending}
                      >
                        {returnMutation.isPending ? 'Mengembalikan...' : 'Kembalikan ke PIC'}
                      </button>
                    </>
                  )}

                  {/* FINAL actions (Khusus Akuntansi) */}
                  {doc.status === 'FINAL' && isAkuntansi && (
                    <button
                      type="button"
                      className="btn b2"
                      onClick={handleReopen}
                      disabled={reopenMutation.isPending}
                    >
                      {reopenMutation.isPending ? 'Membuka...' : 'Buka Kembali Dokumen FINAL'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
