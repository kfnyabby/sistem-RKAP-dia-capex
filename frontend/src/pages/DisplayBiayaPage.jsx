import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import budgetApi from '../api/budget.api';
import masterApi from '../api/master.api';
import reportApi from '../api/report.api';
import PageHeader from '../components/common/PageHeader';
import DisplaySubNav from '../components/display/DisplaySubNav';

function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('id-ID').format(val);
}

export default function DisplayBiayaPage() {
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
  const [coaGroupFilter, setCoaGroupFilter] = useState('');
  const [coaFilter, setCoaFilter] = useState('');
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
  const handleCoaGroupChange = (e) => {
    setCoaGroupFilter(e.target.value);
    setCoaFilter('');
    setPage(1);
  };
  const handleCoaChange = (e) => {
    setCoaFilter(e.target.value);
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

  const coaGroupsQuery = useQuery({
    queryKey: ['coa-groups'],
    queryFn: async () => {
      const res = await masterApi.getCoaGroups();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const coaGroups = coaGroupsQuery.data || [];

  const coasQuery = useQuery({
    queryKey: ['coas', coaGroupFilter],
    queryFn: async () => {
      const params = { category: 'biaya' };
      if (coaGroupFilter) params.group_id = coaGroupFilter;
      const res = await masterApi.getCoas(params);
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const coas = coasQuery.data || [];

  // 5. Query Baris Biaya Lintas Dokumen
  const expenseLinesQuery = useQuery({
    queryKey: [
      'display-expense-lines',
      activePeriodObj?.id,
      unitFilter,
      docStatusFilter,
      coaGroupFilter,
      coaFilter,
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
      if (coaGroupFilter) params.coa_group_id = coaGroupFilter;
      if (coaFilter) params.coa_id = coaFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      return await budgetApi.listCrossUnitExpenseLines(params);
    },
    enabled: !!activePeriodObj?.id,
  });

  const lines = expenseLinesQuery.data?.data || [];
  const meta = expenseLinesQuery.data?.meta || { total: 0, total_pages: 0 };
  const totals = expenseLinesQuery.data?.totals || {
    total_rkap: 0,
    total_realization: 0,
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
      if (coaGroupFilter) params.coa_group_id = coaGroupFilter;
      if (coaFilter) params.coa_id = coaFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await reportApi.exportExcel('display-biaya', params);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Display_Anggaran_Biaya_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengekspor Display Anggaran Biaya ke Excel');
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
      <PageHeader title="Display · Anggaran Biaya" />
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

        <label htmlFor="fj">
          Jenis COA
          <select id="fj" value={coaGroupFilter} onChange={handleCoaGroupChange}>
            <option value="">Semua jenis</option>
            {coaGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="fc">
          COA
          <select id="fc" value={coaFilter} onChange={handleCoaChange}>
            <option value="">Semua COA</option>
            {coas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} {c.name}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="fb">
          Cari barang
          <input
            id="fb"
            type="text"
            placeholder="Nama atau kode"
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
          <div className="lb">Total RKAP (hasil filter)</div>
          <div className="vl">
            {totals.total_rkap > 0 ? `Rp ${formatRupiah(totals.total_rkap)}` : 'Rp 0'}
          </div>
        </div>
        <div className="card">
          <div className="lb">Realisasi Jan s.d. Okt</div>
          <div className="vl">
            {totals.total_realization != null && totals.total_realization > 0
              ? `Rp ${formatRupiah(totals.total_realization)}`
              : '—'}
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
              <th>Barang</th>
              <th>Satuan</th>
              <th className="r">Harga</th>
              <th className="r">Qty RKAP</th>
              <th className="r">Jumlah</th>
              <th className="r">Real (Jan s.d. Okt)</th>
              <th>Pemakaian</th>
              <th>COA</th>
              <th>Status dokumen</th>
            </tr>
          </thead>
          <tbody>
            {expenseLinesQuery.isLoading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#5E6070' }}>
                  Memuat data anggaran biaya...
                </td>
              </tr>
            ) : expenseLinesQuery.isError ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#8A1F1B' }}>
                  {expenseLinesQuery.error?.response?.data?.message ||
                    'Gagal memuat data anggaran biaya. Silakan coba kembali.'}
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#5E6070' }}>
                  Tidak ada baris anggaran biaya yang cocok dengan kriteria filter.
                </td>
              </tr>
            ) : (
              lines.map((row, idx) => {
                const amountNum = Number(row.amount) || 0;
                const realNum = row.realization !== null && row.realization !== undefined ? Number(row.realization) : null;
                const pct =
                  row.realization_percentage !== null && row.realization_percentage !== undefined
                    ? row.realization_percentage
                    : realNum !== null && amountNum > 0
                    ? Math.round((realNum / amountNum) * 100)
                    : null;

                let pctChipClass = 'ok';
                if (pct !== null) {
                  if (pct > 100) pctChipClass = 'bd';
                  else if (pct >= 80) pctChipClass = 'wn';
                }

                return (
                  <tr key={row.id}>
                    <td>{(page - 1) * perPage + idx + 1}</td>
                    <td>
                      {row.unit ? (
                        <>
                          <span style={{ color: '#5E6070' }}>[{row.unit.code}]</span> {row.unit.name}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{row.item?.name || '—'}</td>
                    <td>{row.uom || '—'}</td>
                    <td className="r">{formatRupiah(row.price)}</td>
                    <td className="r">{formatRupiah(row.qty)}</td>
                    <td className="r" style={{ fontWeight: 600 }}>
                      {formatRupiah(row.amount)}
                    </td>
                    <td className="r">
                      {realNum !== null ? formatRupiah(realNum) : <span style={{ color: '#5E6070' }}>—</span>}
                    </td>
                    <td>
                      {pct !== null ? (
                        <span className={`chip ${pctChipClass}`}>{pct}%</span>
                      ) : (
                        <span style={{ color: '#5E6070' }}>—</span>
                      )}
                    </td>
                    <td>
                      {row.coa ? (
                        <>
                          <span style={{ color: '#5E6070' }}>{row.coa.code}</span> {row.coa.name}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
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
            disabled={page <= 1 || expenseLinesQuery.isLoading}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Sebelumnya
          </button>
          <button
            className="btn b2"
            disabled={page >= totalPages || expenseLinesQuery.isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </button>
        </div>
      </div>
    </>
  );
}
