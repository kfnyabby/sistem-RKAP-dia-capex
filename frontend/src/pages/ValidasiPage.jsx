import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workflowApi from '../api/workflow.api';
import budgetApi from '../api/budget.api';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import DocDetailModal from '../components/proses/DocDetailModal';

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

export default function ValidasiPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAkuntansi = user?.role === 'akuntansi';
  const isManager = user?.role === 'manager';
  const isPic = user?.role === 'pic';
  const canModify = isAkuntansi || isManager;

  // Filters
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // '' (Semua) | 'BIAYA' | 'INVESTASI'
  const [statusFilter, setStatusFilter] = useState('DIAJUKAN'); // 'DIAJUKAN' | 'DISETUJUI' | 'FINAL' | 'DIKEMBALIKAN' | 'ALL'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected document for right panel
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal full review state
  const [reviewModalDoc, setReviewModalDoc] = useState(null);

  // Bulk selection (khusus Akuntansi saat filter DISETUJUI)
  const [selectedBulkDocIds, setSelectedBulkDocIds] = useState([]);

  // 1. Load Periods
  const periodsQuery = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const data = await budgetApi.getPeriods();
      return data || [];
    },
  });

  const periods = periodsQuery.data || [];
  const currentPeriodId = selectedPeriodId || (periods.length > 0 ? String(periods[0].id) : '');

  // 2. Load Review Queue
  const queueQuery = useQuery({
    queryKey: ['review-queue', currentPeriodId, typeFilter, statusFilter],
    queryFn: async () => {
      if (!currentPeriodId) return [];
      const res = await workflowApi.getReviewQueue({
        period_id: currentPeriodId,
        type: typeFilter || undefined,
        status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
        per_page: 200,
      });
      return res?.data || [];
    },
    enabled: Boolean(currentPeriodId),
  });

  const queueDocs = useMemo(() => queueQuery.data || [], [queueQuery.data]);

  // Filter teks pencarian (Unit Name, Code, Submitted By)
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return queueDocs;
    const q = searchQuery.toLowerCase();
    return queueDocs.filter(
      (d) =>
        (d.unit_name && d.unit_name.toLowerCase().includes(q)) ||
        (d.unit_code && d.unit_code.toLowerCase().includes(q)) ||
        (d.submitted_by_name && d.submitted_by_name.toLowerCase().includes(q))
    );
  }, [queueDocs, searchQuery]);

  // Active selected doc
  const activeDoc = useMemo(() => {
    if (!filteredDocs.length) return null;
    if (selectedDocId) {
      const found = filteredDocs.find((d) => d.id === selectedDocId);
      if (found) return found;
    }
    return filteredDocs[0];
  }, [filteredDocs, selectedDocId]);

  const isSelfSubmitted = activeDoc?.submitted_by === user?.id;

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (docId) => workflowApi.approveDoc(docId),
    onSuccess: () => {
      setActionSuccess('Dokumen berhasil disetujui');
      setActionError(null);
      setActionNote('');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Gagal menyetujui dokumen');
    },
  });

  const returnMutation = useMutation({
    mutationFn: ({ docId, note }) => workflowApi.returnDoc(docId, note),
    onSuccess: (data) => {
      const reopenMsg = data?.auto_reopened
        ? ' Akses pengisian unit dibuka otomatis untuk perbaikan (BR-14).'
        : '';
      setActionSuccess(`Dokumen berhasil dikembalikan.${reopenMsg}`);
      setActionError(null);
      setActionNote('');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Gagal mengembalikan dokumen');
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: (docId) => workflowApi.finalizeDoc(docId),
    onSuccess: () => {
      setActionSuccess('Dokumen berhasil difinalisasi dan terkunci (FINAL)');
      setActionError(null);
      setActionNote('');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Gagal memfinalisasi dokumen');
    },
  });

  const bulkFinalizeMutation = useMutation({
    mutationFn: (docIds) => workflowApi.finalizeBulk(docIds),
    onSuccess: (res) => {
      setActionSuccess(`Berhasil memfinalisasi ${res.finalized_count} dokumen sekaligus`);
      setActionError(null);
      setSelectedBulkDocIds([]);
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Gagal melakukan finalisasi massal');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ docId, reason }) => workflowApi.reopenDoc(docId, reason),
    onSuccess: () => {
      setActionSuccess('Dokumen berhasil dibuka kembali menjadi DRAFT');
      setActionError(null);
      setActionNote('');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Gagal membuka kembali dokumen');
    },
  });

  // Action Handlers
  const handleApprove = () => {
    if (!activeDoc) return;
    if (isSelfSubmitted) {
      setActionError('Pengaju tidak boleh menyetujui dokumen yang diajukannya sendiri (BR-07)');
      return;
    }
    if (!window.confirm(`Setujui dokumen anggaran ${activeDoc.type} [${activeDoc.unit_code}] ${activeDoc.unit_name}?`)) {
      return;
    }
    approveMutation.mutate(activeDoc.id);
  };

  const handleReturn = () => {
    if (!activeDoc) return;
    if (!actionNote.trim()) {
      setActionError('Catatan pengembalian wajib diisi (BR-08)');
      return;
    }
    if (!window.confirm(`Kembalikan dokumen anggaran ini dengan catatan perbaikan?`)) {
      return;
    }
    returnMutation.mutate({ docId: activeDoc.id, note: actionNote.trim() });
  };

  const handleFinalize = () => {
    if (!activeDoc) return;
    if (!window.confirm(`Finalisasi dokumen ini? Status akan menjadi FINAL dan terkunci.`)) {
      return;
    }
    finalizeMutation.mutate(activeDoc.id);
  };

  const handleReopen = () => {
    if (!activeDoc) return;
    if (!actionNote.trim()) {
      setActionError('Alasan pembukaan kembali dokumen wajib diisi (BR-06)');
      return;
    }
    if (!window.confirm(`Buka kembali dokumen FINAL ini menjadi DRAFT?`)) {
      return;
    }
    reopenMutation.mutate({ docId: activeDoc.id, reason: actionNote.trim() });
  };

  const handleBulkFinalize = () => {
    if (selectedBulkDocIds.length === 0) return;
    if (
      !window.confirm(
        `Finalisasi ${selectedBulkDocIds.length} dokumen yang dipilih? Seluruh dokumen akan berstatus FINAL dan terkunci secara permanen.`
      )
    ) {
      return;
    }
    bulkFinalizeMutation.mutate(selectedBulkDocIds);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const selectable = filteredDocs.filter((d) => d.status === 'DISETUJUI').map((d) => d.id);
      setSelectedBulkDocIds(selectable);
    } else {
      setSelectedBulkDocIds([]);
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedBulkDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Header chip user context
  const userChipText = isAkuntansi
    ? 'Akuntansi (Semua Unit)'
    : isManager
    ? `Manager · ${user?.unit_name || user?.name || 'Unit'}`
    : `PIC · ${user?.unit_name || user?.name || 'Unit'} (Baca Saja)`;

  return (
    <>
      <PageHeader
        title="Proses · Antrian Validasi"
        chips={<Chip variant="nt">{userChipText}</Chip>}
      />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label style={{ minWidth: 150 }}>
            Periode RKAP
            <select
              value={currentPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  Tahun {p.year} ({p.status})
                </option>
              ))}
            </select>
          </label>

          <label style={{ minWidth: 140 }}>
            Jenis Dokumen
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Semua Jenis</option>
              <option value="BIAYA">Biaya</option>
              <option value="INVESTASI">Investasi</option>
            </select>
          </label>

          <label style={{ minWidth: 150 }}>
            Status Dokumen
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="DIAJUKAN">Diajukan</option>
              <option value="DISETUJUI">Disetujui</option>
              <option value="FINAL">Final (Terkunci)</option>
              <option value="DIKEMBALIKAN">Dikembalikan</option>
              <option value="ALL">Semua Status</option>
            </select>
          </label>

          <label style={{ flex: 1, minWidth: 180 }}>
            Cari Unit / Pengaju
            <input
              type="text"
              placeholder="Cari kode unit, nama unit, atau pengaju..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          {isAkuntansi && statusFilter === 'DISETUJUI' && (
            <button
              type="button"
              className="btn"
              disabled={selectedBulkDocIds.length === 0 || bulkFinalizeMutation.isPending}
              onClick={handleBulkFinalize}
              style={{ minHeight: '44px' }}
            >
              {bulkFinalizeMutation.isPending
                ? 'Memfinalisasi...'
                : `Finalisasi Massal (${selectedBulkDocIds.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Pesan Sukses / Galat Aksi */}
      {actionSuccess && (
        <div
          style={{
            padding: '10px 16px',
            background: '#DDF1E4',
            color: '#14532D',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #B7DFC7',
            marginBottom: 16,
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}
      {actionError && (
        <div
          style={{
            padding: '10px 16px',
            background: '#F8D9D6',
            color: '#8A1F1B',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #ECC0BC',
            marginBottom: 16,
          }}
        >
          ✕ {actionError}
        </div>
      )}

      {/* Layout 2 Kolom Sesuai Mockup 05-antrian-validasi.html */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Kolom Kiri: Tabel Antrian Dokumen */}
        <div className="card sc" style={{ flex: 2, minWidth: 520, padding: 0 }}>
          {queueQuery.isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
              Memuat antrian validasi dokumen...
            </div>
          ) : queueQuery.isError ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8A1F1B', fontSize: 13 }}>
              Gagal memuat antrian: {queueQuery.error?.response?.data?.message || queueQuery.error?.message}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
              Tidak ada dokumen dalam antrian validasi untuk kriteria yang dipilih.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {isAkuntansi && statusFilter === 'DISETUJUI' && (
                    <th style={{ width: 36, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          selectedBulkDocIds.length > 0 &&
                          selectedBulkDocIds.length ===
                            filteredDocs.filter((d) => d.status === 'DISETUJUI').length
                        }
                      />
                    </th>
                  )}
                  <th style={{ width: 36 }}>No.</th>
                  <th>Unit</th>
                  <th>Jenis</th>
                  <th className="r">Total</th>
                  <th>Diajukan oleh</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, idx) => {
                  const isSelf = doc.submitted_by === user?.id;
                  const isSelected = activeDoc?.id === doc.id;
                  const isChecked = selectedBulkDocIds.includes(doc.id);

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      style={{
                        background: isSelected ? '#FAF7F2' : undefined,
                        cursor: 'pointer',
                      }}
                    >
                      {isAkuntansi && statusFilter === 'DISETUJUI' && (
                        <td
                          style={{ textAlign: 'center' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectOne(doc.id)}
                          />
                        </td>
                      )}
                      <td>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1F2233' }}>
                          [{doc.unit_code}] {doc.unit_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#5E6070' }}>
                          {doc.company_code} · {formatDate(doc.submitted_at)}
                        </div>
                      </td>
                      <td>{doc.type === 'INVESTASI' ? 'Investasi' : 'Biaya'}</td>
                      <td className="r" style={{ fontWeight: 600 }}>
                        {formatRupiah(doc.total_amount)}
                      </td>
                      <td>
                        {isSelf ? (
                          <span style={{ fontWeight: 600, color: '#3A3F63' }}>Anda</span>
                        ) : (
                          doc.submitted_by_name || '—'
                        )}
                      </td>
                      <td>
                        {isSelf ? (
                          <Chip variant="nt">Diajukan sendiri</Chip>
                        ) : (
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
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="btn b2"
                            onClick={() => setReviewModalDoc(doc)}
                            style={{ minHeight: '34px', padding: '0 12px', fontSize: 12 }}
                          >
                            {isPic ? 'Lihat Detail' : 'Tinjau'}
                          </button>
                          {!isPic && isSelf && (
                            <span className="lb" style={{ fontSize: 11, color: '#5E6070', whiteSpace: 'nowrap' }}>
                              Tidak dapat disetujui sendiri
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Kolom Kanan: Panel Tinjau Cepat Dokumen Terpilih */}
        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          {activeDoc ? (
            <>
              <h2>
                [{activeDoc.unit_code}] {activeDoc.unit_name} · {activeDoc.type === 'INVESTASI' ? 'Investasi' : 'Biaya'}
              </h2>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#5E6070' }}>
                Total <b style={{ color: '#1F2233' }}>Rp {formatRupiah(activeDoc.total_amount)}</b> · Status: <b>{activeDoc.status}</b> · Diajukan oleh: <b>{isSelfSubmitted ? 'Anda' : activeDoc.submitted_by_name || '—'}</b>
              </p>

              <button
                type="button"
                className="btn b2"
                onClick={() => setReviewModalDoc(activeDoc)}
                style={{ width: '100%', marginBottom: 12, minHeight: '38px', fontSize: 13 }}
              >
                🔍 Buka Rincian Lengkap & Komentar
              </button>

              {!canModify ? (
                <div
                  style={{
                    color: '#5E6070',
                    fontSize: 13,
                    background: '#FAF7F2',
                    padding: '12px',
                    borderRadius: 6,
                    border: '1px solid #E6E0D6',
                    marginTop: 8,
                    lineHeight: '1.5',
                  }}
                >
                  ℹ️ <b>Mode Baca-Saja:</b> Sebagai PIC Unit, Anda dapat memantau status antrian dan membuka rincian dokumen untuk memeriksa catatan pemeriksa. Anda tidak memiliki hak akses untuk mengubah atau menyetujui dokumen.
                </div>
              ) : (
                <>
                  <label htmlFor="cat" style={{ marginBottom: 12 }}>
                    Catatan (wajib bila dikembalikan / alasan buka kembali)
                    <textarea
                      id="cat"
                      rows={4}
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Tulis catatan alasan perbaikan atau pembukaan kembali..."
                    />
                  </label>

                  {isSelfSubmitted && (
                    <div style={{ color: '#8A1F1B', fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
                      ⚠️ Pengaju tidak dapat menyetujui dokumen yang diajukannya sendiri (BR-07).
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Status DIAJUKAN */}
                    {activeDoc.status === 'DIAJUKAN' && (
                      <>
                        {!isSelfSubmitted && (
                          <button
                            type="button"
                            className="btn"
                            onClick={handleApprove}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? 'Menyetujui...' : 'Setujui'}
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

                    {/* Status DISETUJUI (Khusus Akuntansi) */}
                    {activeDoc.status === 'DISETUJUI' && isAkuntansi && (
                      <>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleFinalize}
                          disabled={finalizeMutation.isPending}
                        >
                          {finalizeMutation.isPending ? 'Memfinalisasi...' : 'Finalisasi'}
                        </button>
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

                    {/* Status FINAL (Khusus Akuntansi) */}
                    {activeDoc.status === 'FINAL' && isAkuntansi && (
                      <button
                        type="button"
                        className="btn b2"
                        onClick={handleReopen}
                        disabled={reopenMutation.isPending}
                      >
                        {reopenMutation.isPending ? 'Membuka...' : 'Buka Kembali'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ color: '#5E6070', fontSize: 13, textAlign: 'center', padding: '24px 8px' }}>
              Pilih salah satu dokumen dari tabel antrian untuk melihat rincian dan melakukan validasi.
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog Rinci Baca-Saja Dokumen Lengkap */}
      {reviewModalDoc && (
        <DocDetailModal
          doc={reviewModalDoc}
          onClose={() => setReviewModalDoc(null)}
          onRefreshQueue={() => queryClient.invalidateQueries({ queryKey: ['review-queue'] })}
        />
      )}
    </>
  );
}
