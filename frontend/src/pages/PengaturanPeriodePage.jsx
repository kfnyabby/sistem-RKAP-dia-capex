import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import Banner from '../components/common/Banner';
import PengaturanSubNav from '../components/pengaturan/PengaturanSubNav';
import TogglePeriodModal from '../components/pengaturan/TogglePeriodModal';
import PeriodOverrideModal from '../components/pengaturan/PeriodOverrideModal';
import CreatePeriodModal from '../components/pengaturan/CreatePeriodModal';
import budgetApi from '../api/budget.api';
import submissionAccessApi from '../api/submissionAccess.api';
import settingApi from '../api/setting.api';
import masterApi from '../api/master.api';

// Format helper tanggal Indonesia (contoh: 25 Nov 2026)
function formatIndonesianDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Format input date YYYY-MM-DD
function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  try {
    return dateStr.split('T')[0];
  } catch {
    return '';
  }
}

export default function PengaturanPeriodePage() {
  const queryClient = useQueryClient();

  // State notifikasi banner
  const [feedback, setFeedback] = useState(null); // { type: 'ok' | 'bd', message: '' }

  // 1. Ambil daftar periode via TanStack Query
  const { data: periodsData = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ['periods'],
    queryFn: budgetApi.getPeriods,
  });

  const periods = useMemo(() => {
    return Array.isArray(periodsData) ? periodsData : (periodsData?.data || []);
  }, [periodsData]);

  // State periode yang sedang dipilih
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(String(periods[0].id || periods[0].period_id));
    }
  }, [periods, selectedPeriodId]);

  const activePeriod = useMemo(() => {
    return periods.find((p) => String(p.id || p.period_id) === String(selectedPeriodId)) || null;
  }, [periods, selectedPeriodId]);

  // 2. Ambil pengaturan saklar otomatis dari /api/settings via TanStack Query
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingApi.getSettings,
  });

  const systemSettings = useMemo(() => {
    return settingsData?.data || settingsData?.settings || {};
  }, [settingsData]);

  // 3. Ambil data referensi (perusahaan) untuk modal buat periode
  const { data: references } = useQuery({
    queryKey: ['references'],
    queryFn: masterApi.getReferenceData,
  });

  // 4. Ambil daftar unit-access untuk periode terpilih
  const { data: unitAccessResponse, isLoading: loadingUnitAccess } = useQuery({
    queryKey: ['unitAccess', selectedPeriodId],
    queryFn: () => submissionAccessApi.getUnitAccessList(selectedPeriodId),
    enabled: !!selectedPeriodId,
  });

  const unitAccessList = useMemo(() => {
    return unitAccessResponse?.data || (Array.isArray(unitAccessResponse) ? unitAccessResponse : []);
  }, [unitAccessResponse]);

  // State form deadline per tahap & saklar
  const [fillDeadline, setFillDeadline] = useState('');
  const [reviewDeadline, setReviewDeadline] = useState('');
  const [lockDate, setLockDate] = useState('');
  const [autoClose, setAutoClose] = useState(true);
  const [autoReopen, setAutoReopen] = useState(true);
  const [isSavingDeadlines, setIsSavingDeadlines] = useState(false);

  // Sinkronkan form saat activePeriod atau settings berubah
  useEffect(() => {
    if (activePeriod) {
      setFillDeadline(toDateInputValue(activePeriod.fill_deadline));
      setReviewDeadline(toDateInputValue(activePeriod.review_deadline));
      setLockDate(toDateInputValue(activePeriod.lock_date));
      if (activePeriod.auto_close !== undefined) {
        setAutoClose(Boolean(activePeriod.auto_close));
      }
    }
  }, [activePeriod]);

  useEffect(() => {
    if (systemSettings) {
      if (systemSettings.auto_close_on_deadline !== undefined) {
        setAutoClose(Boolean(systemSettings.auto_close_on_deadline));
      }
      if (systemSettings.auto_reopen_on_return !== undefined) {
        setAutoReopen(Boolean(systemSettings.auto_reopen_on_return));
      }
    }
  }, [systemSettings]);

  // Filter pencarian unit
  const [searchUnit, setSearchUnit] = useState('');
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);

  const filteredUnits = useMemo(() => {
    if (!searchUnit.trim()) return unitAccessList;
    const q = searchUnit.toLowerCase();
    return unitAccessList.filter((u) => {
      const code = (u.unit_code || '').toLowerCase();
      const name = (u.unit_name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [unitAccessList, searchUnit]);

  // Toggle select all unit
  const isAllSelected = filteredUnits.length > 0 && filteredUnits.every((u) => selectedUnitIds.includes(u.unit_id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const currentFilteredIds = new Set(filteredUnits.map((u) => u.unit_id));
      setSelectedUnitIds((prev) => prev.filter((id) => !currentFilteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedUnitIds, ...filteredUnits.map((u) => u.unit_id)]);
      setSelectedUnitIds(Array.from(newIds));
    }
  };

  const toggleSelectUnit = (unitId) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  // State Modal-modal
  const [togglePeriodModal, setTogglePeriodModal] = useState({
    open: false,
    targetState: 'TUTUP',
    loading: false,
    errorMsg: null,
  });

  const [overrideModal, setOverrideModal] = useState({
    open: false,
    units: [],
    targetState: 'BUKA',
    loading: false,
    errorMsg: null,
  });

  const [createPeriodModalOpen, setCreatePeriodModalOpen] = useState(false);

  // Status submission periode saat ini
  const currentPeriodState = activePeriod?.submission_state || 'BUKA';

  // Handler: Simpan deadline & saklar settings
  const handleSaveDeadlines = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPeriodId) return;

    setFeedback(null);
    setIsSavingDeadlines(true);

    try {
      // 1. Simpan deadline ke periode
      await submissionAccessApi.updateDeadlines(selectedPeriodId, {
        fill_deadline: fillDeadline || null,
        review_deadline: reviewDeadline || null,
        lock_date: lockDate || null,
        auto_close: autoClose,
      });

      // 2. Simpan saklar ke tabel settings
      await settingApi.updateSettings({
        auto_close_on_deadline: autoClose,
        auto_reopen_on_return: autoReopen,
      });

      setFeedback({
        type: 'ok',
        message: 'Batas waktu tahapan dan pengaturan penutupan otomatis berhasil disimpan.',
      });

      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['unitAccess'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan deadline periode';
      setFeedback({ type: 'bd', message: msg });
    } finally {
      setIsSavingDeadlines(false);
    }
  };

  // Handler: Toggle Buka/Tutup pengajuan periode
  const handleConfirmTogglePeriod = async (targetState, reason) => {
    if (!selectedPeriodId) return;

    setTogglePeriodModal((prev) => ({ ...prev, loading: true, errorMsg: null }));
    try {
      const res = await submissionAccessApi.togglePeriodSubmission(selectedPeriodId, targetState, reason);
      setFeedback({
        type: 'ok',
        message: res.message || `Status pengajuan periode berhasil diubah menjadi ${targetState}.`,
      });
      setTogglePeriodModal({ open: false, targetState: 'TUTUP', loading: false, errorMsg: null });
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['unitAccess'] });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal mengubah status pengajuan periode';
      setTogglePeriodModal((prev) => ({ ...prev, loading: false, errorMsg: msg }));
    }
  };

  // Handler: Buka modal override untuk satu unit
  const handleOpenSingleOverride = (unit, targetState) => {
    setOverrideModal({
      open: true,
      units: [unit],
      targetState,
      loading: false,
      errorMsg: null,
    });
  };

  // Handler: Buka modal override untuk massal
  const handleOpenBulkOverride = (targetState) => {
    const selectedUnits = unitAccessList.filter((u) => selectedUnitIds.includes(u.unit_id));
    if (selectedUnits.length === 0) return;

    setOverrideModal({
      open: true,
      units: selectedUnits,
      targetState,
      loading: false,
      errorMsg: null,
    });
  };

  // Handler: Eksekusi override unit (tunggal atau massal)
  const handleConfirmOverride = async ({ units, targetState, docType, deadlineOverride, reason }) => {
    setOverrideModal((prev) => ({ ...prev, loading: true, errorMsg: null }));

    try {
      if (units.length === 1) {
        // Override tunggal
        const u = units[0];
        await submissionAccessApi.overrideUnitAccess({
          period_id: parseInt(selectedPeriodId, 10),
          unit_id: u.unit_id,
          doc_type: docType,
          state: targetState,
          deadline_override: deadlineOverride || null,
          reason,
        });
        setFeedback({
          type: 'ok',
          message: `Akses pengajuan unit [${u.unit_code}] ${u.unit_name} berhasil diubah menjadi ${targetState}.`,
        });
      } else {
        // Override massal
        const unitIds = units.map((u) => u.unit_id);
        const res = await submissionAccessApi.bulkOverrideUnitAccess({
          period_id: parseInt(selectedPeriodId, 10),
          unit_ids: unitIds,
          doc_type: docType,
          state: targetState,
          deadline_override: deadlineOverride || null,
          reason,
        });
        setFeedback({
          type: 'ok',
          message: res.message || `Berhasil mengubah akses pengajuan untuk ${unitIds.length} unit terpilih.`,
        });
        setSelectedUnitIds([]);
      }

      setOverrideModal({ open: false, units: [], targetState: 'BUKA', loading: false, errorMsg: null });
      queryClient.invalidateQueries({ queryKey: ['unitAccess'] });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal memperbarui status akses unit';
      setOverrideModal((prev) => ({ ...prev, loading: false, errorMsg: msg }));
    }
  };

  // Helper tampilan Sumber
  const renderSourceChip = (unit) => {
    const src = (unit.source || '').toUpperCase();
    if (src === 'MANUAL') {
      return 'Manual (perpanjangan)';
    }
    if (src === 'RETURNED') {
      return 'Dikembalikan (otomatis)';
    }
    return 'Periode';
  };

  // Helper tampilan Jenis
  const renderDocType = (unit) => {
    const dt = (unit.doc_type || 'SEMUA').toUpperCase();
    if (dt === 'BIAYA') return 'Biaya';
    if (dt === 'INVESTASI') return 'Investasi';
    return 'Semua';
  };

  return (
    <>
      {/* Header Halaman Mockup */}
      <PageHeader
        title="Pengaturan · Periode dan Pengajuan"
        chips={
          activePeriod ? (
            <Chip variant="nt">
              {activePeriod.company_code || 'CN'} · RKAP {activePeriod.year}
            </Chip>
          ) : (
            <Chip variant="nt">Periode RKAP</Chip>
          )
        }
      />

      {/* Bilah Sub Navigasi Pengaturan Standar */}
      <PengaturanSubNav />

      {/* Banner Feedback / Notifikasi */}
      {feedback && (
        <Banner variant={feedback.type}>
          <span>{feedback.message}</span>
        </Banner>
      )}

      {/* 1. KARTU DEADLINE PER TAHAP */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>Deadline per tahap</h2>

          {/* Pemilihan Periode Aktif */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#5E6070', fontWeight: 500 }}>Periode Aktif:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => {
                setSelectedPeriodId(e.target.value);
                setSelectedUnitIds([]);
              }}
              disabled={loadingPeriods}
              style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px' }}
            >
              {periods.map((p) => (
                <option key={p.id || p.period_id} value={p.id || p.period_id}>
                  {p.company_code || 'CN'} — RKAP {p.year} ({p.submission_state || 'BUKA'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSaveDeadlines}>
          <div className="row">
            <label htmlFor="d1">
              Pengisian
              <input
                id="d1"
                type="date"
                value={fillDeadline}
                onChange={(e) => setFillDeadline(e.target.value)}
              />
            </label>

            <label htmlFor="d2">
              Validasi
              <input
                id="d2"
                type="date"
                value={reviewDeadline}
                onChange={(e) => setReviewDeadline(e.target.value)}
              />
            </label>

            <label htmlFor="d3">
              Lock
              <input
                id="d3"
                type="date"
                value={lockDate}
                onChange={(e) => setLockDate(e.target.value)}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1F2233', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoClose}
                onChange={(e) => setAutoClose(e.target.checked)}
                style={{ minHeight: '20px', width: '20px', margin: 0 }}
              />
              <span>Tutup otomatis saat deadline</span>
            </label>

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1F2233', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoReopen}
                onChange={(e) => setAutoReopen(e.target.checked)}
                style={{ minHeight: '20px', width: '20px', margin: 0 }}
              />
              <span>Buka otomatis saat dokumen dikembalikan</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" className="btn" disabled={isSavingDeadlines}>
                {isSavingDeadlines ? 'Menyimpan...' : 'Simpan deadline'}
              </button>

              {currentPeriodState === 'BUKA' ? (
                <button
                  type="button"
                  className="btn b3"
                  onClick={() => setTogglePeriodModal({ open: true, targetState: 'TUTUP', loading: false, errorMsg: null })}
                >
                  Tutup pengajuan periode
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setTogglePeriodModal({ open: true, targetState: 'BUKA', loading: false, errorMsg: null })}
                >
                  Buka pengajuan periode
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn b2"
              onClick={() => setCreatePeriodModalOpen(true)}
            >
              + Buat Periode Baru
            </button>
          </div>
        </form>
      </div>

      {/* 2. KARTU STATUS PER UNIT */}
      <div className="card sc">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ margin: 0 }}>Status per unit</h2>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Toolbar Aksi Massal */}
            {selectedUnitIds.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '8px' }}>
                <span style={{ fontSize: '12px', color: '#5E6070', fontWeight: 600 }}>
                  {selectedUnitIds.length} unit dipilih:
                </span>
                <button
                  type="button"
                  className="btn b2"
                  onClick={() => handleOpenBulkOverride('TUTUP')}
                  style={{ minHeight: '34px', padding: '0 10px', fontSize: '12px' }}
                >
                  Tutup terpilih
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleOpenBulkOverride('BUKA')}
                  style={{ minHeight: '34px', padding: '0 10px', fontSize: '12px' }}
                >
                  Buka kembali terpilih
                </button>
              </div>
            )}

            {/* Input Pencarian Unit */}
            <input
              type="text"
              value={searchUnit}
              onChange={(e) => setSearchUnit(e.target.value)}
              placeholder="Cari unit (kode / nama)..."
              style={{ minHeight: '36px', padding: '4px 10px', fontSize: '13px', width: '220px' }}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  style={{ minHeight: 'auto', width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                  title="Pilih semua unit di halaman ini"
                />
              </th>
              <th>Unit</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Deadline efektif</th>
              <th>Sumber</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loadingUnitAccess ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                  Memuat status akses unit kerja...
                </td>
              </tr>
            ) : filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                  {searchUnit ? 'Tidak ada unit kerja yang cocok dengan pencarian.' : 'Belum ada data status unit untuk periode ini.'}
                </td>
              </tr>
            ) : (
              filteredUnits.map((u) => {
                const isOpen = u.is_open;
                const isSelected = selectedUnitIds.includes(u.unit_id);

                return (
                  <tr key={u.unit_id} style={{ backgroundColor: isSelected ? '#FAF7F2' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectUnit(u.unit_id)}
                        style={{ minHeight: 'auto', width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                      />
                    </td>
                    <td>
                      <strong>[{u.unit_code}]</strong> {u.unit_name}
                    </td>
                    <td>{renderDocType(u)}</td>
                    <td>
                      <span className={`chip ${isOpen ? 'ok' : 'bd'}`}>
                        {isOpen ? 'Buka' : 'Tutup'}
                      </span>
                    </td>
                    <td>{formatIndonesianDate(u.effective_deadline)}</td>
                    <td>{renderSourceChip(u)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isOpen ? (
                        <button
                          type="button"
                          className="btn b2"
                          onClick={() => handleOpenSingleOverride(u, 'TUTUP')}
                          style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                        >
                          Tutup
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleOpenSingleOverride(u, 'BUKA')}
                          style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                        >
                          Buka kembali
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Buka / Tutup Pengajuan Periode */}
      <TogglePeriodModal
        isOpen={togglePeriodModal.open}
        targetState={togglePeriodModal.targetState}
        periodName={activePeriod ? `${activePeriod.company_code || 'CN'} · RKAP ${activePeriod.year}` : 'Periode'}
        onClose={() => setTogglePeriodModal((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirmTogglePeriod}
        loading={togglePeriodModal.loading}
        errorMsg={togglePeriodModal.errorMsg}
      />

      {/* Modal Override Akses Unit (Tunggal & Massal) */}
      <PeriodOverrideModal
        isOpen={overrideModal.open}
        units={overrideModal.units}
        targetState={overrideModal.targetState}
        onClose={() => setOverrideModal((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirmOverride}
        loading={overrideModal.loading}
        errorMsg={overrideModal.errorMsg}
      />

      {/* Modal Buat Periode Anggaran Baru */}
      <CreatePeriodModal
        isOpen={createPeriodModalOpen}
        companies={references?.companies || []}
        onClose={() => setCreatePeriodModalOpen(false)}
        onSuccess={() => {
          setFeedback({
            type: 'ok',
            message: 'Periode anggaran baru berhasil dibuat.',
          });
          queryClient.invalidateQueries({ queryKey: ['periods'] });
        }}
      />
    </>
  );
}
