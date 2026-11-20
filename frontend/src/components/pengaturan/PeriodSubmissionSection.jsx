import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Clock,
  Save,
  Sliders,
  Search,
} from 'lucide-react';
import { submissionAccessApi } from '../../api/submissionAccess.api';
import { budgetApi } from '../../api/budget.api';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function PeriodSubmissionSection() {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [loading, setLoading] = useState(false);
  const [unitList, setUnitList] = useState([]);
  const [searchUnit, setSearchUnit] = useState('');

  // Form deadline periode
  const [fillDeadline, setFillDeadline] = useState('');
  const [reviewDeadline, setReviewDeadline] = useState('');
  const [lockDate, setLockDate] = useState('');
  const [autoClose, setAutoClose] = useState(true);
  const [savingDeadlines, setSavingDeadlines] = useState(false);

  // Status periode saat ini
  const [currentPeriodState, setCurrentPeriodState] = useState('BUKA');

  // Modal Buka / Tutup Periode
  const [showTogglePeriodModal, setShowTogglePeriodModal] = useState(false);
  const [toggleStateTarget, setToggleStateTarget] = useState('TUTUP'); // 'BUKA' | 'TUTUP'
  const [toggleReason, setToggleReason] = useState('');
  const [toggling, setToggling] = useState(false);

  // Modal Override Akses Unit
  const [selectedUnitForOverride, setSelectedUnitForOverride] = useState(null);
  const [overrideState, setOverrideState] = useState('BUKA');
  const [overrideDocType, setOverrideDocType] = useState('SEMUA');
  const [overrideDeadline, setOverrideDeadline] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  // 1. Ambil daftar periode
  const fetchPeriods = useCallback(async () => {
    try {
      const data = await budgetApi.getPeriods();
      setPeriods(data || []);
      if (data && data.length > 0 && !selectedPeriodId) {
        const firstId = String(data[0].id || data[0].period_id);
        setSelectedPeriodId(firstId);
      }
    } catch (err) {
      console.error('Gagal memuat periode:', err.message);
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // 2. Saat periode terpilih berubah, ambil data unit-access dan detail deadline
  const fetchPeriodData = useCallback(async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    try {
      const p = periods.find((item) => String(item.id || item.period_id) === String(selectedPeriodId));
      if (p) {
        setFillDeadline(p.fill_deadline ? p.fill_deadline.split('T')[0] : '');
        setReviewDeadline(p.review_deadline ? p.review_deadline.split('T')[0] : '');
        setLockDate(p.lock_date ? p.lock_date.split('T')[0] : '');
        setAutoClose(p.auto_close !== undefined ? Boolean(p.auto_close) : true);
        setCurrentPeriodState(p.submission_state || 'BUKA');
      }

      const res = await submissionAccessApi.getUnitAccessList(selectedPeriodId);
      setUnitList(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil status unit periode:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, periods]);

  useEffect(() => {
    fetchPeriodData();
  }, [fetchPeriodData]);

  // Simpan perubahan deadline periode
  const handleSaveDeadlines = async (e) => {
    e.preventDefault();
    setSavingDeadlines(true);
    try {
      await submissionAccessApi.updateDeadlines(selectedPeriodId, {
        fill_deadline: fillDeadline || null,
        review_deadline: reviewDeadline || null,
        lock_date: lockDate || null,
        auto_close: autoClose,
      });
      alert('Deadline periode berhasil disimpan');
      fetchPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan deadline');
    } finally {
      setSavingDeadlines(false);
    }
  };

  // Buka atau tutup pengajuan periode
  const handleTogglePeriodSubmit = async (e) => {
    e.preventDefault();
    if (toggleStateTarget === 'BUKA' && !toggleReason.trim()) {
      alert('Alasan wajib diisi saat membuka kembali pengajuan (BR-12)');
      return;
    }

    setToggling(true);
    try {
      await submissionAccessApi.togglePeriodSubmission(
        selectedPeriodId,
        toggleStateTarget,
        toggleReason.trim()
      );
      alert(`Pengajuan periode berhasil diubah menjadi ${toggleStateTarget}`);
      setShowTogglePeriodModal(false);
      setToggleReason('');
      fetchPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status pengajuan periode');
    } finally {
      setToggling(false);
    }
  };

  // Simpan override unit
  const handleSaveUnitOverride = async (e) => {
    e.preventDefault();
    if (!selectedUnitForOverride) return;
    if (overrideState === 'BUKA' && !overrideReason.trim()) {
      alert('Alasan wajib diisi saat membuka akses pengajuan unit (BR-12)');
      return;
    }

    setOverriding(true);
    try {
      await submissionAccessApi.overrideUnitAccess({
        period_id: parseInt(selectedPeriodId, 10),
        unit_id: selectedUnitForOverride.unit_id,
        doc_type: overrideDocType,
        state: overrideState,
        deadline_override: overrideDeadline || null,
        reason: overrideReason.trim(),
      });
      alert('Akses unit berhasil diperbarui');
      setSelectedUnitForOverride(null);
      setOverrideReason('');
      setOverrideDeadline('');
      fetchPeriodData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui akses unit');
    } finally {
      setOverriding(false);
    }
  };

  const filteredUnits = unitList.filter((u) => {
    if (!searchUnit) return true;
    const q = searchUnit.toLowerCase();
    return (
      (u.unit_name && u.unit_name.toLowerCase().includes(q)) ||
      (u.unit_code && u.unit_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Filter Periode */}
      <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#3D4E9C]" />
          <div>
            <h3 className="text-sm font-bold text-[#1F2233]">Pengaturan Periode & Pengajuan</h3>
            <p className="text-xs text-[#5E6070]">
              Kelola batas tenggat pengisian unit, validasi manager, dan akses buka/tutup pengajuan (FR-P4 s.d. P10).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#5E6070]">Pilih Periode:</label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="text-xs font-semibold text-[#1F2233] bg-[#FAF7F2] border border-[#B9B4C9] rounded-md px-3 py-1.5 outline-none focus:border-[#3D4E9C]"
          >
            {periods.map((p) => (
              <option key={p.id || p.period_id} value={p.id || p.period_id}>
                RKAP {p.year} ({p.company_code || 'CN'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Kartu Pengaturan Deadline & Aksi Status Periode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom 1 & 2: Form Tenggat */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E6E0D6] p-5 shadow-2xs space-y-4">
          <h4 className="text-xs font-bold text-[#1F2233] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#3D4E9C]" />
            Tenggat Waktu Tahapan RKAP
          </h4>

          <form onSubmit={handleSaveDeadlines} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Deadline Pengisian (PIC)
                </label>
                <input
                  type="date"
                  value={fillDeadline}
                  onChange={(e) => setFillDeadline(e.target.value)}
                  className="w-full text-xs p-2 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Deadline Validasi (Manager)
                </label>
                <input
                  type="date"
                  value={reviewDeadline}
                  onChange={(e) => setReviewDeadline(e.target.value)}
                  className="w-full text-xs p-2 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Tanggal Kunci (Lock Date)
                </label>
                <input
                  type="date"
                  value={lockDate}
                  onChange={(e) => setLockDate(e.target.value)}
                  className="w-full text-xs p-2 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F0EBE2]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoClose}
                  onChange={(e) => setAutoClose(e.target.checked)}
                  className="rounded text-[#3D4E9C]"
                />
                <span className="text-xs text-[#1F2233] font-medium">
                  Tutup pengajuan otomatis saat melewati batas waktu (FR-P8)
                </span>
              </label>

              <button
                type="submit"
                disabled={savingDeadlines}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#2F3E7C] transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Tenggat
              </button>
            </div>
          </form>
        </div>

        {/* Kolom 3: Status Buka / Tutup Periode */}
        <div className="bg-white rounded-lg border border-[#E6E0D6] p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-[#1F2233] uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-[#3D4E9C]" />
              Status Akses Periode
            </h4>
            <div className="mt-3 p-3 bg-[#FAF7F2] rounded-lg border border-[#E6E0D6] flex items-center gap-3">
              {currentPeriodState === 'BUKA' ? (
                <>
                  <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="chip ok text-xs font-bold">PENGAJUAN DIBUKA</span>
                    <p className="text-[11px] text-[#5E6070] mt-1">
                      PIC dan unit dapat mengisi dan mengajukan anggaran secara normal.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-[#8A1F1B] shrink-0" />
                  <div>
                    <span className="chip bd text-xs font-bold">PENGAJUAN DITUTUP</span>
                    <p className="text-[11px] text-[#5E6070] mt-1">
                      Seluruh halaman entry berstatus read-only; pengisian dan pengajuan dinonaktifkan.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-2">
            {currentPeriodState === 'BUKA' ? (
              <button
                type="button"
                onClick={() => {
                  setToggleStateTarget('TUTUP');
                  setShowTogglePeriodModal(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#F8D9D6] border border-red-300 text-[#8A1F1B] hover:bg-red-100 rounded-md text-xs font-semibold transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Tutup Pengajuan Periode
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setToggleStateTarget('BUKA');
                  setShowTogglePeriodModal(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#DDF1E4] border border-[#9ACDAA] text-[#14532D] hover:bg-green-100 rounded-md text-xs font-semibold transition cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                Buka Pengajuan Periode
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Papan Status Akses per Unit (FR-P9) */}
      <div className="bg-white rounded-lg border border-[#E6E0D6] shadow-2xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#1F2233] uppercase tracking-wider">
              Papan Status Akses Unit Kerja (FR-P9)
            </h4>
            <p className="text-xs text-[#5E6070] mt-0.5">
              Status efektif buka/tutup pengajuan per unit, sumber aturan, serta fasilitas override.
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#5E6070] absolute left-2.5 top-3" />
            <input
              type="text"
              value={searchUnit}
              onChange={(e) => setSearchUnit(e.target.value)}
              placeholder="Cari kode atau nama unit..."
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md pl-8 pr-3 py-2 outline-none focus:border-[#3D4E9C]"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E6E0D6] rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] text-[#1F2233] font-bold border-b border-[#E6E0D6]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3">Kode</th>
                <th className="py-2.5 px-3">Nama Unit Kerja</th>
                <th className="py-2.5 px-3">Entitas</th>
                <th className="py-2.5 px-3 text-center">Status Akses</th>
                <th className="py-2.5 px-3">Deadline Efektif</th>
                <th className="py-2.5 px-3 text-center">Sumber Aturan</th>
                <th className="py-2.5 px-3">Keterangan / Alasan</th>
                <th className="py-2.5 px-3">Perubahan Terakhir</th>
                <th className="py-2.5 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE2]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#5E6070]">
                    Memuat status unit...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#5E6070]">
                    Tidak ada unit yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((u, idx) => (
                  <tr key={u.unit_id} className="hover:bg-[#FAF7F2]/60">
                    <td className="py-2.5 px-3 text-center text-[#5E6070]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#3D4E9C]">{u.unit_code}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#1F2233]">{u.unit_name}</td>
                    <td className="py-2.5 px-3 text-[#5E6070]">{u.company_code}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`chip ${u.is_open ? 'ok' : 'bd'}`}>
                        {u.is_open ? 'BUKA' : 'TUTUP'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#1F2233] font-medium">
                      {formatDate(u.effective_deadline)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`chip ${
                          u.source === 'AUTO_RETURN'
                            ? 'wn'
                            : u.source === 'MANUAL'
                              ? 'nt'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#5E6070] max-w-xs truncate" title={u.reason || ''}>
                      {u.reason || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-[#5E6070]">
                      {u.changed_by_name ? (
                        <>
                          <div>{u.changed_by_name}</div>
                          <div className="text-[10px]">{formatDate(u.changed_at)}</div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUnitForOverride(u);
                          setOverrideState(u.is_open ? 'TUTUP' : 'BUKA');
                          setOverrideDeadline(u.effective_deadline || '');
                          setOverrideReason('');
                        }}
                        className="px-2.5 py-1 bg-[#FAF7F2] border border-[#B9B4C9] hover:bg-[#F0EBE2] text-[#1F2233] rounded text-xs font-semibold cursor-pointer"
                      >
                        Ubah
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buka / Tutup Pengajuan Periode */}
      {showTogglePeriodModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="bg-white rounded-xl shadow-xl border border-[#E6E0D6] max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#1F2233]">
                {toggleStateTarget === 'BUKA' ? 'Buka Pengajuan Periode' : 'Tutup Pengajuan Periode'}
              </h3>
              <p className="text-xs text-[#5E6070] mt-1">
                {toggleStateTarget === 'BUKA'
                  ? 'Membuka kembali akses pengajuan anggaran untuk seluruh unit pada periode ini (alasan wajib diisi).'
                  : 'Menutup pengajuan untuk seluruh unit. Halaman entry akan berstatus read-only.'}
              </p>
            </div>

            <form onSubmit={handleTogglePeriodSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Alasan {toggleStateTarget === 'BUKA' ? <span className="text-red-600">*</span> : ''}
                </label>
                <textarea
                  rows={3}
                  required={toggleStateTarget === 'BUKA'}
                  value={toggleReason}
                  onChange={(e) => setToggleReason(e.target.value)}
                  placeholder={
                    toggleStateTarget === 'BUKA'
                      ? 'Contoh: Perpanjangan pengisian sesuai arahan direksi...'
                      : 'Contoh: Masuk tahap konsolidasi RKAP...'
                  }
                  className="w-full text-xs p-3 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTogglePeriodModal(false)}
                  className="px-4 py-2 border border-[#B9B4C9] text-[#1F2233] hover:bg-[#F0EBE2] rounded-md text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={toggling || (toggleStateTarget === 'BUKA' && !toggleReason.trim())}
                  className={`px-4 py-2 rounded-md text-xs font-semibold transition cursor-pointer text-white disabled:opacity-50 ${
                    toggleStateTarget === 'BUKA' ? 'bg-[#2F7F5B] hover:bg-green-800' : 'bg-[#8A1F1B] hover:bg-red-800'
                  }`}
                >
                  {toggleStateTarget === 'BUKA' ? 'Konfirmasi Buka' : 'Konfirmasi Tutup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Override Akses Khusus Unit */}
      {selectedUnitForOverride && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="bg-white rounded-xl shadow-xl border border-[#E6E0D6] max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#1F2233]">
                Atur Akses Pengajuan Khusus Unit
              </h3>
              <p className="text-xs text-[#5E6070] mt-1">
                [{selectedUnitForOverride.unit_code}] {selectedUnitForOverride.unit_name}
              </p>
            </div>

            <form onSubmit={handleSaveUnitOverride} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Status Akses
                </label>
                <select
                  value={overrideState}
                  onChange={(e) => setOverrideState(e.target.value)}
                  className="w-full text-xs p-2.5 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                >
                  <option value="BUKA">BUKA (Izinkan Pengisian)</option>
                  <option value="TUTUP">TUTUP (Kunci Pengisian)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Jenis Anggaran
                </label>
                <select
                  value={overrideDocType}
                  onChange={(e) => setOverrideDocType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                >
                  <option value="SEMUA">Semua Jenis Anggaran</option>
                  <option value="BIAYA">Hanya Anggaran Biaya</option>
                  <option value="INVESTASI">Hanya Anggaran Investasi</option>
                </select>
              </div>

              {overrideState === 'BUKA' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                    Deadline Perpanjangan (Opsional)
                  </label>
                  <input
                    type="date"
                    value={overrideDeadline}
                    onChange={(e) => setOverrideDeadline(e.target.value)}
                    className="w-full text-xs p-2 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1F2233] mb-1">
                  Alasan {overrideState === 'BUKA' ? <span className="text-red-600">*</span> : ''}
                </label>
                <textarea
                  rows={3}
                  required={overrideState === 'BUKA'}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Alasan perubahan akses unit..."
                  className="w-full text-xs p-2.5 border border-[#B9B4C9] rounded-md outline-none focus:border-[#3D4E9C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUnitForOverride(null)}
                  className="px-4 py-2 border border-[#B9B4C9] text-[#1F2233] hover:bg-[#F0EBE2] rounded-md text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={overriding || (overrideState === 'BUKA' && !overrideReason.trim())}
                  className="px-4 py-2 bg-[#3D4E9C] text-white hover:bg-[#2F3E7C] rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Simpan Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
