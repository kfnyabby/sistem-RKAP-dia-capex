import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Banner from '../components/common/Banner';
import Chip from '../components/common/Chip';
import api from '../api/axios';

function formatRupiah(amount) {
  if (amount === null || amount === undefined) return '-';
  const num = Number(amount);
  if (isNaN(num)) return '-';
  if (Math.abs(num) >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Jt`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export default function DashboardPage() {
  const location = useLocation();
  const alertState = location.state?.alert;

  const [company, setCompany] = useState(() => {
    return localStorage.getItem('rkap_selected_company') || 'CN';
  });

  const [period, setPeriod] = useState(() => {
    return localStorage.getItem('rkap_selected_period') || '2027';
  });

  const [summary, setSummary] = useState(null);
  const [progress, setProgress] = useState(null);
  const [budgetVsRealization, setBudgetVsRealization] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ambil data dashboard riil dari backend
  const fetchDashboardData = useCallback(async (comp, per) => {
    try {
      setLoading(true);
      const [sumRes, progRes, bvrRes] = await Promise.allSettled([
        api.get(`/dashboard/summary?company_code=${comp}&period_year=${per}`),
        api.get(`/dashboard/progress?company_code=${comp}&period_year=${per}`),
        api.get(`/dashboard/budget-vs-realization?company_code=${comp}&period_year=${per}&group_by=coa`),
      ]);

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value.data);
      } else {
        setSummary(null);
      }

      if (progRes.status === 'fulfilled') {
        setProgress(progRes.value.data);
      } else {
        setProgress(null);
      }

      if (bvrRes.status === 'fulfilled') {
        setBudgetVsRealization(Array.isArray(bvrRes.value.data) ? bvrRes.value.data : []);
      } else {
        setBudgetVsRealization([]);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
      setSummary(null);
      setProgress(null);
      setBudgetVsRealization([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(company, period);

    const handleContextChange = (e) => {
      const { company: newComp, period: newPer } = e.detail || {};
      if (newComp) setCompany(newComp);
      if (newPer) setPeriod(newPer);
      fetchDashboardData(newComp || company, newPer || period);
    };

    window.addEventListener('rkap:context-change', handleContextChange);
    return () => {
      window.removeEventListener('rkap:context-change', handleContextChange);
    };
  }, [company, period, fetchDashboardData]);

  // Kalkulasi data metrik riil
  const expenseRkap = summary?.expense?.rkap_total;
  const expenseReal = summary?.expense?.realization_total;
  const expensePercent = summary?.expense?.usage_percent ?? (expenseRkap && expenseReal ? Math.round((expenseReal / expenseRkap) * 100) : null);

  const investmentRkap = summary?.investment?.rkap_total;
  const investmentReal = summary?.investment?.realization_total;
  const investmentPercent = summary?.investment?.usage_percent ?? (investmentRkap && investmentReal ? Math.round((investmentReal / investmentRkap) * 100) : null);

  // Progres unit
  const statusCounts = progress?.status_counts || { draft: 0, submitted: 0, approved: 0, final: 0 };
  const totalUnits = (statusCounts.draft || 0) + (statusCounts.submitted || 0) + (statusCounts.approved || 0) + (statusCounts.final || 0);
  const overdueUnitsCount = progress?.overdue_units?.length || 0;

  return (
    <>
      <PageHeader
        title="Dashboard Akuntansi"
        onCompanyChange={(c) => {
          setCompany(c);
          fetchDashboardData(c, period);
        }}
        onPeriodChange={(p) => {
          setPeriod(p);
          fetchDashboardData(company, p);
        }}
      />

      {/* Pesan Peringatan (bila dialihkan akibat otorisasi) */}
      {alertState && (
        <Banner variant={alertState.variant || 'bd'}>
          {alertState.message}
        </Banner>
      )}

      {/* Akses Cepat (Quick Access) */}
      <div className="qa">
        {/* Entry Card */}
        <div className="qc">
          <span className="ic" style={{ background: '#FDE7E2' }}>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D9533D"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 3h7l4 4v14H7z" />
              <path d="M14 3v4h4M10 12h5M10 16h5" />
            </svg>
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#D9533D' }}>ENTRY</h3>
            <Link to="/entry/biaya">
              <span>Anggaran Biaya</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
            <Link to="/entry/investasi">
              <span>Anggaran Investasi</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Proses Card */}
        <div className="qc">
          <span className="ic" style={{ background: '#FBEFD2' }}>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B7791F"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
            </svg>
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#B7791F' }}>PROSES</h3>
            <Link to="/proses/validasi">
              <span>Antrian Validasi</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
            <Link to="/proses/realisasi">
              <span>Input Realisasi</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Display Card */}
        <div className="qc">
          <span className="ic" style={{ background: '#DDF0E6' }}>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2F7F5B"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="12" rx="1" />
              <path d="M8 20h8M12 16v4M7 12l3-3 3 2 4-4" />
            </svg>
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#2F7F5B' }}>DISPLAY</h3>
            <Link to="/display">
              <span>Display Permintaan</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
            <Link to="/entry/laptop-pc">
              <span>Pengadaan Laptop &amp; PC</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrik Statistik */}
      <div className="g4">
        {/* RKAP Biaya */}
        <div className="card">
          <div className="lb">RKAP Biaya</div>
          <div className="vl">
            {expenseRkap !== null && expenseRkap !== undefined ? formatRupiah(expenseRkap) : (loading ? 'Memuat...' : 'Belum ada data')}
          </div>
        </div>

        {/* RKAP Investasi */}
        <div className="card">
          <div className="lb">RKAP Investasi</div>
          <div className="vl">
            {investmentRkap !== null && investmentRkap !== undefined ? formatRupiah(investmentRkap) : (loading ? 'Memuat...' : 'Belum ada data')}
          </div>
        </div>

        {/* Pemakaian Biaya */}
        <div className="card">
          <div className="lb">Pemakaian anggaran biaya</div>
          <div className="vl">
            {expensePercent !== null ? `${expensePercent}%` : (loading ? 'Memuat...' : 'Belum ada data')}
          </div>
          <div className="lb" style={{ marginTop: '2px' }}>
            {expenseReal !== null && expenseReal !== undefined
              ? `${formatRupiah(expenseReal)} dari ${formatRupiah(expenseRkap)}`
              : 'Belum ada data realisasi'}
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: '#ECE8F5', marginTop: '10px' }}>
            <i
              style={{
                display: 'block',
                height: '6px',
                width: `${Math.min(100, Math.max(0, expensePercent || 0))}%`,
                borderRadius: '3px',
                background: '#3D4E9C',
              }}
            />
          </div>
        </div>

        {/* Pemakaian Investasi */}
        <div className="card">
          <div className="lb">Pemakaian anggaran investasi</div>
          <div className="vl">
            {investmentPercent !== null ? `${investmentPercent}%` : (loading ? 'Memuat...' : 'Belum ada data')}
          </div>
          <div className="lb" style={{ marginTop: '2px' }}>
            {investmentReal !== null && investmentReal !== undefined
              ? `${formatRupiah(investmentReal)} dari ${formatRupiah(investmentRkap)}`
              : 'Belum ada data realisasi'}
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: '#ECE8F5', marginTop: '10px' }}>
            <i
              style={{
                display: 'block',
                height: '6px',
                width: `${Math.min(100, Math.max(0, investmentPercent || 0))}%`,
                borderRadius: '3px',
                background: '#3D4E9C',
              }}
            />
          </div>
        </div>
      </div>

      {/* Progres Pengisian Unit */}
      <div className="card">
        <h2>Progres pengisian unit</h2>
        {totalUnits === 0 ? (
          <div
            style={{
              padding: '12px 16px',
              background: '#FAF7F2',
              borderRadius: '8px',
              border: '1px solid #E6E0D6',
              color: '#5E6070',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            Belum ada pengajuan anggaran unit untuk periode ini.
          </div>
        ) : (
          <div style={{ display: 'flex', height: '34px', borderRadius: '8px', overflow: 'hidden' }}>
            {statusCounts.draft > 0 && (
              <i
                style={{
                  flex: statusCounts.draft,
                  background: '#B9B4C9',
                  color: '#1F2233',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontStyle: 'normal',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                }}
              >
                Draft · {statusCounts.draft}
              </i>
            )}
            {statusCounts.submitted > 0 && (
              <i
                style={{
                  flex: statusCounts.submitted,
                  background: '#E0A030',
                  color: '#2B1B00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontStyle: 'normal',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                }}
              >
                Diajukan · {statusCounts.submitted}
              </i>
            )}
            {statusCounts.approved > 0 && (
              <i
                style={{
                  flex: statusCounts.approved,
                  background: '#2F7F5B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontStyle: 'normal',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                }}
              >
                Disetujui · {statusCounts.approved}
              </i>
            )}
            {statusCounts.final > 0 && (
              <i
                style={{
                  flex: statusCounts.final,
                  background: '#232B4A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontStyle: 'normal',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  padding: '0 6px',
                }}
              >
                Final · {statusCounts.final}
              </i>
            )}
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
          Draft: sedang diisi unit · Diajukan: menunggu Manager · Disetujui: lolos Manager, menunggu finalisasi · Final: dikunci Akuntansi
        </p>
        {overdueUnitsCount > 0 && (
          <p style={{ margin: '6px 0 0' }}>
            <span className="chip bd">{overdueUnitsCount} unit melewati deadline</span>
          </p>
        )}
      </div>

      {/* RKAP vs Realisasi per COA */}
      <div className="card sc">
        <h2>RKAP vs realisasi per COA</h2>
        <table>
          <thead>
            <tr>
              <th>COA</th>
              <th>Nama</th>
              <th className="r">RKAP</th>
              <th className="r">Realisasi</th>
              <th>Pemakaian</th>
            </tr>
          </thead>
          <tbody>
            {budgetVsRealization.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                  Belum ada data realisasi COA untuk periode ini.
                </td>
              </tr>
            ) : (
              budgetVsRealization.map((row, idx) => {
                const percent = row.usage_percent ?? (row.rkap_amount && row.realization_amount ? Math.round((row.realization_amount / row.rkap_amount) * 100) : null);
                let variant = 'ok';
                let label = 'Aman';
                if (percent !== null) {
                  if (percent > 100) {
                    variant = 'bd';
                    label = 'Melebihi';
                  } else if (percent >= 80) {
                    variant = 'wn';
                    label = 'Waspada';
                  }
                }
                return (
                  <tr key={row.coa_code || idx}>
                    <td>{row.coa_code}</td>
                    <td>{row.coa_name}</td>
                    <td className="r">{formatRupiah(row.rkap_amount)}</td>
                    <td className="r">{formatRupiah(row.realization_amount)}</td>
                    <td>
                      {percent !== null ? (
                        <Chip variant={variant}>{percent}% · {label}</Chip>
                      ) : (
                        <Chip variant="nt">-</Chip>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
