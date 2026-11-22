import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import investmentApi from '../api/investment.api';
import budgetApi from '../api/budget.api';
import { masterApi } from '../api/master.api';
import settingApi from '../api/setting.api';
import { submissionAccessApi } from '../api/submissionAccess.api';
import { workflowApi } from '../api/workflow.api';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import Banner from '../components/common/Banner';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

const MONTHS = [
  { value: 1, label: 'Jan', fullLabel: 'Januari' },
  { value: 2, label: 'Feb', fullLabel: 'Februari' },
  { value: 3, label: 'Mar', fullLabel: 'Maret' },
  { value: 4, label: 'Apr', fullLabel: 'April' },
  { value: 5, label: 'Mei', fullLabel: 'Mei' },
  { value: 6, label: 'Jun', fullLabel: 'Juni' },
  { value: 7, label: 'Jul', fullLabel: 'Juli' },
  { value: 8, label: 'Agu', fullLabel: 'Agustus' },
  { value: 9, label: 'Sep', fullLabel: 'September' },
  { value: 10, label: 'Okt', fullLabel: 'Oktober' },
  { value: 11, label: 'Nov', fullLabel: 'November' },
  { value: 12, label: 'Des', fullLabel: 'Desember' },
];

export default function EntryInvestasiPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State Konteks & Filter
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedPeriodYear, setSelectedPeriodYear] = useState('2027');

  // State Form Isian
  const [editingLineId, setEditingLineId] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [planMonth, setPlanMonth] = useState(1);
  const [strategicObjective, setStrategicObjective] = useState('');
  const [kpi, setKpi] = useState('');
  const [workProgram, setWorkProgram] = useState('');
  const [strategicAction, setStrategicAction] = useState('');

  // Status Auto-Save & Waktu
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
  const [savedTime, setSavedTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const formRef = useRef(null);

  // 1. Ambil Pengaturan Sistem (Batas Karakter & Ambang Investasi)
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingApi.getSettings();
      return res?.settings || {};
    },
  });

  const maxCharLen = useMemo(() => {
    return parseInt(settingsData?.investment_text_max_length || 300, 10);
  }, [settingsData]);

  const investmentThreshold = useMemo(() => {
    return parseInt(settingsData?.investment_threshold || 5000000, 10);
  }, [settingsData]);

  const thresholdBasis = useMemo(() => {
    let basis = settingsData?.investment_threshold_basis || 'unit_price';
    if (typeof basis === 'string') basis = basis.replace(/^"|"$/g, '');
    return basis;
  }, [settingsData]);

  // 2. Ambil Unit Pengguna
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

  // 3. Ambil Periode
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

  // 4. Ambil Kategori Investasi (BR-15)
  const { data: categoriesData = [] } = useQuery({
    queryKey: ['investmentCategories'],
    queryFn: async () => {
      const res = await investmentApi.getInvestmentCategories();
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  // Set default category
  useEffect(() => {
    if (!categoryId && categoriesData.length > 0) {
      setCategoryId(String(categoriesData[0].id));
    }
  }, [categoriesData, categoryId]);

  // Kategori aktif untuk menghitung masa manfaat dan menampilkan COA
  const activeCategory = useMemo(() => {
    return categoriesData.find((c) => String(c.id) === String(categoryId)) || null;
  }, [categoriesData, categoryId]);

  // 5. Ambil Prioritas
  const { data: prioritiesData = [] } = useQuery({
    queryKey: ['priorities'],
    queryFn: async () => {
      const res = await investmentApi.getPriorities();
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  // Set default priority
  useEffect(() => {
    if (!priorityId && prioritiesData.length > 0) {
      setPriorityId(String(prioritiesData[0].id));
    }
  }, [prioritiesData, priorityId]);

  // 6. Ambil Dokumen Anggaran Investasi Aktif
  const {
    data: currentDoc,
    isLoading: isLoadingDoc,
    refetch: refetchDoc,
  } = useQuery({
    queryKey: ['investDocActive', selectedPeriod?.id, selectedUnitId],
    queryFn: async () => {
      if (!selectedPeriod?.id || !selectedUnitId) return null;
      const res = await budgetApi.getBudgetDocs({
        period_id: selectedPeriod.id,
        unit_id: selectedUnitId,
        type: 'INVESTASI',
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      return list.length > 0 ? list[0] : null;
    },
    enabled: !!selectedPeriod?.id && !!selectedUnitId,
  });

  const docId = currentDoc?.id;

  // 7. Ambil Status Akses & Batas Waktu Efektif
  const { data: docAccess } = useQuery({
    queryKey: ['docAccess', docId],
    queryFn: async () => {
      if (!docId) return null;
      return await submissionAccessApi.getDocAccess(docId);
    },
    enabled: !!docId,
  });

  const isSubmissionOpen = docAccess?.is_open ?? true;
  const isDocEditable =
    currentDoc &&
    (currentDoc.status === 'DRAFT' || currentDoc.status === 'DIKEMBALIKAN') &&
    isSubmissionOpen;
  const isReadOnly = !isDocEditable;

  // 8. Ambil Riwayat Dokumen untuk Catatan Pengembalian
  const { data: docHistoryData } = useQuery({
    queryKey: ['docHistory', docId],
    queryFn: async () => {
      if (!docId) return null;
      return await workflowApi.getDocHistory(docId);
    },
    enabled: !!docId,
  });

  const returnNote = useMemo(() => {
    if (!docHistoryData?.history) return null;
    const rev = [...docHistoryData.history].reverse();
    return rev.find((h) => h.to_status === 'DIKEMBALIKAN') || null;
  }, [docHistoryData]);

  // 9. Ambil Baris-Baris Anggaran Investasi
  const {
    data: investmentLinesData,
    isLoading: isLoadingLines,
    refetch: refetchLines,
  } = useQuery({
    queryKey: ['investmentLines', docId],
    queryFn: async () => {
      if (!docId) return { data: [], meta: {} };
      return await investmentApi.getInvestmentLines(docId);
    },
    enabled: !!docId,
  });

  const lines = useMemo(() => {
    return investmentLinesData?.data || [];
  }, [investmentLinesData]);

  // 10. Ambil Saran Teks yang Pernah Dipakai Unit Ini (Suggestion Chips)
  const { data: suggestionsObjective = [] } = useQuery({
    queryKey: ['suggestions', docId, 'strategic_objective'],
    queryFn: async () => {
      if (!docId) return [];
      const res = await investmentApi.getSuggestions(docId, 'strategic_objective');
      return res?.data || [];
    },
    enabled: !!docId,
  });

  const { data: suggestionsKpi = [] } = useQuery({
    queryKey: ['suggestions', docId, 'kpi'],
    queryFn: async () => {
      if (!docId) return [];
      const res = await investmentApi.getSuggestions(docId, 'kpi');
      return res?.data || [];
    },
    enabled: !!docId,
  });

  const { data: suggestionsWorkProgram = [] } = useQuery({
    queryKey: ['suggestions', docId, 'work_program'],
    queryFn: async () => {
      if (!docId) return [];
      const res = await investmentApi.getSuggestions(docId, 'work_program');
      return res?.data || [];
    },
    enabled: !!docId,
  });

  const { data: suggestionsAction = [] } = useQuery({
    queryKey: ['suggestions', docId, 'strategic_action'],
    queryFn: async () => {
      if (!docId) return [];
      const res = await investmentApi.getSuggestions(docId, 'strategic_action');
      return res?.data || [];
    },
    enabled: !!docId,
  });

  // Perhitungan Estimasi Penyusutan Form Baru (BR-16)
  const calculatedDepreciation = useMemo(() => {
    const q = parseInt(qty, 10) || 0;
    const p = parseInt(price, 10) || 0;
    const totalAmount = q * p;
    const usefulLife = activeCategory ? parseInt(activeCategory.useful_life_months || 0, 10) : 0;
    const month = parseInt(planMonth, 10) || 1;
    if (usefulLife <= 0 || totalAmount <= 0) return 0;
    const remainingMonths = Math.max(0, 12 - month);
    return Math.round((totalAmount / usefulLife) * remainingMonths);
  }, [qty, price, activeCategory, planMonth]);

  // Reset form isian
  const resetForm = () => {
    setEditingLineId(null);
    setName('');
    setQty('1');
    setPrice('');
    setPlanMonth(1);
    setStrategicObjective('');
    setKpi('');
    setWorkProgram('');
    setStrategicAction('');
    setFormError('');
  };

  // Muat baris untuk diedit
  const handleEditLine = (line) => {
    setEditingLineId(line.id);
    setCategoryId(String(line.category_id));
    setPriorityId(String(line.priority_id));
    setName(line.name || '');
    setQty(String(line.qty || 1));
    setPrice(String(line.price || 0));
    setPlanMonth(line.plan_month || 1);
    setStrategicObjective(line.strategic_objective || '');
    setKpi(line.kpi || '');
    setWorkProgram(line.work_program || '');
    setStrategicAction(line.strategic_action || '');
    setFormError('');
    setFormSuccess('');
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 11. Mutasi Tambah / Update Baris Investasi
  const saveLineMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingLineId) {
        return await investmentApi.updateInvestmentLine(editingLineId, payload);
      }
      return await investmentApi.createInvestmentLine(docId, payload);
    },
    onSuccess: () => {
      setSaveStatus('saved');
      setFormError('');
      setFormSuccess(
        editingLineId
          ? 'Baris investasi berhasil diperbarui.'
          : 'Baris investasi baru berhasil ditambahkan.'
      );
      const d = new Date();
      setSavedTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['investmentLines', docId] });
      queryClient.invalidateQueries({ queryKey: ['investDocActive'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions', docId] });
    },
    onError: (err) => {
      setSaveStatus('error');
      setFormError(
        err.response?.data?.message || err.message || 'Gagal menyimpan baris investasi.'
      );
    },
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!docId) {
      setFormError('Dokumen anggaran investasi belum aktif.');
      return;
    }
    if (!name.trim()) {
      setFormError('Nama barang atau kegiatan investasi wajib diisi.');
      return;
    }
    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      setFormError('Jumlah (qty) minimal 1.');
      return;
    }
    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Harga satuan harus bernilai 0 atau lebih.');
      return;
    }

    // Validasi Ambang Investasi BR-01
    const totalAmount = parsedQty * parsedPrice;
    const evalValue = thresholdBasis === 'line_total' ? totalAmount : parsedPrice;
    if (evalValue <= investmentThreshold) {
      const basisLabel = thresholdBasis === 'line_total' ? 'Total nilai baris' : 'Harga satuan';
      setFormError(
        `Nilai investasi (${basisLabel}: Rp ${formatRupiah(evalValue)}) harus lebih besar dari ambang batas Rp ${formatRupiah(investmentThreshold)} (BR-01). Item dengan nilai sampai ambang batas dimasukkan ke Anggaran Biaya.`
      );
      return;
    }

    // Validasi batas karakter teks
    if (strategicObjective.trim().length > maxCharLen) {
      setFormError(`Strategi objektif melebihi batas ${maxCharLen} karakter.`);
      return;
    }
    if (kpi.trim().length > maxCharLen) {
      setFormError(`Counter measure (KPI) melebihi batas ${maxCharLen} karakter.`);
      return;
    }
    if (workProgram.trim().length > maxCharLen) {
      setFormError(`Program kerja melebihi batas ${maxCharLen} karakter.`);
      return;
    }
    if (strategicAction.trim().length > maxCharLen) {
      setFormError(`Strategic action melebihi batas ${maxCharLen} karakter.`);
      return;
    }

    setSaveStatus('saving');
    setFormError('');
    setFormSuccess('');

    saveLineMutation.mutate({
      category_id: parseInt(categoryId, 10),
      priority_id: parseInt(priorityId, 10),
      name: name.trim(),
      qty: parsedQty,
      price: parsedPrice,
      plan_month: parseInt(planMonth, 10),
      strategic_objective: strategicObjective.trim(),
      kpi: kpi.trim(),
      work_program: workProgram.trim(),
      strategic_action: strategicAction.trim(),
    });
  };

  // 12. Salin Teks dari Baris Sebelumnya
  const handleCopyPrevious = async () => {
    if (!docId) return;
    try {
      const res = await investmentApi.getLastLineText(docId);
      if (res?.data) {
        setStrategicObjective(res.data.strategic_objective || '');
        setKpi(res.data.kpi || '');
        setWorkProgram(res.data.work_program || '');
        setStrategicAction(res.data.strategic_action || '');
        setFormSuccess('Teks strategi berhasil disalin dari baris sebelumnya.');
      } else {
        alert('Belum ada baris investasi sebelumnya pada unit ini untuk disalin.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyalin teks baris sebelumnya.');
    }
  };

  // 13. Mutasi Hapus Baris Investasi
  const deleteLineMutation = useMutation({
    mutationFn: async (lineId) => {
      return await investmentApi.deleteInvestmentLine(lineId);
    },
    onSuccess: () => {
      setFormSuccess('Baris investasi berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['investmentLines', docId] });
      queryClient.invalidateQueries({ queryKey: ['investDocActive'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal menghapus baris investasi.');
    },
  });

  // 14. Mutasi Inisialisasi Draft Dokumen Investasi
  const createDocMutation = useMutation({
    mutationFn: async () => {
      return await budgetApi.createBudgetDoc({
        period_id: selectedPeriod.id,
        unit_id: parseInt(selectedUnitId, 10),
        type: 'INVESTASI',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investDocActive'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal membuat dokumen anggaran investasi.');
    },
  });

  // 15. Mutasi Ajukan ke Manager
  const submitToManagerMutation = useMutation({
    mutationFn: async () => {
      return await workflowApi.submitDoc(docId);
    },
    onSuccess: () => {
      alert('Dokumen usulan belanja modal investasi berhasil diajukan ke Manager.');
      queryClient.invalidateQueries({ queryKey: ['investDocActive'] });
      queryClient.invalidateQueries({ queryKey: ['docAccess', docId] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Gagal mengajukan dokumen ke Manager.');
    },
  });

  const handleSubmitToManager = () => {
    if (lines.length === 0) {
      alert('Dokumen belum memiliki rincian usulan belanja modal investasi.');
      return;
    }
    if (
      !window.confirm(
        'Apakah Anda yakin ingin mengajukan usulan anggaran investasi ini ke Manager? Setelah diajukan, data akan terkunci dari pengeditan.'
      )
    ) {
      return;
    }
    submitToManagerMutation.mutate();
  };

  // Perhitungan Akumulasi Total
  const grandTotalAmount = useMemo(() => {
    return lines.reduce((acc, l) => acc + (parseInt(l.amount, 10) || 0), 0);
  }, [lines]);

  const grandTotalDepreciation = useMemo(() => {
    return lines.reduce((acc, l) => acc + (parseInt(l.depreciation_amount, 10) || 0), 0);
  }, [lines]);

  const activeUnitObj = unitsData.find(
    (u) => String(u.unit_id || u.id) === String(selectedUnitId)
  );

  const canAccessLaptopPc = user?.role === 'akuntansi' || user?.role === 'manager';

  return (
    <>
      {/* 1. Header Halaman F0 */}
      <PageHeader
        title="Entry · Anggaran Investasi"
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
            . Item investasi harus bernilai lebih dari Rp {formatRupiah(investmentThreshold)}. Semua perubahan tersimpan otomatis.
          </div>
        ) : (
          <Banner variant="bd">
            <b>Pengajuan Ditutup:</b> Akses pengisian usulan anggaran investasi untuk unit ini sedang ditutup.
            {docAccess.reason ? ` (${docAccess.reason})` : ''} Hubungi {docAccess.contact_accounting || 'Akuntansi'}.
          </Banner>
        )
      )}

      {/* 3. Catatan Pengembalian bila ada */}
      {currentDoc?.status === 'DIKEMBALIKAN' && returnNote && (
        <Banner variant="wn">
          <b>Dokumen Dikembalikan untuk Revisi:</b> Catatan dari{' '}
          {returnNote.actor_name || returnNote.actor_role || 'Pemeriksa'}: &ldquo;
          {returnNote.note}&rdquo;. Silakan sesuaikan usulan lalu ajukan kembali.
        </Banner>
      )}

      {/* 4. Sub Navigasi Tab */}
      <div className="row" style={{ marginTop: '4px', gap: '8px' }}>
        <Link
          to="/entry/biaya"
          className="chip nt"
          style={{ padding: '10px 16px', textDecoration: 'none' }}
        >
          Anggaran Biaya
        </Link>
        <Link
          to="/entry/investasi"
          className="chip ok"
          style={{ padding: '10px 16px', textDecoration: 'none', fontWeight: 600 }}
        >
          Anggaran Investasi
        </Link>
        {canAccessLaptopPc && (
          <Link
            to="/entry/laptop-pc"
            className="chip nt"
            style={{ padding: '10px 16px', textDecoration: 'none' }}
          >
            Investasi: Laptop &amp; PC
          </Link>
        )}
      </div>

      {/* 5. Kontrol Pemilih Unit & Periode */}
      <div className="row" style={{ alignItems: 'flex-end', gap: '12px' }}>
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
      </div>

      {/* 6. Keadaan Belum Ada Dokumen Investasi */}
      {!isLoadingDoc && !currentDoc && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <h2 style={{ fontSize: '17px', color: '#1F2233', margin: '0 0 8px' }}>
            Belum Ada Dokumen Anggaran Investasi
          </h2>
          <p style={{ color: '#5E6070', fontSize: '13px', margin: '0 0 16px' }}>
            Dokumen belanja modal investasi untuk unit ini pada periode {selectedPeriodYear} belum dibuat.
          </p>
          {isSubmissionOpen && (
            <button
              type="button"
              className="btn"
              onClick={() => createDocMutation.mutate()}
              disabled={createDocMutation.isPending}
            >
              {createDocMutation.isPending ? 'Membuat...' : '+ Buat Draft Anggaran Investasi'}
            </button>
          )}
        </div>
      )}

      {/* 7. Tabel Anggaran Investasi Sesuai Mockup */}
      {currentDoc && (
        <div className="card sc">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No.</th>
                <th>Nama barang</th>
                <th>Jenis</th>
                <th>COA</th>
                <th className="r">Susut (bln)</th>
                <th>Prioritas</th>
                <th className="r">Qty</th>
                <th className="r">Harga satuan</th>
                <th className="r">Jumlah</th>
                <th>Bulan</th>
                <th className="r">Penyusutan {selectedPeriodYear}</th>
                {!isReadOnly && <th style={{ textAlign: 'center', width: '90px' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {isLoadingLines ? (
                <tr>
                  <td colSpan={isReadOnly ? 11 : 12} style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                    Memuat rincian usulan investasi...
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 11 : 12} style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                    Belum ada baris investasi pada dokumen ini. Gunakan formulir di bawah untuk menambahkan item baru.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const monthLabel =
                    MONTHS.find((m) => m.value === line.plan_month)?.label || `Bln ${line.plan_month}`;

                  return (
                    <tr key={line.id}>
                      <td style={{ verticalAlign: 'top' }}>{idx + 1}</td>
                      <td style={{ verticalAlign: 'top' }}>
                        <b>{line.name}</b>
                        {line.specification && (
                          <div className="lb">Spek: {line.specification}</div>
                        )}
                        {/* Baris Detail Expandable Accordion */}
                        <div style={{ marginTop: '6px' }}>
                          <details>
                            <summary style={{ cursor: 'pointer', color: '#3D4E9C', padding: '4px 0', fontSize: '12px' }}>
                              Lihat strategi objektif, counter measure (KPI), program kerja, dan strategic action
                            </summary>
                            <dl style={{ margin: '6px 0 0', display: 'grid', gridTemplateColumns: '180px 1fr', gap: '4px 10px', fontSize: '12px' }}>
                              <dt className="lb">Strategi objektif</dt>
                              <dd style={{ margin: 0 }}>{line.strategic_objective || '—'}</dd>
                              <dt className="lb">Counter measure (KPI)</dt>
                              <dd style={{ margin: 0 }}>{line.kpi || '—'}</dd>
                              <dt className="lb">Program kerja / inisiatif</dt>
                              <dd style={{ margin: 0 }}>{line.work_program || '—'}</dd>
                              <dt className="lb">Strategic action</dt>
                              <dd style={{ margin: 0 }}>{line.strategic_action || '—'}</dd>
                            </dl>
                          </details>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>{line.category_name}</td>
                      <td style={{ verticalAlign: 'top' }}>
                        <b>{line.coa_code}</b> {line.coa_name}
                      </td>
                      <td className="r" style={{ verticalAlign: 'top' }}>{line.useful_life_months}</td>
                      <td style={{ verticalAlign: 'top' }}>
                        <span className="chip nt">{line.priority_name || 'Keep Operation'}</span>
                      </td>
                      <td className="r" style={{ verticalAlign: 'top' }}>{line.qty}</td>
                      <td className="r" style={{ verticalAlign: 'top' }}>{formatRupiah(line.price)}</td>
                      <td className="r" style={{ verticalAlign: 'top', fontWeight: 600 }}>{formatRupiah(line.amount)}</td>
                      <td style={{ verticalAlign: 'top' }}>{monthLabel}</td>
                      <td className="r" style={{ verticalAlign: 'top', color: '#14532D', fontWeight: 600 }}>
                        {formatRupiah(line.depreciation_amount)}
                      </td>
                      {!isReadOnly && (
                        <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn b2"
                              style={{ minHeight: '28px', height: '28px', padding: '0 6px', fontSize: '11px' }}
                              onClick={() => handleEditLine(line)}
                              title="Edit baris"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn b3"
                              style={{ minHeight: '28px', height: '28px', padding: '0 6px', fontSize: '11px' }}
                              title="Hapus baris"
                              onClick={() => {
                                if (window.confirm(`Hapus item investasi '${line.name}'?`)) {
                                  deleteLineMutation.mutate(line.id);
                                }
                              }}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 700, backgroundColor: '#F3F1EA' }}>
                  <td colSpan="8" style={{ textAlign: 'right', padding: '12px 8px' }}>Total</td>
                  <td className="r" style={{ padding: '12px 8px', fontSize: '15px' }}>
                    {formatRupiah(grandTotalAmount)}
                  </td>
                  <td></td>
                  <td className="r" style={{ padding: '12px 8px', fontSize: '15px', color: '#14532D' }}>
                    {formatRupiah(grandTotalDepreciation)}
                  </td>
                  {!isReadOnly && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 8. Formulir Tambah / Edit Baris Investasi */}
      {currentDoc && !isReadOnly && (
        <div className="card" ref={formRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: 0 }}>
              {editingLineId ? 'Ubah Baris Investasi' : 'Tambah baris investasi'}
            </h2>
            {editingLineId && (
              <button
                type="button"
                className="btn b2"
                style={{ minHeight: '32px', height: '32px', padding: '0 10px', fontSize: '12px' }}
                onClick={resetForm}
              >
                Batal Edit
              </button>
            )}
          </div>

          {/* Notifikasi Galat / Sukses Form */}
          {formError && (
            <div
              className="chip bd"
              style={{ display: 'block', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}
            >
              {formError}
            </div>
          )}
          {formSuccess && (
            <div
              className="chip ok"
              style={{ display: 'block', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}
            >
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
              {/* Jenis Investasi */}
              <label htmlFor="jn">
                Jenis investasi
                <select
                  id="jn"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categoriesData.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Susut / Masa Layak Pakai */}
              <label htmlFor="ss">
                Susut / masa layak pakai (bulan)
                <input
                  id="ss"
                  value={activeCategory?.useful_life_months || 0}
                  readOnly
                  style={{ background: '#F3F1EA', color: '#3A3F63' }}
                />
              </label>

              {/* Prioritas */}
              <label htmlFor="pr">
                Prioritas
                <select
                  id="pr"
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  required
                >
                  {prioritiesData.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Nama Barang atau Kegiatan */}
              <label htmlFor="nb">
                Nama barang atau kegiatan
                <input
                  id="nb"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: USG Portable 4D"
                  required
                />
              </label>

              {/* Qty */}
              <label htmlFor="qt">
                Qty
                <input
                  id="qt"
                  type="number"
                  min="1"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
              </label>

              {/* Harga Satuan */}
              <label htmlFor="hs">
                Harga satuan (Rp)
                <input
                  id="hs"
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Contoh: 185000000"
                  required
                />
              </label>

              {/* Bulan Rencana */}
              <label htmlFor="bl">
                Bulan rencana
                <select
                  id="bl"
                  value={planMonth}
                  onChange={(e) => setPlanMonth(parseInt(e.target.value, 10))}
                  required
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.fullLabel})
                    </option>
                  ))}
                </select>
              </label>

              {/* Estimasi Penyusutan Tahun Berjalan */}
              <label htmlFor="pn">
                Estimasi penyusutan {selectedPeriodYear} (Rp)
                <input
                  id="pn"
                  value={formatRupiah(calculatedDepreciation)}
                  readOnly
                  style={{ background: '#F3F1EA', color: '#3A3F63' }}
                />
              </label>
            </div>

            {/* Keterangan Formula Otomasi COA (BR-15 & BR-16) */}
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              COA ditentukan otomatis dari jenis investasi:{' '}
              <b>
                {activeCategory?.coa_code} {activeCategory?.coa_name || 'Biaya Penyusutan'}
              </b>{' '}
              · masa manfaat {activeCategory?.useful_life_months || 0} bulan. Penyusutan = Jumlah ÷ Susut × (12 − bulan rencana, Januari = 1).
            </p>

            {/* 4 Kotak Teks dengan Penghitung Karakter & Chip Saran */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {/* 1. Strategi Objektif */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="so" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Strategi objektif
                  </label>
                  <span className="lb">{strategicObjective.length} / {maxCharLen} karakter</span>
                </div>
                {suggestionsObjective.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                    {suggestionsObjective.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        className="btn b2"
                        style={{ minHeight: '36px', height: '36px', padding: '0 10px', fontSize: '12px' }}
                        onClick={() => setStrategicObjective(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  id="so"
                  rows={2}
                  maxLength={maxCharLen}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                  value={strategicObjective}
                  onChange={(e) => setStrategicObjective(e.target.value)}
                  placeholder="Uraikan strategi objektif yang ingin dicapai..."
                />
              </div>

              {/* 2. Counter Measure (KPI) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="kp" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Counter measure (KPI)
                  </label>
                  <span className="lb">{kpi.length} / {maxCharLen} karakter</span>
                </div>
                {suggestionsKpi.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                    {suggestionsKpi.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        className="btn b2"
                        style={{ minHeight: '36px', height: '36px', padding: '0 10px', fontSize: '12px' }}
                        onClick={() => setKpi(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  id="kp"
                  rows={2}
                  maxLength={maxCharLen}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                  value={kpi}
                  onChange={(e) => setKpi(e.target.value)}
                  placeholder="Uraikan target KPI / counter measure..."
                />
              </div>

              {/* 3. Program Kerja / Inisiatif Strategis */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="pk" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Program kerja / inisiatif strategis
                  </label>
                  <span className="lb">{workProgram.length} / {maxCharLen} karakter</span>
                </div>
                {suggestionsWorkProgram.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                    {suggestionsWorkProgram.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        className="btn b2"
                        style={{ minHeight: '36px', height: '36px', padding: '0 10px', fontSize: '12px' }}
                        onClick={() => setWorkProgram(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  id="pk"
                  rows={2}
                  maxLength={maxCharLen}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                  value={workProgram}
                  onChange={(e) => setWorkProgram(e.target.value)}
                  placeholder="Uraikan program kerja / inisiatif strategis..."
                />
              </div>

              {/* 4. Strategic Action */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="sa" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Strategic action
                  </label>
                  <span className="lb">{strategicAction.length} / {maxCharLen} karakter</span>
                </div>
                {suggestionsAction.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                    {suggestionsAction.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        className="btn b2"
                        style={{ minHeight: '36px', height: '36px', padding: '0 10px', fontSize: '12px' }}
                        onClick={() => setStrategicAction(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  id="sa"
                  rows={2}
                  maxLength={maxCharLen}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                  value={strategicAction}
                  onChange={(e) => setStrategicAction(e.target.value)}
                  placeholder="Uraikan tindakan strategis pengadaan..."
                />
              </div>
            </div>

            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              Kotak teks melebar mengikuti isi dan selalu menampilkan seluruh ketikan. Chip di atas berisi isian yang pernah dipakai unit ini; satu ketukan mengisi kotaknya, lalu boleh diedit.
            </p>

            {/* Tombol Aksi Form */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
              <button
                type="submit"
                className="btn"
                disabled={saveLineMutation.isPending}
              >
                {saveLineMutation.isPending
                  ? 'Menyimpan...'
                  : editingLineId
                  ? 'Simpan Perubahan'
                  : 'Tambah baris'}
              </button>

              <button
                type="button"
                className="btn b2"
                onClick={handleCopyPrevious}
              >
                Salin teks dari baris sebelumnya
              </button>

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

              <button
                type="button"
                className="btn b2"
                onClick={handleSubmitToManager}
                disabled={submitToManagerMutation.isPending}
              >
                {submitToManagerMutation.isPending ? 'Mengajukan...' : 'Ajukan ke Manager'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
