import { useState, useEffect, useRef } from 'react';
import {
  FileEdit,
  DollarSign,
  Briefcase,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  RefreshCw,
  CheckCircle2,
  X,
  Laptop,
  Send,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { budgetApi } from '../api/budget.api';
import { masterApi } from '../api/master.api';
import { investmentApi } from '../api/investment.api';
import { submissionAccessApi } from '../api/submissionAccess.api';
import { workflowApi } from '../api/workflow.api';
import NewItemRequestsSection from '../components/entry/NewItemRequestPicCard';
import InvestmentForm from '../components/entry/InvestmentForm';
import InvestmentTable from '../components/entry/InvestmentTable';
import LaptopPcView from '../components/investment/LaptopPcView';

// Helper format angka rupiah
function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

// Helper format jam HH:mm
function formatCurrentTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function EntryPage() {
  const { user } = useAuth();

  // Tab: 'biaya' (aktif di Fase 3) | 'investasi' (placeholder Fase 5)
  const [activeTab, setActiveTab] = useState('biaya');

  // Master Referensi Filter
  const [periods, setPeriods] = useState([]);
  const [units, setUnits] = useState([]);
  const [coaGroups, setCoaGroups] = useState([]);
  const [coas, setCoas] = useState([]);

  // Pilihan Dokumen Utama
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [currentDoc, setCurrentDoc] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Trigger penyegaran baris biaya
  const [refreshLinesCounter, setRefreshLinesCounter] = useState(0);

  // Filter Baris Biaya (FR-B2 berurutan)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedCoaId, setSelectedCoaId] = useState('');
  const [onlyFilled, setOnlyFilled] = useState(false);

  // Data Baris Biaya & Rekapitulasi
  const [lines, setLines] = useState([]);
  const [totalsByCoa, setTotalsByCoa] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loadingLines, setLoadingLines] = useState(false);

  // Status Simpan Otomatis (Debounced Auto-Save - FR-B5)
  // 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedTime, setLastSavedTime] = useState(formatCurrentTime());
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // Status Perbarui Harga Master (refresh-prices)
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  // Status Akses Efektif Dokumen & Alur Approval (Fase 5)
  const [docAccess, setDocAccess] = useState(null);
  const [submittingDoc, setSubmittingDoc] = useState(false);

  // Antrean debounce simpan otomatis
  const debounceTimerRef = useRef(null);
  const pendingUpdatesRef = useRef(new Map());
  const currentDocRef = useRef(null);

  useEffect(() => {
    currentDocRef.current = currentDoc;
  }, [currentDoc]);

  // --- STATE ANGGARAN INVESTASI (FASE 4) ---
  const [investmentLines, setInvestmentLines] = useState([]);
  const [investmentSummary, setInvestmentSummary] = useState({});
  const [investmentCategories, setInvestmentCategories] = useState([]);
  const [investmentPriorities, setInvestmentPriorities] = useState([]);
  const [editingInvestmentLine, setEditingInvestmentLine] = useState(null);
  const [showLaptopPcView, setShowLaptopPcView] = useState(false);
  const [, setLoadingInvestment] = useState(false);

  // Modal Tambah dari Master
  const [showAddMasterModal, setShowAddMasterModal] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalGroupId, setModalGroupId] = useState('');
  const [addingItemId, setAddingItemId] = useState(null);

  // 1. Muat data referensi awal (Periode, Unit, COA Groups, COA)
  useEffect(() => {
    let isMounted = true;

    async function loadInitialReferences() {
      try {
        const [periodsData, groupsData, coasData, catsData, priosData] = await Promise.all([
          budgetApi.getPeriods(),
          masterApi.getCoaGroups(),
          masterApi.getCoas({ category: 'biaya' }),
          investmentApi.getInvestmentCategories(),
          investmentApi.getPriorities(),
        ]);

        if (!isMounted) return;

        setPeriods(periodsData);
        setCoaGroups(groupsData);
        setCoas(coasData.data || coasData);
        setInvestmentCategories(catsData.data || catsData || []);
        setInvestmentPriorities(priosData.data || priosData || []);

        // Pilih periode pertama secara default jika ada
        if (periodsData.length > 0) {
          setSelectedPeriodId(String(periodsData[0].period_id || periodsData[0].id));
        }

        // Tentukan daftar unit yang bisa diakses user
        if (user?.role === 'akuntansi') {
          const allUnits = await masterApi.getUnits({ is_active: true });
          if (!isMounted) return;
          const raw = allUnits.data || allUnits || [];
          const uList = raw.map((u) => ({
            ...u,
            id: u.id || u.unit_id,
            unit_id: u.unit_id || u.id,
          }));
          setUnits(uList);
          if (uList.length > 0) {
            setSelectedUnitId(String(uList[0].id));
          }
        } else if (user?.units && user.units.length > 0) {
          const uList = user.units.map((u) => ({
            ...u,
            id: u.id || u.unit_id,
            unit_id: u.unit_id || u.id,
          }));
          setUnits(uList);
          if (uList.length > 0) {
            setSelectedUnitId(String(uList[0].id));
          }
        } else if (user?.unit_ids && user.unit_ids.length > 0) {
          const allUnits = await masterApi.getUnits({ is_active: true });
          if (!isMounted) return;
          const raw = allUnits.data || allUnits || [];
          const uList = raw
            .filter((u) => user.unit_ids.includes(u.id || u.unit_id))
            .map((u) => ({
              ...u,
              id: u.id || u.unit_id,
              unit_id: u.unit_id || u.id,
            }));
          setUnits(uList);
          if (uList.length > 0) {
            setSelectedUnitId(String(uList[0].id));
          }
        }
      } catch (err) {
        console.error('Gagal memuat referensi filter:', err.message);
      }
    }

    loadInitialReferences();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // 2. Muat atau Cek Dokumen Anggaran saat Period & Unit dipilih
  useEffect(() => {
    let isMounted = true;

    if (!selectedPeriodId || !selectedUnitId) {
      Promise.resolve().then(() => {
        if (!isMounted) return;
        setCurrentDoc(null);
        setLines([]);
        setTotalsByCoa([]);
        setTotalAmount(0);
      });
      return () => {
        isMounted = false;
      };
    }

    const docType = activeTab === 'investasi' ? 'INVESTASI' : 'BIAYA';

    Promise.resolve()
      .then(() => {
        if (isMounted) setLoadingDoc(true);
        return budgetApi.getBudgetDocs({
          period_id: selectedPeriodId,
          unit_id: selectedUnitId,
          type: docType,
        });
      })
      .then(async (res) => {
        if (!isMounted) return;

        if (res.data && res.data.length > 0) {
          setCurrentDoc(res.data[0]);
        } else {
          // Otomatis buat dokumen DRAFT jika belum ada
          try {
            const createRes = await budgetApi.createBudgetDoc({
              period_id: parseInt(selectedPeriodId, 10),
              unit_id: parseInt(selectedUnitId, 10),
              type: docType,
            });
            const newDocRes = await budgetApi.getBudgetDocById(createRes.doc_id);
            if (isMounted) setCurrentDoc(newDocRes);
          } catch (createErr) {
            if (createErr.response?.status === 409) {
              const retryRes = await budgetApi.getBudgetDocs({
                period_id: selectedPeriodId,
                unit_id: selectedUnitId,
                type: docType,
              });
              if (isMounted && retryRes.data?.length > 0) {
                setCurrentDoc(retryRes.data[0]);
              }
            } else {
              console.error('Gagal membuat dokumen otomatis:', createErr.message);
              if (isMounted) setCurrentDoc(null);
            }
          }
        }
      })
      .catch((err) => {
        console.error('Gagal memuat dokumen anggaran:', err.message);
        if (isMounted) setCurrentDoc(null);
      })
      .finally(() => {
        if (isMounted) setLoadingDoc(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPeriodId, selectedUnitId, activeTab]);

  // 3. Muat Baris Biaya / Investasi saat Dokumen Aktif
  useEffect(() => {
    let isMounted = true;
    const docId = currentDoc?.id;
    if (!docId) return;

    if (activeTab === 'investasi') {
      setLoadingInvestment(true);
      investmentApi
        .getInvestmentLines(docId)
        .then((res) => {
          if (!isMounted) return;
          setInvestmentLines(res.data || []);
          setInvestmentSummary(res.summary || {});
        })
        .catch((err) => {
          console.error('Gagal memuat baris investasi:', err.message);
        })
        .finally(() => {
          if (isMounted) setLoadingInvestment(false);
        });
      return () => {
        isMounted = false;
      };
    }

    Promise.resolve()
      .then(() => {
        if (isMounted) setLoadingLines(true);
        return Promise.all([
          budgetApi.getExpenseLines(docId, {
            search: searchQuery,
            group_id: selectedGroupId || undefined,
            coa_id: selectedCoaId || undefined,
            only_filled: onlyFilled ? 1 : undefined,
            per_page: 250,
          }),
          budgetApi.getBudgetDocById(docId),
        ]);
      })
      .then(([linesRes, docDetail]) => {
        if (!isMounted) return;
        setLines(linesRes.data || []);
        setTotalsByCoa(docDetail.totals_by_coa || []);
        setTotalAmount(docDetail.total_amount || 0);
      })
      .catch((err) => {
        console.error('Gagal memuat baris biaya:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingLines(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentDoc?.id, activeTab, searchQuery, selectedGroupId, selectedCoaId, onlyFilled, refreshLinesCounter]);

  // Muat status akses pengajuan efektif dokumen (Fase 5 - BR-10)
  useEffect(() => {
    let isMounted = true;
    if (!currentDoc?.id) {
      setDocAccess(null);
      return;
    }

    submissionAccessApi
      .getDocAccess(currentDoc.id)
      .then((res) => {
        if (isMounted) setDocAccess(res);
      })
      .catch((err) => {
        console.error('Gagal mengambil status akses dokumen:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [currentDoc?.id, refreshLinesCounter]);

  // 4. Mekanisme Eksekusi Simpan Otomatis (Debounced Auto-Save)
  const flushPendingUpdates = async () => {
    const docId = currentDocRef.current?.id;
    if (!docId || pendingUpdatesRef.current.size === 0) return;

    const updatesToSave = Array.from(pendingUpdatesRef.current.values());
    pendingUpdatesRef.current.clear();

    setSaveStatus('saving');
    setSaveErrorMessage('');

    try {
      const res = await budgetApi.saveExpenseLines(docId, updatesToSave);
      setSaveStatus('saved');
      setLastSavedTime(formatCurrentTime());
      setTotalAmount(res.total_amount);

      // Perbarui nomor versi lokal pada baris yang baru disimpan
      setLines((prevLines) =>
        prevLines.map((l) => {
          const savedItem = updatesToSave.find((u) => u.item_id === l.item_id);
          if (savedItem) {
            return {
              ...l,
              version: (l.version || 1) + 1,
            };
          }
          return l;
        })
      );

      // Segarkan ringkasan totals_by_coa
      const docDetail = await budgetApi.getBudgetDocById(docId);
      setTotalsByCoa(docDetail.totals_by_coa || []);
    } catch (err) {
      setSaveStatus('error');
      const msg =
        err.response?.data?.message ||
        'Gagal menyimpan perubahan ke server. Coba muat ulang halaman.';
      setSaveErrorMessage(msg);
    }
  };

  // Handler perubahan Qty inline
  const handleQtyChange = (lineId, itemId, newQtyStr) => {
    const parsedQty = Math.max(0, parseInt(newQtyStr, 10) || 0);

    // 1. Update state tabel secara responsif & hitung ulang total lokal
    setLines((prevLines) => {
      let newTotal = 0;
      const updated = prevLines.map((l) => {
        if (l.id === lineId || l.item_id === itemId) {
          const amt = l.price * parsedQty;
          newTotal += amt;
          return { ...l, qty: parsedQty, amount: amt };
        }
        newTotal += l.amount;
        return l;
      });
      setTotalAmount(newTotal);
      return updated;
    });

    // 2. Tambahkan ke antrean simpan otomatis
    const currentLine = lines.find((l) => l.id === lineId || l.item_id === itemId);
    pendingUpdatesRef.current.set(itemId, {
      id: lineId,
      item_id: itemId,
      qty: parsedQty,
      version: currentLine?.version,
      note: currentLine?.note || null,
    });

    setSaveStatus('saving');

    // 3. Debounce 700ms
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      flushPendingUpdates();
    }, 700);
  };

  // Handler Hapus Baris Biaya
  const handleDeleteLine = async (lineId) => {
    if (!lineId) return;
    try {
      await budgetApi.deleteExpenseLine(lineId);
      // Hapus dari state baris
      setLines((prev) => prev.filter((l) => l.id !== lineId));
      // Muat ulang ringkasan dokumen
      if (currentDoc?.id) {
        const docDetail = await budgetApi.getBudgetDocById(currentDoc.id);
        setTotalsByCoa(docDetail.totals_by_coa || []);
        setTotalAmount(docDetail.total_amount || 0);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus baris anggaran');
    }
  };

  // Handler Hapus Baris Investasi (Fase 4)
  const handleDeleteInvestmentLine = async (lineId) => {
    if (!lineId) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus baris investasi ini?')) return;
    try {
      await investmentApi.deleteInvestmentLine(lineId);
      setRefreshLinesCounter((c) => c + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus baris investasi');
    }
  };

  // Handler Perbarui Harga Master (POST /api/budget-docs/:id/refresh-prices)
  const handleRefreshPrices = async () => {
    if (!currentDoc?.id || refreshingPrices) return;
    if (currentDoc.status !== 'DRAFT') {
      alert(`Harga hanya dapat diperbarui saat dokumen berstatus DRAFT (status saat ini: ${currentDoc.status})`);
      return;
    }

    const confirmRefresh = window.confirm(
      'Perbarui harga pada dokumen ini dengan harga master logistik terbaru dari perusahaan? Nilai total akan dihitung ulang.'
    );
    if (!confirmRefresh) return;

    setRefreshingPrices(true);
    setRefreshMessage('');
    try {
      const res = await budgetApi.refreshDocPrices(currentDoc.id);
      setRefreshMessage(`Berhasil memperbarui ${res.updated_lines} baris dengan harga master terbaru.`);
      setRefreshLinesCounter((c) => c + 1);
      setTimeout(() => setRefreshMessage(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui harga master pada dokumen ini');
    } finally {
      setRefreshingPrices(false);
    }
  };

  // Handler Ajukan Dokumen ke Manager (Fase 5 - FR-W1)
  const handleSubmitDoc = async () => {
    if (!currentDoc?.id || submittingDoc) return;
    const docLabel = activeTab === 'investasi' ? 'Investasi' : 'Biaya';
    if (
      !window.confirm(
        `Ajukan dokumen anggaran ${docLabel} unit ini ke Manager untuk validasi? Status dokumen akan menjadi DIAJUKAN.`
      )
    ) {
      return;
    }
    setSubmittingDoc(true);
    try {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pendingUpdatesRef.current.size > 0) {
        await flushPendingUpdates();
      }
      const res = await workflowApi.submitDoc(currentDoc.id);
      alert('Dokumen anggaran berhasil diajukan untuk validasi');
      setCurrentDoc((prev) => ({
        ...prev,
        status: 'DIAJUKAN',
        submitted_by: res.data?.submitted_by,
      }));
      setRefreshLinesCounter((c) => c + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengajukan dokumen anggaran');
    } finally {
      setSubmittingDoc(false);
    }
  };

  // 5. Modal Tambah dari Master
  const openAddMasterModal = async () => {
    if (!currentDoc?.id) return;
    setShowAddMasterModal(true);
    setLoadingAvailable(true);
    try {
      const res = await budgetApi.getAvailableItems(currentDoc.id, {
        q: modalSearch,
        group_id: modalGroupId || undefined,
        per_page: 50,
      });
      setAvailableItems(res.data || []);
    } catch (err) {
      console.error('Gagal mengambil katalog barang master:', err.message);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleModalSearch = async (e) => {
    e.preventDefault();
    if (!currentDoc?.id) return;
    setLoadingAvailable(true);
    try {
      const res = await budgetApi.getAvailableItems(currentDoc.id, {
        q: modalSearch,
        group_id: modalGroupId || undefined,
        per_page: 50,
      });
      setAvailableItems(res.data || []);
    } catch (err) {
      console.error('Gagal mencari barang:', err.message);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleAddItemFromMaster = async (item) => {
    if (!currentDoc?.id || addingItemId) return;
    setAddingItemId(item.id);
    try {
      await budgetApi.saveExpenseLines(currentDoc.id, [
        {
          item_id: item.id,
          qty: 1, // Default qty 1 saat ditambahkan dari master
          note: null,
        },
      ]);
      // Hapus item dari list modal
      setAvailableItems((prev) => prev.filter((i) => i.id !== item.id));
      // Picu penyegaran baris biaya
      setRefreshLinesCounter((c) => c + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menambahkan barang ke dokumen');
    } finally {
      setAddingItemId(null);
    }
  };

  // Helper list aman
  const periodList = Array.isArray(periods) ? periods : [];
  const unitList = Array.isArray(units) ? units : [];
  const coaList = Array.isArray(coas) ? coas : Array.isArray(coas?.data) ? coas.data : [];
  const groupList = Array.isArray(coaGroups) ? coaGroups : [];

  // Periode terpilih info
  const selectedPeriodObj = periodList.find(
    (p) => String(p.period_id || p.id) === String(selectedPeriodId)
  );
  // Unit terpilih info
  const selectedUnitObj = unitList.find(
    (u) => String(u.id || u.unit_id) === String(selectedUnitId)
  );

  // Status Akses Pengajuan Efektif (Fase 5 - BR-10, BR-12, BR-13)
  const isSubmissionClosed = docAccess && !docAccess.is_open;
  const isDocDraft = currentDoc && (currentDoc.status === 'DRAFT' || currentDoc.status === 'DIKEMBALIKAN');
  const isReadOnly = isSubmissionClosed || !isDocDraft;

  return (
    <div className="space-y-4">
      {/* 1. Header & Chip Informasi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2233] flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-[#3D4E9C]" />
            Entry · Anggaran {activeTab === 'investasi' ? 'Investasi' : 'Biaya'}
          </h1>
          <p className="text-xs text-[#5E6070] mt-0.5">
            {activeTab === 'investasi'
              ? 'Pengisian anggaran belanja modal / aset tetap (Capex) unit kerja.'
              : 'Pengisian Qty RKAP per barang logistik dengan kalkulasi subtotal per COA otomatis.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedUnitObj && (
            <span className="chip nt">
              [{selectedUnitObj.code || 'UNIT'}] {selectedUnitObj.name}
            </span>
          )}
          {currentDoc && (
            <span
              className={`chip ${
                currentDoc.status === 'FINAL' || currentDoc.status === 'DISETUJUI'
                  ? 'ok'
                  : currentDoc.status === 'DIKEMBALIKAN'
                  ? 'bd'
                  : currentDoc.status === 'DIAJUKAN'
                  ? 'wn'
                  : 'ok'
              }`}
            >
              Status: {currentDoc.status}
            </span>
          )}
          {currentDoc && isDocDraft && !isSubmissionClosed && (
            <button
              type="button"
              onClick={handleSubmitDoc}
              disabled={submittingDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3D4E9C] text-white hover:bg-[#2F3E7C] rounded-md text-xs font-semibold transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingDoc ? 'Mengajukan...' : 'Ajukan Dokumen'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Banner Informasi Status Pengisian & Deadline Efektif (Fase 5 - FR-P10) */}
      {isSubmissionClosed ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-bold">Pengajuan Anggaran Ditutup / Melewati Batas Waktu</p>
              <p className="text-xs mt-1 text-red-900 leading-relaxed">
                {docAccess?.reason || 'Batas waktu pengisian untuk unit ini telah berakhir.'} Batas efektif:{' '}
                <b>{docAccess?.effective_deadline || selectedPeriodObj?.fill_deadline || '-'}</b>.
              </p>
              <p className="text-xs text-red-700 mt-1">
                Hubungi <b>{docAccess?.contact_accounting || 'bagian Akuntansi'}</b> untuk permohonan pembukaan akses. Seluruh formulir saat ini berstatus baca-saja (read-only).
              </p>
            </div>
          </div>
          <span className="chip bd shrink-0 font-bold">PENGAJUAN DITUTUP</span>
        </div>
      ) : (
        <div className="rounded-lg border border-[#9ACDAA] bg-[#DDF1E4] px-4 py-3 text-sm text-[#14532D] flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#14532D]" />
            <span>
              Pengajuan dibuka. Deadline pengisian:{' '}
              <b>
                {docAccess?.effective_deadline ||
                  (() => {
                    if (!selectedPeriodObj?.fill_deadline) return '15 Nov 2026';
                    try {
                      const d = new Date(selectedPeriodObj.fill_deadline);
                      if (isNaN(d.getTime())) return '15 Nov 2026';
                      return d.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                    } catch {
                      return '15 Nov 2026';
                    }
                  })()}
              </b>
              . Semua perubahan tersimpan otomatis.
            </span>
          </div>

          {/* Chip Indikator Simpan Otomatis di pojok banner */}
          <div className="shrink-0 flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="chip wn flex items-center gap-1.5 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                Menyimpan perubahan...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="chip ok flex items-center gap-1.5" role="status">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tersimpan otomatis · {lastSavedTime}
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="chip ok flex items-center gap-1.5" role="status">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tersimpan otomatis · {lastSavedTime}
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="chip bd flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Gagal menyimpan
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alert Error jika terjadi Bentrok Versi / Galat Simpan */}
      {saveStatus === 'error' && (
        <div className="rounded-lg border border-[#F8D9D6] bg-[#FFF5F5] p-3 text-sm text-[#8A1F1B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#8A1F1B]" />
            <span>{saveErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshLinesCounter((c) => c + 1)}
            className="flex items-center gap-1 px-3 py-1 bg-white border border-[#8A1F1B] text-[#8A1F1B] rounded text-xs font-semibold hover:bg-red-50 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Muat Ulang Data
          </button>
        </div>
      )}

      {/* Banner Notifikasi Perbarui Harga Master */}
      {refreshMessage && (
        <div className="rounded-lg border border-[#9ACDAA] bg-[#DDF1E4] px-4 py-3 text-sm text-[#14532D] flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />
            <span>{refreshMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshMessage('')}
            className="p-1 text-[#14532D] hover:opacity-75 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Navigasi Sub-Tab Anggaran */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('biaya')}
          className={`chip cursor-pointer text-xs font-semibold px-4 py-2 transition-colors ${
            activeTab === 'biaya'
              ? 'bg-[#3D4E9C] text-white'
              : 'bg-[#ECE8F5] text-[#3A3F63] hover:bg-[#dcd6ee]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Anggaran Biaya
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('investasi')}
          className={`chip cursor-pointer text-xs font-semibold px-4 py-2 transition-colors ${
            activeTab === 'investasi'
              ? 'bg-[#3D4E9C] text-white'
              : 'bg-[#ECE8F5] text-[#3A3F63] hover:bg-[#dcd6ee]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Anggaran Investasi
          </span>
        </button>
      </div>

      {activeTab === 'investasi' ? (
        showLaptopPcView ? (
          <LaptopPcView onBack={() => setShowLaptopPcView(false)} />
        ) : (
          <div className="space-y-4">
            {/* Header Actions & Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-lg border border-[#E6E0D6] p-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs text-[#5E6070]">
                <Briefcase className="w-4 h-4 text-[#3D4E9C]" />
                <span>Pengisian anggaran belanja modal / aset tetap (Capex) unit kerja.</span>
              </div>
              {(user?.role === 'akuntansi' || user?.role === 'manager') && (
                <button
                  type="button"
                  onClick={() => setShowLaptopPcView(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] border border-[#B9B4C9] hover:bg-[#F0EBE2] text-[#1F2233] rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5 text-[#3D4E9C]" />
                  Lihat Pengadaan Laptop &amp; PC Lintas Unit
                </button>
              )}
            </div>

            {/* Filter Periode & Unit */}
            <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-[#5E6070] mb-1">Periode RKAP</label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="w-full text-xs font-medium text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
                  >
                    {periodList.map((p) => {
                      const pId = p.period_id || p.id;
                      return (
                        <option key={pId} value={pId}>
                          RKAP {p.year} ({p.company_code || 'CN'})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5E6070] mb-1">Unit Kerja</label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    disabled={unitList.length <= 1}
                    className="w-full text-xs font-medium text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C] disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {unitList.map((u) => {
                      const uId = u.id || u.unit_id;
                      return (
                        <option key={uId} value={uId}>
                          [{u.code || '-'}] {u.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Form Entri Investasi (hanya saat status aktif & akses terbuka) */}
            {currentDoc && !isReadOnly && (
              <InvestmentForm
                docId={currentDoc.id}
                categories={investmentCategories}
                priorities={investmentPriorities}
                editingLine={editingInvestmentLine}
                onSaveSuccess={() => {
                  setEditingInvestmentLine(null);
                  setRefreshLinesCounter((c) => c + 1);
                }}
                onCancel={() => setEditingInvestmentLine(null)}
              />
            )}

            {/* Tabel Investasi & Ringkasan */}
            {currentDoc && (
              <InvestmentTable
                lines={investmentLines}
                summary={investmentSummary}
                isDocDraft={!isReadOnly}
                onEdit={(line) => setEditingInvestmentLine(line)}
                onDelete={handleDeleteInvestmentLine}
              />
            )}
          </div>
        )
      ) : (
        <>
          {/* 4. Filter Berurutan (FR-B2: Cari barang, Jenis COA, COA, Periode) */}
          <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              {/* Filter 1: Cari Barang */}
              <div>
                <label className="block text-xs font-medium text-[#5E6070] mb-1">
                  Cari barang
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#5E6070] absolute left-2.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama atau kode..."
                    className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md pl-8 pr-3 py-2 outline-none focus:border-[#3D4E9C]"
                  />
                </div>
              </div>

              {/* Filter 2: Jenis COA */}
              <div>
                <label className="block text-xs font-medium text-[#5E6070] mb-1">
                  Jenis COA
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setSelectedCoaId(''); // Reset COA spesifik saat jenis berubah
                  }}
                  className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
                >
                  <option value="">Semua jenis</option>
                  {groupList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 3: COA Spesifik */}
              <div>
                <label className="block text-xs font-medium text-[#5E6070] mb-1">
                  COA
                </label>
                <select
                  value={selectedCoaId}
                  onChange={(e) => setSelectedCoaId(e.target.value)}
                  className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
                >
                  <option value="">Semua COA</option>
                  {coaList
                    .filter((c) => !selectedGroupId || String(c.group_id) === String(selectedGroupId))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Filter 4: Periode RKAP */}
              <div>
                <label className="block text-xs font-medium text-[#5E6070] mb-1">
                  Periode RKAP
                </label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="w-full text-xs font-medium text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
                >
                  {periodList.map((p) => {
                    const pId = p.period_id || p.id;
                    return (
                      <option key={pId} value={pId}>
                        RKAP {p.year} ({p.company_code || 'CN'})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end pt-1 border-t border-[#F0EBE2]">
              {/* Unit Kerja (Untuk PIC/Manager/Akuntansi) */}
              <div>
                <label className="block text-xs font-medium text-[#5E6070] mb-1">
                  Unit Kerja
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  disabled={unitList.length <= 1}
                  className="w-full text-xs font-medium text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C] disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {unitList.map((u) => {
                    const uId = u.id || u.unit_id;
                    return (
                      <option key={uId} value={uId}>
                        [{u.code || '-'}] {u.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter Realisasi dari bulan (Dinonaktifkan sesuai mockup/PRD) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Realisasi dari bulan (histori)
                </label>
                <select
                  disabled
                  className="w-full text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 cursor-not-allowed"
                >
                  <option>Januari</option>
                </select>
              </div>

              {/* Filter s.d. bulan (Dinonaktifkan sesuai mockup/PRD) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  s.d. bulan (histori)
                </label>
                <select
                  disabled
                  className="w-full text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 cursor-not-allowed"
                >
                  <option>Oktober</option>
                </select>
              </div>

              {/* Aksi & Checkbox: Hanya yang terisi, Perbarui harga, Tambah dari master */}
              <div className="flex items-center justify-between gap-2 h-9">
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#1F2233] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyFilled}
                    onChange={(e) => setOnlyFilled(e.target.checked)}
                    className="w-4 h-4 rounded text-[#3D4E9C] border-gray-300 focus:ring-[#3D4E9C]"
                  />
                  Hanya yang terisi
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRefreshPrices}
                    disabled={!currentDoc || refreshingPrices || isReadOnly}
                    className="flex items-center gap-1 px-2.5 py-2 bg-white border border-[#B9B4C9] text-[#1F2233] hover:bg-slate-50 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title={isReadOnly ? 'Formulir berstatus baca-saja' : 'Perbarui harga baris dengan harga master logistik terbaru'}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#3D4E9C] ${refreshingPrices ? 'animate-spin' : ''}`} />
                    <span>{refreshingPrices ? '...' : 'Perbarui harga'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openAddMasterModal}
                    disabled={!currentDoc || isReadOnly}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#313f80] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title={isReadOnly ? 'Formulir berstatus baca-saja' : 'Tambah barang dari katalog master'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah dari master
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Ringkasan Tetap (Summary Cards: Total per COA & Total Unit) */}
          <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EBE2] pb-3">
              <div>
                <span className="text-xs font-medium text-[#5E6070]">Total Unit</span>
                <div className="text-2xl font-bold tracking-tight text-[#1F2233]">
                  Rp {formatRupiah(totalAmount)}
                </div>
              </div>

              <div className="text-right text-xs text-[#5E6070]">
                <span>Jumlah Baris Anggaran: <b>{lines.length}</b> barang</span>
              </div>
            </div>

            {/* Rekap Subtotal per COA */}
            {totalsByCoa.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[#5E6070]">Ringkasan per Akun (COA):</div>
                <div className="flex flex-wrap gap-2">
                  {totalsByCoa.map((tc) => (
                    <div
                      key={tc.coa_id || tc.coa_code}
                      className="inline-flex items-center gap-2 bg-[#FAF7F2] border border-[#E6E0D6] rounded-md px-3 py-1.5 text-xs"
                    >
                      <span className="font-bold text-[#3D4E9C]">{tc.coa_code}</span>
                      <span className="text-[#1F2233] max-w-[200px] truncate" title={tc.coa_name}>
                        {tc.coa_name}
                      </span>
                      <span className="font-semibold text-[#14532D] ml-1">
                        Rp {formatRupiah(tc.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Belum ada rincian biaya yang tersimpan pada dokumen ini.
              </div>
            )}
          </div>

          {/* 6. Tabel Entri Biaya (FR-B1 & FR-B8) */}
          <div className="bg-white rounded-lg border border-[#E6E0D6] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E6E0D6] bg-[#FAF7F2] text-[#5E6070]">
                    <th className="py-2.5 px-3 font-semibold w-12 text-center">No.</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[220px]">Barang</th>
                    <th className="py-2.5 px-3 font-semibold w-16">Satuan</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-28">Harga (Rp)</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-24 text-slate-400">
                      Real (Jan-Okt)
                    </th>
                    <th className="py-2.5 px-3 font-semibold w-28 text-center">Qty RKAP</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-32">Jumlah (Rp)</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[240px]">COA</th>
                    <th className="py-2.5 px-3 font-semibold w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE2]">
                  {loadingLines || loadingDoc ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#3D4E9C]" />
                        Memuat data anggaran biaya...
                      </td>
                    </tr>
                  ) : lines.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-[#5E6070]">
                        <p className="font-semibold text-slate-700">Tidak ada baris anggaran biaya.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Gunakan tombol <b>&quot;Tambah dari master&quot;</b> untuk menambahkan barang ke dokumen ini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <tr key={line.id || line.item_id} className="hover:bg-[#FAF7F2] transition-colors">
                        {/* No. (Otomatis sesuai urutan tampilan - FR-B8) */}
                        <td className="py-2.5 px-3 text-center text-[#5E6070] font-medium">
                          {idx + 1}
                        </td>

                        {/* Barang */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#1F2233]">{line.item_name}</div>
                          <div className="text-[11px] text-[#5E6070]">{line.item_code}</div>
                        </td>

                        {/* Satuan */}
                        <td className="py-2.5 px-3 text-[#5E6070] font-medium">{line.uom}</td>

                        {/* Harga Satuan */}
                        <td className="py-2.5 px-3 text-right font-medium text-[#1F2233]">
                          {formatRupiah(line.price)}
                        </td>

                        {/* Realisasi Historis */}
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {line.real_qty ? formatRupiah(line.real_qty) : '-'}
                        </td>

                        {/* Qty RKAP (Input Inline) */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            disabled={isReadOnly}
                            value={line.qty === 0 ? '' : line.qty}
                            placeholder="0"
                            onChange={(e) =>
                              handleQtyChange(line.id, line.item_id, e.target.value)
                            }
                            className="w-20 text-center text-xs font-semibold text-[#1F2233] bg-white border border-[#B9B4C9] rounded px-2 py-1.5 outline-none focus:border-[#3D4E9C] focus:ring-1 focus:ring-[#3D4E9C] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Jumlah */}
                        <td className="py-2.5 px-3 text-right font-bold text-[#14532D]">
                          {formatRupiah(line.amount)}
                        </td>

                        {/* COA di Paling Kanan (Kode tebal, Nama, Jenis COA) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#3D4E9C]">{line.coa_code}</span>
                            <span className="text-[#1F2233] truncate max-w-[180px]" title={line.coa_name}>
                              {line.coa_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#5E6070]">
                            Jenis: {line.group_name || 'Biaya'}
                          </div>
                        </td>

                        {/* Aksi Hapus */}
                        <td className="py-2 px-3 text-center">
                          {!isReadOnly ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(line.id)}
                              title="Hapus baris"
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

            {/* Footer Tabel dengan Status Autosave */}
            <div className="border-t border-[#E6E0D6] bg-[#FAF7F2] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5E6070]">
              <div className="flex items-center gap-2">
                <span className="chip ok" role="status">
                  Tersimpan otomatis · {lastSavedTime}
                </span>
                <span className="text-[11px] text-[#5E6070]">
                  Semua perubahan kuantitas tersimpan otomatis saat Anda mengetik.
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-[#5E6070] mr-2">Grand Total Biaya:</span>
                <span className="text-base font-bold text-[#14532D]">
                  Rp {formatRupiah(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* 6b. Permintaan Barang Baru (FR-B9, BR-17) */}
          {currentDoc && (
            <NewItemRequestsSection
              doc={currentDoc}
              disabled={isReadOnly}
              onLineAdded={() => setRefreshLinesCounter((c) => c + 1)}
            />
          )}
        </>
      )}

      {/* 7. Modal Dialog "Tambah dari Master" */}
      {showAddMasterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E6E0D6] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EBE2] bg-[#FAF7F2]">
              <div>
                <h3 className="text-base font-bold text-[#1F2233]">Tambah Barang dari Master</h3>
                <p className="text-xs text-[#5E6070]">
                  Pilih barang logistik yang tersedia untuk dimasukkan ke dokumen anggaran biaya.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMasterModal(false)}
                className="p-1 rounded text-[#5E6070] hover:text-[#1F2233] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search & Filter */}
            <form onSubmit={handleModalSearch} className="p-4 border-b border-[#F0EBE2] flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#5E6070] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Cari kode atau nama barang master..."
                  className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md pl-9 pr-3 py-2 outline-none focus:border-[#3D4E9C]"
                />
              </div>

              <select
                value={modalGroupId}
                onChange={(e) => setModalGroupId(e.target.value)}
                className="text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
              >
                <option value="">Semua jenis</option>
                {groupList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#313f80] cursor-pointer"
              >
                Cari
              </button>
            </form>

            {/* Modal Table Available Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAvailable ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#3D4E9C]" />
                  Mencari barang yang tersedia...
                </div>
              ) : availableItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Tidak ada barang master yang cocok atau semua barang sudah ada di dokumen ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E0D6] text-[#5E6070] bg-[#FAF7F2]">
                      <th className="py-2 px-3 font-semibold">Barang</th>
                      <th className="py-2 px-3 font-semibold">Satuan</th>
                      <th className="py-2 px-3 font-semibold">COA</th>
                      <th className="py-2 px-3 font-semibold text-right">Harga Master</th>
                      <th className="py-2 px-3 font-semibold text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE2]">
                    {availableItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#1F2233]">{item.name}</div>
                          <div className="text-[11px] text-[#5E6070]">{item.code}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#5E6070]">{item.uom}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#3D4E9C]">{item.coa_code}</span>
                          <div className="text-[11px] text-[#5E6070] truncate max-w-[150px]">
                            {item.coa_name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#1F2233]">
                          {item.price > 0 ? (
                            `Rp ${formatRupiah(item.price)}`
                          ) : (
                            <span className="text-red-500 font-semibold">Rp 0 (Belum ada harga)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddItemFromMaster(item)}
                            disabled={item.price <= 0 || addingItemId === item.id}
                            className="px-2.5 py-1 bg-[#3D4E9C] text-white rounded text-xs font-semibold hover:bg-[#313f80] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            {addingItemId === item.id ? 'Menambah...' : '+ Tambah'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#F0EBE2] bg-[#FAF7F2] flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddMasterModal(false)}
                className="px-4 py-2 border border-[#B9B4C9] bg-white rounded-md text-xs font-semibold text-[#1F2233] hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
