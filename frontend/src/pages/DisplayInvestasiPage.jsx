import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import budgetApi from '../api/budget.api';
import investmentApi from '../api/investment.api';
import masterApi from '../api/master.api';
import reportApi from '../api/report.api';
import PageHeader from '../components/common/PageHeader';
import DisplaySubNav from '../components/display/DisplaySubNav';

function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('id-ID').format(val);
}

const MONTH_NAMES = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function formatMonth(m) {
  const num = parseInt(m, 10);
  return MONTH_NAMES[num] || (m ? `Bln ${m}` : '—');
}

export default function DisplayInvestasiPage() {
  // 1. Konteks Periode & Perusahaan Aktif
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [selectedPeriodYear, setSelectedPeriodYear] = useState(() => {
    return localStorage.getItem('rkap_selected_period') || '2027';
  });
  const [selectedCompany, setSelectedCompany] = useState(() => {
    return localStorage.getItem('rkap_selected_company') || 'CN';
  });

  useEffect(() => {
    const handleContextChange = (e) => {
      if (e.detail?.period) setSelectedPeriodYear(String(e.detail.period));
      if (e.detail?.company) setSelectedCompany(String(e.detail.company));
      setPage(1);
    };
    window.addEventListener('rkap:context-change', handleContextChange);
    return () => window.removeEventListener('rkap:context-change', handleContextChange);
  }, []);

  // 2. Fetch Periode untuk mendapatkan period_id
  const periodsQuery = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const res = await budgetApi.getPeriods();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const activePeriodObj = useMemo(() => {
    const list = periodsQuery.data || [];
    const matched = list.find((p) => String(p.year) === String(selectedPeriodYear));
    return matched || list[0] || null;
  }, [periodsQuery.data, selectedPeriodYear]);

  // 3. State Filter
  const [unitFilter, setUnitFilter] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter changes
  const handleUnitChange = (e) => {
    setUnitFilter(e.target.value);
    setPage(1);
  };
  const handleDocStatusChange = (e) => {
    setDocStatusFilter(e.target.value);
    setPage(1);
  };
  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };
  const handlePriorityChange = (e) => {
    setPriorityFilter(e.target.value);
    setPage(1);
  };

  // 4. Load Master References
  const unitsQuery = useQuery({
    queryKey: ['units', selectedCompany],
    queryFn: async () => {
      const res = await masterApi.getUnits({ company_code: selectedCompany });
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const units = unitsQuery.data || [];

  const categoriesQuery = useQuery({
    queryKey: ['investment-categories'],
    queryFn: async () => {
      const res = await investmentApi.getInvestmentCategories();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const categories = categoriesQuery.data || [];

  const prioritiesQuery = useQuery({
    queryKey: ['priorities'],
    queryFn: async () => {
      const res = await investmentApi.getPriorities();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const priorities = prioritiesQuery.data || [];

  // 5. Query Baris Investasi Lintas Dokumen
  const investmentLinesQuery = useQuery({
    queryKey: [
      'display-investment-lines',
      activePeriodObj?.id,
      unitFilter,
      docStatusFilter,
      categoryFilter,
      priorityFilter,
      debouncedSearch,
      page,
      perPage,
    ],
    queryFn: async () => {
      if (!activePeriodObj?.id) return { data: [], meta: { total: 0, total_pages: 0 }, totals: {} };
      const params = {
        period_id: activePeriodObj.id,
        page,
        per_page: perPage,
      };
      if (unitFilter) params.unit_id = unitFilter;
      if (docStatusFilter && docStatusFilter !== 'ALL') params.doc_status = docStatusFilter;
      if (categoryFilter) params.category_id = categoryFilter;
      if (priorityFilter) params.priority_id = priorityFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      return await investmentApi.listCrossUnitLines(params);
    },
    enabled: !!activePeriodObj?.id,
  });

  const lines = investmentLinesQuery.data?.data || [];
  const meta = investmentLinesQuery.data?.meta || { total: 0, total_pages: 0 };
  const totals = investmentLinesQuery.data?.totals || {
    total_amount: 0,
    total_depreciation: 0,
    total_units: 0,
    total_lines: 0,
  };

  const totalLines = meta.total || 0;
  const totalPages = meta.total_pages || Math.ceil(totalLines / perPage) || 1;
  const startRow = totalLines === 0 ? 0 : (page - 1) * perPage + 1;
  const endRow = Math.min(page * perPage, totalLines);

  // 6. Handle Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = {};
      if (activePeriodObj?.id) params.period_id = activePeriodObj.id;
      if (unitFilter) params.unit_id = unitFilter;
      if (docStatusFilter && docStatusFilter !== 'ALL') params.doc_status = docStatusFilter;
      if (categoryFilter) params.category_id = categoryFilter;
      if (priorityFilter) params.priority_id = priorityFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await reportApi.exportExcel('display-investasi', params);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Display_Anggaran_Investasi_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengekspor Display Anggaran Investasi ke Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper render status dokumen
  const renderDocStatus = (st) => {
    const s = (st || '').toUpperCase();
    if (s === 'FINAL') {
      return (
        <span className="chip ok" style={{ background: '#232B4A', color: '#fff' }}>
          Final
        </span>
      );
    }
    if (s === 'DISETUJUI') {
      return <span className="chip ok">Disetujui</span>;
    }
    if (s === 'DIAJUKAN') {
      return <span className="chip wn">Diajukan</span>;
    }
    if (s === 'DRAFT') {
      return <span className="chip nt">Draft</span>;
    }
    if (s === 'REVISI' || s === 'DITOLAK') {
      return <span className="chip bd">Revisi</span>;
    }
    return <span className="chip nt">{st || '—'}</span>;
  };

  return (
    <>
      <PageHeader title="Display · Anggaran Investasi" />
      <DisplaySubNav />

      {/* Banner Informasi Sesuai Mockup */}
      <div
        className="card"
        style={{
          background: '#ECE8F5',
          borderColor: '#CFC8E6',
          color: '#3A3F63',
        }}
      >
        Tampilan baca-saja lintas unit dan dokumen sesuai hak akses Anda. Untuk mengubah isian, buka Entry.
      </div>

      {/* Filter Bar */}
      <div className="row">
        <label htmlFor="fu">
          Unit
          <select id="fu" value={unitFilter} onChange={handleUnitChange}>
            <option value="">Semua unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                [{u.code}] {u.name}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="fs">
          Status dokumen
          <select id="fs" value={docStatusFilter} onChange={handleDocStatusChange}>
            <option value="ALL">Semua</option>
            <option value="DRAFT">Draft</option>
            <option value="DIAJUKAN">Diajukan</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="FINAL">Final</option>
          </select>
        </label>

        <label htmlFor="fk">
          Kategori investasi
          <select id="fk" value={categoryFilter} onChange={handleCategoryChange}>
            <option value="">Semua kategori</option>
            {categories.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="fp">
          Prioritas
          <select id="fp" value={priorityFilter} onChange={handlePriorityChange}>
            <option value="">Semua</option>
            {priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="fb">
          Cari barang
          <input
            id="fb"
            type="text"
            placeholder="Nama barang"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <button
          className="btn b2"
          onClick={handleExportExcel}
          disabled={isExporting}
          style={{ minHeight: '44px' }}
        >
          {isExporting ? 'Mengekspor...' : 'Export Excel'}
        </button>
      </div>

      {/* 4 Kartu Ringkasan (.g4) */}
      <div className="g4">
        <div className="card">
          <div className="lb">Total investasi (hasil filter)</div>
          <div className="vl">
            {totals.total_amount > 0 ? `Rp ${formatRupiah(totals.total_amount)}` : 'Rp 0'}
          </div>
        </div>
        <div className="card">
          <div className="lb">Penyusutan {selectedPeriodYear}</div>
          <div className="vl">
            {totals.total_depreciation > 0 ? `Rp ${formatRupiah(totals.total_depreciation)}` : 'Rp 0'}
          </div>
        </div>
        <div className="card">
          <div className="lb">Unit</div>
          <div className="vl">{totals.total_units || 0}</div>
        </div>
        <div className="card">
          <div className="lb">Baris</div>
          <div className="vl">{totals.total_lines || 0}</div>
        </div>
      </div>

      {/* Tabel Data (.card.sc) */}
      <div className="card sc" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>No.</th>
              <th>Unit</th>
              <th>Nama barang</th>
              <th>Kategori</th>
              <th>COA</th>
              <th>Prioritas</th>
              <th className="r">Qty</th>
              <th className="r">Harga satuan</th>
              <th className="r">Jumlah</th>
              <th>Bulan</th>
              <th className="r">Penyusutan {selectedPeriodYear}</th>
              <th>Status dokumen</th>
            </tr>
          </thead>
          <tbody>
            {investmentLinesQuery.isLoading ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#5E6070' }}>
                  Memuat data anggaran investasi...
                </td>
              </tr>
            ) : investmentLinesQuery.isError ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#8A1F1B' }}>
                  {investmentLinesQuery.error?.response?.data?.message ||
                    'Gagal memuat data anggaran investasi. Silakan coba kembali.'}
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: '#5E6070' }}>
                  Tidak ada baris anggaran investasi yang cocok dengan kriteria filter.
                </td>
              </tr>
            ) : (
              lines.map((row, idx) => {
                const unitCode = row.unit?.code || row.unit_code || '';
                const unitName = row.unit?.name || row.unit_name || '';
                const catName = row.category?.name || row.category_name || '—';
                const coaCode = row.coa?.code || row.coa_code || '';
                const coaName = row.coa?.name || row.coa_name || '';
                const priorityName = row.priority?.name || row.priority_name || '—';

                return (
                  <tr key={row.id}>
                    <td>{(page - 1) * perPage + idx + 1}</td>
                    <td>
                      {unitCode ? (
                        <>
                          <span style={{ color: '#5E6070' }}>[{unitCode}]</span> {unitName}
                        </>
                      ) : (
                        unitName || '—'
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{row.name || '—'}</td>
                    <td>{catName}</td>
                    <td>
                      {coaCode ? (
                        <>
                          <span style={{ color: '#5E6070' }}>{coaCode}</span> {coaName}
                        </>
                      ) : (
                        coaName || '—'
                      )}
                    </td>
                    <td>{priorityName}</td>
                    <td className="r">{formatRupiah(row.qty)}</td>
                    <td className="r">{formatRupiah(row.price)}</td>
                    <td className="r" style={{ fontWeight: 600 }}>
                      {formatRupiah(row.amount)}
                    </td>
                    <td>{formatMonth(row.plan_month)}</td>
                    <td className="r">{formatRupiah(row.depreciation_amount)}</td>
                    <td>{renderDocStatus(row.doc_status)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginasi & Bar Info Bawah */}
      <div className="hd" style={{ marginTop: '4px' }}>
        <span className="lb">
          {totalLines > 0
            ? `Menampilkan ${startRow} sampai ${endRow} dari ${totalLines} baris`
            : 'Menampilkan 0 baris'}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn b2"
            disabled={page <= 1 || investmentLinesQuery.isLoading}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Sebelumnya
          </button>
          <button
            className="btn b2"
            disabled={page >= totalPages || investmentLinesQuery.isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </>
  );
}
