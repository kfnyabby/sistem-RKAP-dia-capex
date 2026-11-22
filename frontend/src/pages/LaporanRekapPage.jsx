import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import reportApi from '../api/report.api';
import budgetApi from '../api/budget.api';
import masterApi from '../api/master.api';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';

function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return new Intl.NumberFormat('id-ID').format(val);
}

export default function LaporanRekapPage() {
  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL'); // 'ALL' | 'CN' | 'CNH'
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'BIAYA' | 'INVESTASI'
  const [unitFilter, setUnitFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // 1. Load Periods
  const periodsQuery = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const data = await budgetApi.getPeriods();
      return Array.isArray(data) ? data : (data?.data || []);
    },
  });

  const periods = useMemo(() => {
    const raw = periodsQuery.data;
    return Array.isArray(raw) ? raw : (raw?.data || []);
  }, [periodsQuery.data]);

  const activeYear = selectedYear || (periods.length > 0 ? String(periods[0].year) : '2027');

  // 2. Load Units untuk filter dropdown
  const unitsQuery = useQuery({
    queryKey: ['units', companyFilter],
    queryFn: async () => {
      const params = {};
      if (companyFilter !== 'ALL') params.company_code = companyFilter;
      const res = await masterApi.getUnits(params);
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });

  const units = useMemo(() => {
    const raw = unitsQuery.data;
    return Array.isArray(raw) ? raw : (raw?.data || []);
  }, [unitsQuery.data]);

  // 3. Load Consolidated Report Data
  const consolidatedQuery = useQuery({
    queryKey: ['report-consolidated', activeYear, companyFilter, typeFilter, unitFilter],
    queryFn: async () => {
      if (!activeYear) return null;
      const params = {
        period_year: activeYear,
        type: typeFilter,
      };
      if (companyFilter === 'CN') params.company_code = 'CN';
      if (companyFilter === 'CNH') params.company_code = 'CNH';
      if (unitFilter) params.unit_id = unitFilter;

      const data = await reportApi.getConsolidated(params);
      return data || null;
    },
    enabled: Boolean(activeYear),
  });

  const reportData = consolidatedQuery.data;

  // Handler Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = {
        period_year: activeYear,
        type: typeFilter,
      };
      if (companyFilter === 'CN') params.company_code = 'CN';
      if (companyFilter === 'CNH') params.company_code = 'CNH';
      if (unitFilter) params.unit_id = unitFilter;

      const res = await reportApi.exportExcel('consolidated', params);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rekap_Konsolidasi_RKAP_${activeYear}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengekspor laporan ke Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const companies = useMemo(() => reportData?.companies || [], [reportData?.companies]);
  const grandTotal = reportData?.grand_total || { rkap: null, realisasi: null };

  return (
    <>
      <style>{`
        .rk tr.c td { background: #232B4A; color: #fff; font-weight: 600; border-top: 0; padding: 10px 8px; }
        .rk tr.u td { border-top: 3px solid #232B4A; background: #F3F1EA; font-weight: 600; padding: 9px 8px; }
        .rk tr.s td { font-weight: 600; background: #FAF7F2; border-bottom: 2px solid #E6E0D6; padding: 8px; }
        .rk tr.t td { background: #3D4E9C; color: #fff; font-weight: 700; padding: 10px 8px; }
        .rk td.k { color: #5E6070; font-size: 13px; }
      `}</style>

      <PageHeader
        title="Laporan · Rekap Anggaran Gabungan CN dan CNH"
        chips={<Chip variant="nt">RKAP {activeYear}</Chip>}
      />

      {/* Sub-navigasi Tab Antara Rekap dan Matriks */}
      <div className="row" style={{ marginBottom: 12 }}>
        <Link
          to="/laporan/rekap"
          className="chip ok"
          style={{ padding: '10px 16px', textDecoration: 'none', fontWeight: 600 }}
        >
          Rekap per unit
        </Link>
        <Link
          to="/laporan/matriks"
          className="chip nt"
          style={{ padding: '10px 16px', textDecoration: 'none' }}
        >
          Matriks unit × COA (format ERP)
        </Link>
      </div>

      {/* Baris Filter Mockup */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div className="row">
          <label htmlFor="fy" style={{ minWidth: 120 }}>
            Periode
            <select
              id="fy"
              value={activeYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={String(p.year)}>
                  TH {p.year}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="fp" style={{ minWidth: 150 }}>
            Perusahaan
            <select
              id="fp"
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value);
                setUnitFilter('');
              }}
            >
              <option value="ALL">CN dan CNH</option>
              <option value="CN">CN</option>
              <option value="CNH">CNH</option>
            </select>
          </label>

          <label htmlFor="fj" style={{ minWidth: 170 }}>
            Jenis
            <select
              id="fj"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">Biaya dan Investasi</option>
              <option value="BIAYA">Biaya</option>
              <option value="INVESTASI">Investasi</option>
            </select>
          </label>

          <label htmlFor="fu" style={{ flex: 1, minWidth: 200 }}>
            Unit
            <select
              id="fu"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="">Semua unit</option>
              {units.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  [{u.code}] {u.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn b2"
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{ minHeight: '44px' }}
          >
            {isExporting ? 'Mengekspor...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Tabel Rekapitulasi Hierarkis (.rk) */}
      <div className="card sc" style={{ padding: 0 }}>
        {consolidatedQuery.isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Memuat laporan rekapitulasi anggaran gabungan...
          </div>
        ) : consolidatedQuery.isError ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#8A1F1B', fontSize: 13 }}>
            Gagal memuat laporan: {consolidatedQuery.error?.response?.data?.message || consolidatedQuery.error?.message}
          </div>
        ) : companies.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Belum ada data anggaran yang tersedia untuk periode RKAP {activeYear}.
          </div>
        ) : (
          <table className="rk">
            <thead>
              <tr>
                <th>Uraian</th>
                <th style={{ width: 120 }}>Kode</th>
                <th className="r" style={{ width: 160 }}>RKAP {activeYear}</th>
                <th className="r" style={{ width: 160 }}>Realisasi Buku Besar</th>
                <th style={{ width: 110, textAlign: 'center' }}>Pemakaian</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((comp) => (
                <CompanyRows key={comp.company_id || comp.company_code} comp={comp} />
              ))}

              {/* Baris Grand Total Gabungan CN + CNH */}
              <tr className="t">
                <td colSpan={2}>TOTAL CN + CNH</td>
                <td className="r">Rp {formatRupiah(grandTotal.rkap)}</td>
                <td className="r">{grandTotal.realisasi !== null ? `Rp ${formatRupiah(grandTotal.realisasi)}` : '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  {grandTotal.rkap && grandTotal.realisasi !== null ? (
                    <Chip
                      variant={
                        Math.round((grandTotal.realisasi / grandTotal.rkap) * 100) > 100
                          ? 'bd'
                          : Math.round((grandTotal.realisasi / grandTotal.rkap) * 100) > 80
                            ? 'wn'
                            : 'ok'
                      }
                    >
                      {Math.round((grandTotal.realisasi / grandTotal.rkap) * 100)}%
                    </Chip>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function CompanyRows({ comp }) {
  return (
    <>
      {/* Header Perusahaan */}
      <tr className="c">
        <td colSpan={5}>{comp.company_name} ({comp.company_code})</td>
      </tr>

      {/* Daftar Unit di Perusahaan Ini */}
      {(comp.units || []).map((unit) => (
        <UnitRows key={unit.unit_id || unit.code} unit={unit} />
      ))}

      {/* Subtotal Perusahaan */}
      <tr className="s">
        <td colSpan={2}>SUBTOTAL {comp.company_code}</td>
        <td className="r">Rp {formatRupiah(comp.subtotal?.rkap)}</td>
        <td className="r">{comp.subtotal?.realisasi !== null ? `Rp ${formatRupiah(comp.subtotal?.realisasi)}` : '—'}</td>
        <td style={{ textAlign: 'center' }}>
          {comp.subtotal?.rkap && comp.subtotal?.realisasi !== null ? (
            <Chip
              variant={
                Math.round((comp.subtotal.realisasi / comp.subtotal.rkap) * 100) > 100
                  ? 'bd'
                  : Math.round((comp.subtotal.realisasi / comp.subtotal.rkap) * 100) > 80
                    ? 'wn'
                    : 'ok'
              }
            >
              {Math.round((comp.subtotal.realisasi / comp.subtotal.rkap) * 100)}%
            </Chip>
          ) : null}
        </td>
      </tr>
    </>
  );
}

function UnitRows({ unit }) {
  return (
    <>
      {/* Header Unit */}
      <tr className="u">
        <td colSpan={5}>
          [{unit.code}] {unit.name}
        </td>
      </tr>

      {/* Baris-Baris Anggaran Unit */}
      {(unit.lines || []).map((line, idx) => (
        <tr key={`${unit.unit_id}_${line.kind}_${line.coa_code}_${idx}`}>
          <td style={{ paddingLeft: 24 }}>
            {line.kind === 'INVESTASI' ? `Investasi: ${line.name}` : line.name}
          </td>
          <td className="k">{line.coa_code || (line.kind === 'INVESTASI' ? 'Capex' : '—')}</td>
          <td className="r">{line.rkap !== null ? formatRupiah(line.rkap) : '—'}</td>
          <td className="r">{line.realisasi !== null ? formatRupiah(line.realisasi) : '—'}</td>
          <td style={{ textAlign: 'center' }}>
            {line.usage_percent !== null ? (
              <Chip
                variant={
                  line.usage_percent > 100
                    ? 'bd'
                    : line.usage_percent > 80
                      ? 'wn'
                      : 'ok'
                }
              >
                {line.usage_percent}%
              </Chip>
            ) : (
              <span style={{ color: '#9A97A8', fontSize: 12 }}>—</span>
            )}
          </td>
        </tr>
      ))}

      {/* Subtotal Unit */}
      <tr className="s">
        <td colSpan={2} style={{ paddingLeft: 24 }}>Subtotal unit</td>
        <td className="r">{unit.subtotal?.rkap !== null ? formatRupiah(unit.subtotal?.rkap) : '—'}</td>
        <td className="r">{unit.subtotal?.realisasi !== null ? formatRupiah(unit.subtotal?.realisasi) : '—'}</td>
        <td style={{ textAlign: 'center' }}>
          {unit.subtotal?.rkap && unit.subtotal?.realisasi !== null ? (
            <Chip
              variant={
                Math.round((unit.subtotal.realisasi / unit.subtotal.rkap) * 100) > 100
                  ? 'bd'
                  : Math.round((unit.subtotal.realisasi / unit.subtotal.rkap) * 100) > 80
                    ? 'wn'
                    : 'ok'
              }
            >
              {Math.round((unit.subtotal.realisasi / unit.subtotal.rkap) * 100)}%
            </Chip>
          ) : null}
        </td>
      </tr>
    </>
  );
}
