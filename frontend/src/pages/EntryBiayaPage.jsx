import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import budgetApi from '../api/budget.api';
import { masterApi } from '../api/master.api';
import { realizationApi } from '../api/realization.api';
import { submissionAccessApi } from '../api/submissionAccess.api';
import { workflowApi } from '../api/workflow.api';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import Banner from '../components/common/Banner';
import AddMasterItemDialog from '../components/entry/AddMasterItemDialog';
import RefreshPriceConfirmDialog from '../components/entry/RefreshPriceConfirmDialog';
import NewItemRequestPicCard from '../components/entry/NewItemRequestPicCard';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export default function EntryBiayaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State Filter & Konteks
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedPeriodYear, setSelectedPeriodYear] = useState('2027');
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedCoaId, setSelectedCoaId] = useState('');
  const [startMonth, setStartMonth] = useState('01');
  const [endMonth, setEndMonth] = useState('10');

  // State Modal
  const [isAddMasterOpen, setIsAddMasterOpen] = useState(false);
  const [isRefreshPriceOpen, setIsRefreshPriceOpen] = useState(false);

  // State Auto-Save & Debounce
  const [lineQtys, setLineQtys] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
  const [savedTime, setSavedTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [conflictError, setConflictError] = useState(null);
  const debounceTimers = useRef({});

  // 1. Ambil Data Unit Pengguna
  const { data: unitsData = [] } = useQuery({
    queryKey: ['units', user?.id],
    queryFn: async () => {
      if (user?.role === 'akuntansi') {
        const res = await masterApi.getUnits({ is_active: true });
        return Array.isArray(res) ? res : (res?.data || []);
      }
      return user?.units || [];
    },
    enabled: !!user,
  });

  // Set default unit bila belum dipilih
  useEffect(() => {
    if (!selectedUnitId && unitsData.length > 0) {
      setSelectedUnitId(String(unitsData[0].unit_id || unitsData[0].id));
    }
  }, [unitsData, selectedUnitId]);

  // 2. Ambil Daftar Periode
  const { data: periodsData = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const res = await budgetApi.getPeriods();
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  const selectedPeriod = useMemo(() => {
    if (!periodsData || periodsData.length === 0) return null;
    return (
      periodsData.find((p) => String(p.year) === String(selectedPeriodYear)) ||
      periodsData[0]
    );
  }, [periodsData, selectedPeriodYear]);

  // 3. Ambil Master Kelompok COA
  const { data: coaGroups = [] } = useQuery({
    queryKey: ['coaGroups'],
    queryFn: async () => {
      const res = await masterApi.getCoaGroups();
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  // 4. Ambil Daftar COA sesuai Kelompok terpilih
  const { data: coasList = [] } = useQuery({
    queryKey: ['coas', selectedGroupId],
    queryFn: async () => {
      const params = {};
      if (selectedGroupId) params.group_id = selectedGroupId;
      const res = await masterApi.getCoas(params);
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  // 5. Ambil Dokumen Anggaran Aktif (BIAYA)
  const {
    data: docsData,
    isLoading: isLoadingDoc,
    refetch: refetchDoc,
  } = useQuery({
    queryKey: ['budgetDocActive', selectedPeriod?.id, selectedUnitId],
    queryFn: async () => {
      if (!selectedPeriod?.id || !selectedUnitId) return null;
      const res = await budgetApi.getBudgetDocs({
        period_id: selectedPeriod.id,
        unit_id: selectedUnitId,
        type: 'BIAYA',
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      return list.length > 0 ? list[0] : null;
    },
    enabled: !!selectedPeriod?.id && !!selectedUnitId,
  });

  const currentDoc = docsData;
  const docId = currentDoc?.id;

  // 6. Ambil Status Akses & Batas Waktu Efektif (BR-10, BR-12, BR-14)
  const { data: docAccess } = useQuery({
    queryKey: ['docAccess', docId],
    queryFn: async () => {
      if (!docId) return null;
      return await submissionAccessApi.getDocAccess(docId);
    },
    enabled: !!docId,
  });

  // 7. Ambil Riwayat Dokumen untuk Catatan Pengembalian
  const { data: docHistoryData } = useQuery({
    queryKey: ['docHistory', docId],
    queryFn: async () => {
      if (!docId) return null;
      return await workflowApi.getDocHistory(docId);
    },
    enabled: !!docId,
  });

  // Catatan pengembalian terakhir bila ada
  const returnNote = useMemo(() => {
    if (!docHistoryData?.history) return null;
    const rev = [...docHistoryData.history].reverse();
    const returnEntry = rev.find((h) => h.to_status === 'DIKEMBALIKAN');
    return returnEntry ? returnEntry : null;
  }, [docHistoryData]);

  // Cek apakah mode baca-saja (read-only)
  const isSubmissionOpen = docAccess?.is_open ?? true;
  const isDocEditable =
    currentDoc &&
    (currentDoc.status === 'DRAFT' || currentDoc.status === 'DIKEMBALIKAN') &&
    isSubmissionOpen;
  const isReadOnly = !isDocEditable;

  // 8. Ambil Baris Anggaran Biaya (Expense Lines)
  const {
    data: expenseLinesData,
    isLoading: isLoadingLines,
    refetch: refetchLines,
  } = useQuery({
    queryKey: ['expenseLines', docId, search, selectedGroupId, selectedCoaId],
    queryFn: async () => {
      if (!docId) return { data: [], meta: {} };
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedGroupId) params.group_id = selectedGroupId;
      if (selectedCoaId) params.coa_id = selectedCoaId;
      return await budgetApi.getExpenseLines(docId, params);
    },
    enabled: !!docId,
  });

  const lines = useMemo(() => {
    return expenseLinesData?.data || [];
  }, [expenseLinesData]);

  // Sinkronisasi state lokal Qty dari data server
  useEffect(() => {
    if (lines.length > 0) {
      setLineQtys((prev) => {
        const next = { ...prev };
        lines.forEach((l) => {
          if (next[l.id] === undefined) {
            next[l.id] = l.qty;
          }
        });
        return next;
      });
    }
  }, [lines]);

  // 9. Ambil Data Realisasi Buku Besar per Barang (GET /api/realizations)
  const { data: realizationsData } = useQuery({
    queryKey: [
      'realizationsItem',
      selectedUnitId,
      selectedPeriod?.year,
      startMonth,
      endMonth,
    ],
    queryFn: async () => {
      if (!selectedUnitId || !selectedPeriod?.year) return [];
      const year = selectedPeriod.year;
      const res = await realizationApi.getRealizations({
        group_by: 'item',
        unit_id: selectedUnitId,
        start_month: `${year}-${startMonth}`,
        end_month: `${year}-${endMonth}`,
      });
      return res?.data || [];
    },
    enabled: !!selectedUnitId && !!selectedPeriod?.year,
  });

  // Map Realisasi per item_id
  const realizationMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(realizationsData)) {
      realizationsData.forEach((r) => {
        if (r.item_id) {
          // Bila ada data realisasi, simpan nilai total_realization atau line_count
          map.set(r.item_id, r.total_realization || r.line_count || 0);
        }
      });
    }
    return map;
  }, [realizationsData]);

  // 10. Mutasi Simpan Baris Biaya (Simpan Otomatis & Optimistic Locking)
  const saveLinesMutation = useMutation({
    mutationFn: async ({ lineId, itemId, qty, version }) => {
      return await budgetApi.saveExpenseLines(docId, [
        {
          id: lineId,
          item_id: itemId,
          qty: parseInt(qty, 10) || 0,
          version,
        },
      ]);
    },
    onSuccess: () => {
      setSaveStatus('saved');
      setConflictError(null);
      const d = new Date();
      setSavedTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
      queryClient.invalidateQueries({ queryKey: ['expenseLines', docId] });
      queryClient.invalidateQueries({ queryKey: ['budgetDocActive'] });
    },
    onError: (err, variables) => {
      setSaveStatus('error');
      if (err.response?.status === 409) {
        setConflictError({
          lineId: variables.lineId,
          message:
            err.response?.data?.message ||
            'Terjadi bentrok versi: data baris ini telah diubah oleh sesi lain.',
        });
      } else {
        alert(
          err.response?.data?.message ||
            err.message ||
            'Gagal menyimpan perubahan kuantitas.'
        );
      }
    },
  });

  // Debounced Auto-Save Handler
  const handleQtyChange = useCallback(
    (line, newQtyVal) => {
      const lineId = line.id;
      setLineQtys((prev) => ({ ...prev, [lineId]: newQtyVal }));
      setSaveStatus('saving');

      if (debounceTimers.current[lineId]) {
        clearTimeout(debounceTimers.current[lineId]);
      }

      debounceTimers.current[lineId] = setTimeout(() => {
        saveLinesMutation.mutate({
          lineId: line.id,
          itemId: line.item_id,
          qty: newQtyVal,
          version: line.version,
        });
      }, 600);
    },
    [saveLinesMutation]
  );

  // 11. Mutasi Hapus Baris Biaya
  const deleteLineMutation = useMutation({
    mutationFn: async (lineId) => {
      return await budgetApi.deleteExpenseLine(lineId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseLines', docId] });
      queryClient.invalidateQueries({ queryKey: ['budgetDocActive'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal menghapus baris anggaran.');
    },
  });

  // 12. Mutasi Perbarui Harga Master (POST /api/budget-docs/:id/refresh-prices)
  const refreshPricesMutation = useMutation({
    mutationFn: async () => {
      return await budgetApi.refreshDocPrices(docId);
    },
    onSuccess: (res) => {
      setIsRefreshPriceOpen(false);
      alert(res?.message || 'Harga master berhasil diperbarui.');
      queryClient.invalidateQueries({ queryKey: ['expenseLines', docId] });
      queryClient.invalidateQueries({ queryKey: ['budgetDocActive'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal memperbarui harga master.');
    },
  });

  // 13. Mutasi Inisialisasi Draft Dokumen Baru
  const createDocMutation = useMutation({
    mutationFn: async () => {
      return await budgetApi.createBudgetDoc({
        period_id: selectedPeriod.id,
        unit_id: parseInt(selectedUnitId, 10),
        type: 'BIAYA',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetDocActive'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal membuat draft dokumen anggaran.');
    },
  });

  // 14. Mutasi Ajukan ke Manager (POST /api/budget-docs/:id/submit)
  const submitToManagerMutation = useMutation({
    mutationFn: async () => {
      return await workflowApi.submitDoc(docId);
    },
    onSuccess: () => {
      alert('Dokumen anggaran biaya berhasil diajukan ke Manager.');
      queryClient.invalidateQueries({ queryKey: ['budgetDocActive'] });
      queryClient.invalidateQueries({ queryKey: ['docAccess', docId] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal mengajukan dokumen ke Manager.');
    },
  });

  const handleSubmitToManager = () => {
    if (lines.length === 0) {
      alert('Dokumen belum memiliki rincian baris anggaran biaya.');
      return;
    }
    if (
      !window.confirm(
        'Apakah Anda yakin ingin mengajukan usulan anggaran biaya ini ke Manager? Setelah diajukan, data akan terkunci dari pengeditan.'
      )
    ) {
      return;
    }
    submitToManagerMutation.mutate();
  };

  // Label Rentang Bulan Realisasi untuk Header Kolom Tabel
  const startMonthLabel =
    MONTHS.find((m) => m.value === startMonth)?.label?.substring(0, 3) || 'Jan';
  const endMonthLabel =
    MONTHS.find((m) => m.value === endMonth)?.label?.substring(0, 3) || 'Okt';

  // Kalkulasi Total per Unit & per COA
  const totalDocAmount = useMemo(() => {
    return lines.reduce((sum, l) => {
      const q = lineQtys[l.id] !== undefined ? parseInt(lineQtys[l.id], 10) || 0 : l.qty;
      return sum + l.price * q;
    }, 0);
  }, [lines, lineQtys]);

  const activeUnitObj = unitsData.find(
    (u) => String(u.unit_id || u.id) === String(selectedUnitId)
  );

  return (
    <>
      {/* 1. Header Halaman F0 */}
      <PageHeader
        title="Entry · Anggaran Biaya"
        chips={
          <>
            {activeUnitObj && (
              <Chip variant="nt">
                [{activeUnitObj.code || activeUnitObj.unit_code}] {activeUnitObj.name || activeUnitObj.unit_name}
              </Chip>
            )}
            {currentDoc && (
              <Chip
                variant={
                  currentDoc.status === 'FINAL'
                    ? 'ok'
                    : currentDoc.status === 'DISETUJUI'
                    ? 'ok'
                    : currentDoc.status === 'DIAJUKAN'
                    ? 'wn'
                    : currentDoc.status === 'DIKEMBALIKAN'
                    ? 'bd'
                    : 'nt'
                }
              >
                Status: {currentDoc.status}
              </Chip>
            )}
          </>
        }
      />

      {/* 2. Banner Akses dan Deadline (BR-10, BR-12, BR-14) */}
      {docAccess && (
        docAccess.is_open ? (
          <div
            className="card"
            style={{
              background: '#DDF1E4',
              borderColor: '#9ACDAA',
              color: '#14532D',
              fontWeight: 500,
            }}
          >
            Pengajuan dibuka. Deadline pengisian:{' '}
            <b>
              {docAccess.effective_deadline
                ? new Date(docAccess.effective_deadline).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Belum ditentukan'}
            </b>
            . Semua perubahan tersimpan otomatis.
          </div>
        ) : (
          <Banner variant="bd">
            <b>Pengajuan Ditutup:</b> Akses pengisian usulan anggaran untuk unit ini sedang ditutup.
            {docAccess.reason ? ` (${docAccess.reason})` : ''} Hubungi {docAccess.contact_accounting || 'Akuntansi'}.
          </Banner>
        )
      )}

      {/* 3. Catatan Pengembalian oleh Manager/Akuntansi bila ada */}
      {currentDoc?.status === 'DIKEMBALIKAN' && returnNote && (
        <Banner variant="wn">
          <b>Dokumen Dikembalikan untuk Revisi:</b> Catatan dari{' '}
          {returnNote.actor_name || returnNote.actor_role || 'Pemeriksa'}: &ldquo;
          {returnNote.note}&rdquo;. Silakan sesuaikan kuantitas anggaran lalu ajukan kembali.
        </Banner>
      )}

      {/* 4. Sub Navigasi: Anggaran Biaya vs Anggaran Investasi */}
      <div className="row" style={{ marginTop: '4px' }}>
        <Link
          to="/entry/biaya"
          className="chip ok"
          style={{ padding: '10px 16px', textDecoration: 'none', fontWeight: 600 }}
        >
          Anggaran Biaya
        </Link>
        <Link
          to="/entry/investasi"
          className="chip nt"
          style={{ padding: '10px 16px', textDecoration: 'none' }}
        >
          Anggaran Investasi
        </Link>
      </div>

      {/* 5. Filter Berurutan Sesuai Mockup */}
      <div className="row" style={{ alignItems: 'flex-end', gap: '12px' }}>
        {/* Pemilih Unit jika pengguna memiliki akses ke lebih dari 1 unit */}
        {unitsData.length > 1 && (
          <label htmlFor="unit">
            Unit Kerja
            <select
              id="unit"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              {unitsData.map((u) => {
                const uid = String(u.unit_id || u.id);
                return (
                  <option key={uid} value={uid}>
                    [{u.code || u.unit_code}] {u.name || u.unit_name}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        {/* 1. Cari Barang */}
        <label htmlFor="cari">
          Cari barang
          <input
            id="cari"
            placeholder="Nama atau kode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/* 2. Jenis COA */}
        <label htmlFor="jns">
          Jenis COA
          <select
            id="jns"
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setSelectedCoaId('');
            }}
          >
            <option value="">Semua jenis</option>
            {coaGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        {/* 3. COA */}
        <label htmlFor="coa">
          COA
          <select
            id="coa"
            value={selectedCoaId}
            onChange={(e) => setSelectedCoaId(e.target.value)}
          >
            <option value="">Semua COA</option>
            {coasList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* 4. Periode */}
        <label htmlFor="per">
          Periode
          <select
            id="per"
            value={selectedPeriodYear}
            onChange={(e) => setSelectedPeriodYear(e.target.value)}
          >
            {periodsData.map((p) => (
              <option key={p.id} value={String(p.year)}>
                {p.name || `RKAP ${p.year}`}
              </option>
            ))}
          </select>
        </label>

        {/* 5. Realisasi dari bulan */}
        <label htmlFor="b1">
          Realisasi dari bulan
          <select
            id="b1"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {/* s.d. bulan */}
        <label htmlFor="b2">
          s.d. bulan
          <select
            id="b2"
            value={endMonth}
            onChange={(e) => setEndMonth(e.target.value)}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        {/* Tombol Aksi Tambahan */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {!isReadOnly && docId && (
            <>
              <button
                type="button"
                className="btn b2"
                onClick={() => setIsAddMasterOpen(true)}
              >
                + Tambah dari master
              </button>
              <button
                type="button"
                className="btn b2"
                onClick={() => setIsRefreshPriceOpen(true)}
                title="Perbarui snapshot harga dengan master terkini"
              >
                Perbarui harga
              </button>
            </>
          )}
        </div>
      </div>

      {/* 6. Pesan Bentrok Versi (Optimistic Locking / HTTP 409) */}
      {conflictError && (
        <Banner
          variant="bd"
          action={
            <button
              type="button"
              className="btn b2"
              onClick={() => {
                setConflictError(null);
                refetchLines();
                refetchDoc();
              }}
            >
              Muat Ulang Baris
            </button>
          }
        >
          <b>Bentrok Versi:</b> {conflictError.message}
        </Banner>
      )}

      {/* 7. Keadaan Belum Ada Dokumen */}
      {!isLoadingDoc && !currentDoc && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <h2 style={{ fontSize: '17px', color: '#1F2233', margin: '0 0 8px' }}>
            Belum Ada Dokumen Anggaran Biaya
          </h2>
          <p style={{ color: '#5E6070', fontSize: '13px', margin: '0 0 16px' }}>
            Dokumen anggaran biaya untuk unit ini pada periode {selectedPeriodYear} belum dibuat.
          </p>
          {isSubmissionOpen && (
            <button
              type="button"
              className="btn"
              onClick={() => createDocMutation.mutate()}
              disabled={createDocMutation.isPending}
            >
              {createDocMutation.isPending ? 'Membuat...' : '+ Buat Draft Anggaran Biaya'}
            </button>
          )}
        </div>
      )}

      {/* 8. Tabel Anggaran Biaya Sesuai Mockup */}
      {currentDoc && (
        <div className="card sc">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No.</th>
                <th>Barang</th>
                <th>Satuan</th>
                <th className="r">Harga</th>
                <th className="r">Real ({startMonthLabel} s.d. {endMonthLabel})</th>
                <th style={{ width: '110px' }}>Qty RKAP {selectedPeriodYear}</th>
                <th className="r">Jumlah</th>
                <th>COA</th>
                {!isReadOnly && <th style={{ textAlign: 'center', width: '50px' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {isLoadingLines ? (
                <tr>
                  <td colSpan={isReadOnly ? 8 : 9} style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                    Memuat rincian anggaran biaya...
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 8 : 9} style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                    Belum ada baris anggaran biaya pada dokumen ini. Klik tombol{' '}
                    <b>&ldquo;+ Tambah dari master&rdquo;</b> untuk menambahkan barang.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const qtyVal =
                    lineQtys[line.id] !== undefined ? lineQtys[line.id] : line.qty;
                  const parsedQty = parseInt(qtyVal, 10) || 0;
                  const subtotal = line.price * parsedQty;

                  // Realisasi per item dari tabel jurnal
                  const realVal = realizationMap.get(line.item_id);
                  const realDisplay =
                    realVal !== undefined && realVal !== null
                      ? formatRupiah(realVal)
                      : '—';

                  return (
                    <tr key={line.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <b>{line.item_name}</b>
                        {line.item_code && <div className="lb">{line.item_code}</div>}
                      </td>
                      <td>{line.uom}</td>
                      <td className="r">{formatRupiah(line.price)}</td>
                      <td className="r">{realDisplay}</td>
                      <td>
                        <input
                          aria-label={`Qty ${line.item_name}`}
                          type="number"
                          min="0"
                          value={qtyVal}
                          onChange={(e) => handleQtyChange(line, e.target.value)}
                          disabled={isReadOnly}
                          style={{
                            width: '72px',
                            minHeight: '36px',
                            height: '36px',
                            padding: '6px',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                      <td className="r font-bold">{formatRupiah(subtotal)}</td>
                      <td>
                        <b>{line.coa_code}</b> {line.coa_name}
                        <div className="lb">Jenis: {line.group_name || 'Biaya Operasional'}</div>
                      </td>
                      {!isReadOnly && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn b3"
                            style={{ minHeight: '30px', height: '30px', padding: '0 8px', fontSize: '11px' }}
                            title="Hapus baris"
                            onClick={() => {
                              if (window.confirm(`Hapus barang '${line.item_name}' dari anggaran?`)) {
                                deleteLineMutation.mutate(line.id);
                              }
                            }}
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#FAF7F2', fontWeight: 'bold' }}>
                  <td colSpan="6" style={{ textAlign: 'right', padding: '12px 8px' }}>
                    TOTAL ANGGARAN BIAYA UNIT:
                  </td>
                  <td className="r" style={{ padding: '12px 8px', fontSize: '15px', color: '#14532D' }}>
                    Rp {formatRupiah(totalDocAmount)}
                  </td>
                  <td colSpan={isReadOnly ? 1 : 2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 9. Permintaan Barang Baru (Khusus PIC) Sesuai Mockup */}
      {currentDoc && (
        <NewItemRequestPicCard
          docId={currentDoc.id}
          isReadOnly={isReadOnly}
          onSubmitted={() => {
            refetchDoc();
            refetchLines();
          }}
        />
      )}

      {/* 10. Footer Aksi: Indikator Tersimpan Otomatis & Tombol Ajukan ke Manager */}
      {currentDoc && (
        <div
          className="hd"
          style={{
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: '1px solid #E6E0D6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              className={`chip ${
                saveStatus === 'saving'
                  ? 'wn'
                  : saveStatus === 'error'
                  ? 'bd'
                  : 'ok'
              }`}
              role="status"
            >
              {saveStatus === 'saving'
                ? 'Menyimpan...'
                : saveStatus === 'error'
                ? 'Gagal menyimpan otomatis'
                : `Tersimpan otomatis · ${savedTime}`}
            </span>

            {!isReadOnly && (
              <button
                type="button"
                className="btn"
                onClick={handleSubmitToManager}
                disabled={submitToManagerMutation.isPending}
              >
                {submitToManagerMutation.isPending
                  ? 'Mengajukan...'
                  : 'Ajukan ke Manager'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Dialogs */}
      {isAddMasterOpen && (
        <AddMasterItemDialog
          isOpen={isAddMasterOpen}
          onClose={() => setIsAddMasterOpen(false)}
          docId={docId}
          onItemAdded={() => {
            refetchLines();
            refetchDoc();
          }}
        />
      )}

      {isRefreshPriceOpen && (
        <RefreshPriceConfirmDialog
          isOpen={isRefreshPriceOpen}
          onClose={() => setIsRefreshPriceOpen(false)}
          onConfirm={() => refreshPricesMutation.mutate()}
          isPending={refreshPricesMutation.isPending}
        />
      )}
    </>
  );
}
