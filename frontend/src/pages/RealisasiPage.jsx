import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import realizationApi from '../api/realization.api';
import masterApi from '../api/master.api';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';

function formatNumber(val) {
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

export default function RealisasiPage() {
  const queryClient = useQueryClient();

  // Form State
  const [companyCode, setCompanyCode] = useState('CN');
  const [mode, setMode] = useState('replace_month');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [alertSuccess, setAlertSuccess] = useState(null);

  // Active Batch Being Previewed
  const [activeBatchId, setActiveBatchId] = useState(null);

  // Unit mapping temporary state { [raw_unit]: unit_id }
  const [mappingSelections, setMappingSelections] = useState({});

  // 1. Query Daftar Unit untuk Pemetaan (berdasarkan perusahaan aktif)
  const unitsQuery = useQuery({
    queryKey: ['units', companyCode],
    queryFn: async () => {
      const data = await masterApi.getUnits({ company_code: companyCode });
      return data || [];
    },
  });

  const availableUnits = unitsQuery.data || [];

  // 2. Query Detail Batch Aktif (dengan Polling jika status PROCESSING)
  const batchDetailQuery = useQuery({
    queryKey: ['import-detail', activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return null;
      const res = await realizationApi.getImportDetail(activeBatchId);
      return res?.data || null;
    },
    enabled: Boolean(activeBatchId),
    refetchInterval: (query) => {
      const status = query.state?.data?.status;
      return status === 'PROCESSING' ? 1500 : false;
    },
  });

  const activeBatch = batchDetailQuery.data;

  // 3. Query Unit Belum Terpetakan
  const unmappedQuery = useQuery({
    queryKey: ['unmapped-units', activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return [];
      const res = await realizationApi.getUnmappedUnits(activeBatchId);
      return res?.data || [];
    },
    enabled: Boolean(activeBatchId && (activeBatch?.status === 'PREVIEW' || activeBatch?.status === 'PROCESSING')),
  });

  const unmappedUnits = unmappedQuery.data || [];

  // 4. Query Galat Baris Batch
  const errorsQuery = useQuery({
    queryKey: ['batch-errors', activeBatchId],
    queryFn: async () => {
      if (!activeBatchId) return [];
      const res = await realizationApi.getErrors(activeBatchId, { per_page: 50 });
      return res?.data || [];
    },
    enabled: Boolean(activeBatchId && (activeBatch?.status === 'PREVIEW' || activeBatch?.status === 'CONFIRMED')),
  });

  const batchErrors = errorsQuery.data || [];

  // 5. Query Riwayat Batch Import
  const batchHistoryQuery = useQuery({
    queryKey: ['realization-history', companyCode],
    queryFn: async () => {
      const res = await realizationApi.listImports({ company_code: companyCode, per_page: 20 });
      return res?.data || [];
    },
  });

  const batchHistory = batchHistoryQuery.data || [];

  // Langkah Aktif: 1: Unggah, 2: Pratinjau, 3: Konfirmasi
  const currentStep = useMemo(() => {
    if (!activeBatch) return 1;
    if (activeBatch.status === 'PROCESSING' || activeBatch.status === 'PREVIEW') return 2;
    if (activeBatch.status === 'CONFIRMED') return 3;
    return 1;
  }, [activeBatch]);

  // Mutations
  const mapUnitMutation = useMutation({
    mutationFn: ({ rawUnit, unitId }) =>
      realizationApi.updateUnitAlias({
        company_code: activeBatch?.company_code || companyCode,
        alias_name: rawUnit,
        unit_id: parseInt(unitId, 10),
      }),
    onSuccess: (res, vars) => {
      setAlertSuccess(
        `Alias '${vars.rawUnit}' berhasil dipetakan ke unit dan ${res?.data?.remapped_rows ?? 0} baris diperbarui.`
      );
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['import-detail', activeBatchId] });
      queryClient.invalidateQueries({ queryKey: ['unmapped-units', activeBatchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-errors', activeBatchId] });
    },
    onError: (err) => {
      setUploadError(err.response?.data?.message || 'Gagal memetakan unit');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (batchId) => realizationApi.confirmImport(batchId),
    onSuccess: () => {
      setAlertSuccess('Batch import realisasi berhasil dikonfirmasi (CONFIRMED). Realisasi buku besar telah aktif.');
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['import-detail', activeBatchId] });
      queryClient.invalidateQueries({ queryKey: ['realization-history'] });
    },
    onError: (err) => {
      setUploadError(err.response?.data?.message || 'Gagal mengonfirmasi batch import.');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (batchId) => realizationApi.rollbackImport(batchId),
    onSuccess: () => {
      setAlertSuccess('Batch import realisasi berhasil dibatalkan (rollback). Seluruh data terkait telah dihapus.');
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ['realization-history'] });
      setActiveBatchId(null);
    },
    onError: (err) => {
      setUploadError(err.response?.data?.message || 'Gagal membatalkan batch import.');
    },
  });

  // Handler Upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        setUploadError('File harus berupa berkas spreadsheet Excel (.xlsx)');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Pilih berkas daftar jurnal (.xlsx) terlebih dahulu.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('company_code', companyCode);
    formData.append('mode', mode);

    // Langsung kosongkan file dari memori peramban
    setSelectedFile(null);
    const fileInput = document.getElementById('fx');
    if (fileInput) fileInput.value = '';

    setIsUploading(true);
    setUploadError(null);
    setAlertSuccess(null);

    try {
      const res = await realizationApi.uploadRealization(formData);
      const batchId = res?.data?.batch_id || res?.data?.id;
      setActiveBatchId(batchId);
      setAlertSuccess('Berkas berhasil diunggah dan sedang diproses di latar belakang.');
      queryClient.invalidateQueries({ queryKey: ['realization-history'] });
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Gagal mengunggah berkas daftar jurnal.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMapUnit = (rawUnit) => {
    const unitId = mappingSelections[rawUnit];
    if (!unitId) {
      alert('Pilih unit tujuan pemetaan terlebih dahulu.');
      return;
    }
    mapUnitMutation.mutate({ rawUnit, unitId });
  };

  const handleConfirmImport = () => {
    if (!activeBatchId) return;
    if (unmappedUnits.length > 0 || (activeBatch?.rows_without_unit ?? 0) > 0) {
      setUploadError(
        `Konfirmasi ditolak (409 Conflict): Masih ada ${unmappedUnits.length} unit yang belum terpetakan. Silakan petakan seluruh unit terlebih dahulu.`
      );
      return;
    }
    if (!window.confirm('Konfirmasi import realisasi ini? Data akan berstatus CONFIRMED dan masuk perhitungan realisasi.')) {
      return;
    }
    confirmMutation.mutate(activeBatchId);
  };

  const handleRollback = (batchIdToRollback) => {
    const id = batchIdToRollback || activeBatchId;
    if (!id) return;
    if (!window.confirm('Batalkan (rollback) batch import ini? Seluruh baris transaksi jurnal akan dihapus secara permanen.')) {
      return;
    }
    rollbackMutation.mutate(id);
  };

  return (
    <>
      <PageHeader
        title="Proses · Input Realisasi"
        chips={<Chip variant="nt">Akuntansi · {companyCode}</Chip>}
      />

      {/* Stepper Indikator Langkah (Satu Warna Chip NT Sesuai DESIGN.md) */}
      <ol style={{ display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
        <li>
          <span
            className="chip nt"
            style={{
              padding: '8px 16px',
              fontWeight: currentStep === 1 ? 700 : 400,
              textDecoration: currentStep === 1 ? 'underline' : 'none',
            }}
          >
            1. Unggah
          </span>
        </li>
        <li>
          <span
            className="chip nt"
            aria-current={currentStep === 2 ? 'step' : undefined}
            style={{
              padding: '8px 16px',
              fontWeight: currentStep === 2 ? 700 : 400,
              textDecoration: currentStep === 2 ? 'underline' : 'none',
            }}
          >
            2. Pratinjau
          </span>
        </li>
        <li>
          <span
            className="chip nt"
            style={{
              padding: '8px 16px',
              fontWeight: currentStep === 3 ? 700 : 400,
              textDecoration: currentStep === 3 ? 'underline' : 'none',
            }}
          >
            3. Konfirmasi
          </span>
        </li>
      </ol>

      {/* Notifikasi Pesan Sukses / Galat */}
      {alertSuccess && (
        <div
          style={{
            padding: '10px 16px',
            background: '#DDF1E4',
            color: '#14532D',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #B7DFC7',
            marginTop: 12,
          }}
        >
          ✓ {alertSuccess}
        </div>
      )}
      {uploadError && (
        <div
          style={{
            padding: '10px 16px',
            background: '#F8D9D6',
            color: '#8A1F1B',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #ECC0BC',
            marginTop: 12,
          }}
        >
          ✕ {uploadError}
        </div>
      )}

      {/* 1. Formulir Unggah File Jurnal */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>File daftar jurnal (xlsx)</h2>
        <form onSubmit={handleUploadSubmit}>
          <div className="row">
            <label htmlFor="co" style={{ minWidth: 140 }}>
              Perusahaan
              <select
                id="co"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                disabled={isUploading}
              >
                <option value="CN">CN</option>
                <option value="CNH">CNH</option>
              </select>
            </label>

            <label htmlFor="fx" style={{ flex: 1, minWidth: 260 }}>
              File daftar jurnal (.xlsx)
              <input
                id="fx"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>

            <label htmlFor="md" style={{ minWidth: 280 }}>
              Bila bulan ini sudah pernah diunggah
              <select
                id="md"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                disabled={isUploading}
              >
                <option value="replace_month">Ganti data bulan ini (disarankan)</option>
                <option value="append">Tambahkan saja; lewati ID sub jurnal yang sama</option>
              </select>
            </label>

            <button
              type="submit"
              className="btn b2"
              disabled={!selectedFile || isUploading}
              style={{ minHeight: '44px' }}
            >
              {isUploading ? 'Mengunggah...' : 'Unggah dan pratinjau'}
            </button>
          </div>
        </form>

        {/* Status Polling Latar Belakang */}
        {activeBatch && activeBatch.status === 'PROCESSING' && (
          <div style={{ marginTop: 14, padding: 12, background: '#FAF7F2', borderRadius: 6, border: '1px solid #E6E0D6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1F2233' }}>
                ⏳ Memproses berkas jurnal di latar belakang...
              </span>
              <Chip variant="wn">Sedang membaca baris</Chip>
            </div>
            <div style={{ width: '100%', height: 8, background: '#E6E0D6', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${activeBatch.progress_percent || 30}%`,
                  height: '100%',
                  background: '#3D4E9C',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#5E6070' }}>
              Baris terbaca saat ini: <b>{formatNumber(activeBatch.rows_read || 0)}</b>. Proses berjalan di server, halaman boleh ditinggalkan dan data tidak akan hilang.
            </p>
          </div>
        )}

        {/* Informasi Periode Terdeteksi saat PREVIEW atau CONFIRMED */}
        {activeBatch && activeBatch.status !== 'PROCESSING' && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#5E6070' }}>
            Periode terdeteksi dari kolom TANGGAL: <b>{activeBatch.period || '—'}</b>. Berkas ini memiliki{' '}
            <b>{formatNumber(activeBatch.rows_total || activeBatch.rows_read || 0)}</b> baris. Selesai diproses dalam{' '}
            <b>{activeBatch.read_seconds || 0} detik</b>.
            {activeBatch.status === 'CONFIRMED' && (
              <span style={{ color: '#14532D', fontWeight: 600, marginLeft: 8 }}>✓ Telah dikonfirmasi</span>
            )}
            {activeBatch.status === 'PREVIEW' && (
              <span style={{ color: '#7A3E00', fontWeight: 600, marginLeft: 8 }}>• Menunggu konfirmasi</span>
            )}
          </p>
        )}
      </div>

      {/* 2. Empat Kartu Ringkasan Metrik (Mockup .g4) */}
      {activeBatch && (
        <div className="g4" style={{ marginTop: 12 }}>
          <div className="card">
            <div className="lb">Baris dibaca</div>
            <div className="vl">{formatNumber(activeBatch.rows_total || activeBatch.rows_read || 0)}</div>
          </div>
          <div className="card">
            <div className="lb">Dipakai sebagai realisasi</div>
            <div className="vl">{formatNumber(activeBatch.rows_used || 0)}</div>
            <div className="lb">
              {formatNumber(activeBatch.rows_expense || 0)} biaya · {formatNumber(activeBatch.rows_investment || 0)} investasi
            </div>
          </div>
          <div className="card">
            <div className="lb">Dilewati (bukan akun biaya/invest)</div>
            <div className="vl">{formatNumber(activeBatch.rows_skipped || 0)}</div>
            <div className="lb">pendapatan, piutang, hutang, kas</div>
          </div>
          <div className="card">
            <div className="lb">Baris biaya tanpa unit</div>
            <div
              className="vl"
              style={{
                color: (activeBatch.rows_without_unit ?? 0) > 0 ? '#8A1F1B' : '#14532D',
              }}
            >
              {formatNumber(activeBatch.rows_without_unit || 0)}
            </div>
            {(activeBatch.rows_without_unit ?? 0) > 0 && (
              <div className="lb" style={{ color: '#8A1F1B' }}>Wajib dipetakan sebelum konfirmasi</div>
            )}
          </div>
        </div>
      )}

      {/* 3. Tabel Pemetaan Unit & Kolom Dipakai */}
      {activeBatch && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 12 }}>
          {/* Kolom Kiri: Pemetaan Unit */}
          <div className="card sc" style={{ flex: 1, minWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>Pemetaan unit</h2>
              {unmappedUnits.length > 0 ? (
                <Chip variant="wn">{unmappedUnits.length} Unit perlu dipetakan</Chip>
              ) : (
                <Chip variant="ok">Semua unit terpetakan</Chip>
              )}
            </div>

            {unmappedUnits.length === 0 ? (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#14532D', fontSize: 13 }}>
                ✓ Seluruh nama unit pada transaksi jurnal telah berhasil dipetakan ke master unit kerja.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama unit di file</th>
                    <th className="r">Baris</th>
                    <th>Dipetakan ke unit sistem</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {unmappedUnits.map((u, i) => (
                    <tr key={u.raw_unit || i}>
                      <td>
                        <span style={{ fontWeight: 600, color: '#1F2233' }}>{u.raw_unit}</span>
                      </td>
                      <td className="r" style={{ fontWeight: 600 }}>
                        {formatNumber(u.rows_count)}
                      </td>
                      <td>
                        <label htmlFor={`unit-map-${i}`} style={{ gap: 0, width: '100%' }}>
                          <select
                            id={`unit-map-${i}`}
                            aria-label={`Petakan ${u.raw_unit}`}
                            value={mappingSelections[u.raw_unit] || ''}
                            onChange={(e) =>
                              setMappingSelections((prev) => ({
                                ...prev,
                                [u.raw_unit]: e.target.value,
                              }))
                            }
                            style={{ width: '100%', fontSize: 12 }}
                          >
                            <option value="">Pilih unit tujuan...</option>
                            {availableUnits.map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                [{unit.code}] {unit.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleMapUnit(u.raw_unit)}
                          disabled={!mappingSelections[u.raw_unit] || mapUnitMutation.isPending}
                          style={{ minHeight: '34px', padding: '0 10px', fontSize: 12 }}
                        >
                          Simpan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#5E6070' }}>
              Pemetaan disimpan dan dipakai lagi di unggahan berikutnya.
            </p>
          </div>

          {/* Kolom Kanan: Kolom yang Dipakai dari File */}
          <div className="card" style={{ flex: 1, minWidth: 420 }}>
            <h2>Kolom yang dipakai dari file</h2>
            <table>
              <thead>
                <tr>
                  <th>Kolom di file</th>
                  <th>Dipakai untuk</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>TANGGAL</b></td>
                  <td>Bulan realisasi</td>
                </tr>
                <tr>
                  <td><b>ID SUB JURNAL, IDGL</b></td>
                  <td>Penanda unik baris dan nomor jurnal (mencegah data ganda, BR-19)</td>
                </tr>
                <tr>
                  <td><b>KODE COA, NAMA COA</b></td>
                  <td>COA; nama dicocokkan sebagai pengecekan validitas</td>
                </tr>
                <tr>
                  <td><b>UNIT</b></td>
                  <td>Unit kerja (kode dalam kurung atau nama instalasi)</td>
                </tr>
                <tr>
                  <td><b>DEBET, KREDIT</b></td>
                  <td>Nilai realisasi (BR-05)</td>
                </tr>
                <tr>
                  <td><b>KETERANGAN</b></td>
                  <td>Uraian transaksi; baris pemakaian dibaca sebagai barang</td>
                </tr>
                <tr>
                  <td className="lb">Lainnya (CC, sub unit, operasional, dll.)</td>
                  <td className="lb">Dilewati / tidak dipakai</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Daftar Baris Galat & Perlu Dicek (Jika Ada) */}
      {activeBatch && batchErrors.length > 0 && (
        <div className="card sc" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ margin: 0, color: '#8A1F1B' }}>Daftar Baris Galat & Perlu Dicek ({batchErrors.length})</h2>
            <Chip variant="bd">Galat Baris</Chip>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Baris #</th>
                <th>No. Jurnal</th>
                <th>Tipe Galat</th>
                <th>Alasan / Penjelasan</th>
              </tr>
            </thead>
            <tbody>
              {batchErrors.map((err, i) => (
                <tr key={err.id || i}>
                  <td>{err.row_number || '—'}</td>
                  <td>{err.sub_journal_id || '—'}</td>
                  <td>
                    <Chip variant="wn">{err.error_type || 'VALIDASI'}</Chip>
                  </td>
                  <td style={{ color: '#8A1F1B', fontSize: 13 }}>{err.reason || 'Data tidak sesuai format'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Kartu Aturan Hitung Mockup */}
      <div className="card" style={{ marginTop: 12 }}>
        <h2>Aturan hitung</h2>
        <p style={{ margin: '0 0 6px' }}>
          <b>Biaya:</b> nilai = DEBET − KREDIT pada akun 4.x dan 5.x, dijumlah per COA, unit, dan bulan (BR-05).
        </p>
        <p style={{ margin: '0 0 6px' }}>
          <b>Investasi:</b> akun aset tetap (1.2.1.1.x). Aset dalam pelaksanaan (1.2.1.3) dipindah ke aset tetap lewat jurnal IBA, jadi hanya satu sisi yang dihitung agar tidak ganda.
        </p>
        <p style={{ margin: '0' }}>
          <b>Data ganda:</b> baris dengan ID sub jurnal yang sudah ada diganti, bukan ditambah (BR-19).
        </p>
      </div>

      {/* 6. Tombol Aksi Konfirmasi & Rollback Batch Aktif */}
      {activeBatch && activeBatch.status === 'PREVIEW' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn"
            onClick={handleConfirmImport}
            disabled={confirmMutation.isPending || (activeBatch.rows_without_unit ?? 0) > 0}
          >
            {confirmMutation.isPending ? 'Mengonfirmasi...' : 'Konfirmasi import'}
          </button>
          <button
            type="button"
            className="btn b3"
            onClick={() => handleRollback(activeBatch.id)}
            disabled={rollbackMutation.isPending}
          >
            {rollbackMutation.isPending ? 'Membatalkan...' : 'Batalkan'}
          </button>
        </div>
      )}

      {/* 7. Tabel Riwayat Batch Import Realisasi */}
      <div className="card sc" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Riwayat Batch Import Realisasi ({companyCode})</h2>
          <Chip variant="nt">{batchHistory.length} Batch tercatat</Chip>
        </div>

        {batchHistoryQuery.isLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Memuat riwayat batch import...
          </div>
        ) : batchHistory.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Belum ada riwayat batch import untuk perusahaan {companyCode}.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 60 }}>Batch ID</th>
                <th>Waktu Unggah</th>
                <th>Nama File</th>
                <th>Mode</th>
                <th>Periode</th>
                <th className="r">Baris Terbaca</th>
                <th className="r">Realisasi</th>
                <th className="r">Tanpa Unit</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {batchHistory.map((b) => (
                <tr
                  key={b.id}
                  style={{
                    background: activeBatchId === b.id ? '#FAF7F2' : undefined,
                  }}
                >
                  <td style={{ fontWeight: 600 }}>#{b.id}</td>
                  <td style={{ fontSize: 12 }}>{formatDate(b.created_at)}</td>
                  <td style={{ fontWeight: 500 }}>{b.file_name}</td>
                  <td>
                    <span style={{ fontSize: 12 }}>
                      {b.mode === 'replace_month' ? 'Ganti bulan' : 'Tambahkan'}
                    </span>
                  </td>
                  <td><b>{b.period || '—'}</b></td>
                  <td className="r">{formatNumber(b.rows_total || b.rows_read || 0)}</td>
                  <td className="r" style={{ fontWeight: 600 }}>{formatNumber(b.rows_used || 0)}</td>
                  <td
                    className="r"
                    style={{
                      color: (b.rows_without_unit ?? 0) > 0 ? '#8A1F1B' : undefined,
                      fontWeight: (b.rows_without_unit ?? 0) > 0 ? 600 : undefined,
                    }}
                  >
                    {formatNumber(b.rows_without_unit || 0)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Chip
                      variant={
                        b.status === 'CONFIRMED'
                          ? 'ok'
                          : b.status === 'PREVIEW'
                            ? 'wn'
                            : b.status === 'FAILED'
                              ? 'bd'
                              : 'nt'
                      }
                    >
                      {b.status}
                    </Chip>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn b2"
                        onClick={() => setActiveBatchId(b.id)}
                        style={{ minHeight: '32px', padding: '0 8px', fontSize: 12 }}
                      >
                        {b.status === 'PREVIEW' ? 'Lanjutkan' : 'Detail'}
                      </button>
                      {b.status !== 'ROLLED_BACK' && (
                        <button
                          type="button"
                          className="btn b3"
                          onClick={() => handleRollback(b.id)}
                          style={{ minHeight: '32px', padding: '0 8px', fontSize: 12 }}
                        >
                          Rollback
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
