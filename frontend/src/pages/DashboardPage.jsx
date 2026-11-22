import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Banner from '../components/common/Banner';
import Chip from '../components/common/Chip';
import dashboardApi from '../api/dashboard.api';
import masterApi from '../api/master.api';
import budgetApi from '../api/budget.api';

// Helper format ringkas Rupiah (Miliaran / Jutaan) untuk kartu metrik
function formatRupiahShort(amount) {
  if (amount === null || amount === undefined) return '—';
  const num = Number(amount);
  if (isNaN(num)) return '—';
  if (Math.abs(num) >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Jt`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}

// Helper format nominal bilangan bulat Rupiah untuk tabel
function formatNominal(amount) {
  if (amount === null || amount === undefined) return '—';
  const num = Number(amount);
  if (isNaN(num)) return '—';
  return num.toLocaleString('id-ID');
}

export default function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const alertState = location.state?.alert;
  const role = (user?.role || 'pic').toLowerCase();

  // Konteks Perusahaan & Periode Aktif
  const [companyCode, setCompanyCode] = useState(() => {
    return localStorage.getItem('rkap_selected_company') || 'CN';
  });

  const [periodYear, setPeriodYear] = useState(() => {
    return localStorage.getItem('rkap_selected_period') || '2027';
  });

  // 1. Ambil Reference Data (Daftar Perusahaan CN & CNH)
  const refQuery = useQuery({
    queryKey: ['reference-data'],
    queryFn: async () => {
      const data = await masterApi.getReferenceData();
      return data || {};
    },
  });
  const companies = useMemo(() => refQuery.data?.companies || [], [refQuery.data]);

  // 2. Ambil Daftar Periode RKAP
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

  // Cari ID Perusahaan dan Periode yang sesuai secara dinamis (Aturan B9)
  const targetCompany = useMemo(() => {
    return companies.find((c) => c.code === companyCode) || companies[0] || null;
  }, [companies, companyCode]);

  const targetPeriod = useMemo(() => {
    if (!periods || periods.length === 0) return null;
    const byYear = periods.find((p) => String(p.year) === String(periodYear));
    return byYear || periods[0];
  }, [periods, periodYear]);

  const companyId = targetCompany?.id || 1;
  const periodId = targetPeriod?.id || 1;
  const activeYear = targetPeriod ? String(targetPeriod.year) : periodYear;

  // 3. Query Ringkasan Dashboard (Summary)
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary', companyId, periodId],
    queryFn: async () => {
      const data = await dashboardApi.getSummary({
        company_id: companyId,
        period_id: periodId,
      });
      return data || null;
    },
    enabled: Boolean(companyId && periodId),
  });

  // 4. Query Progres Pengisian Unit (Progress)
  const progressQuery = useQuery({
    queryKey: ['dashboard-progress', companyId, periodId],
    queryFn: async () => {
      const data = await dashboardApi.getProgress({
        company_id: companyId,
        period_id: periodId,
      });
      return data || null;
    },
    enabled: Boolean(companyId && periodId),
  });

  // 5. Query RKAP vs Realisasi per COA (Budget vs Realization)
  const bvrQuery = useQuery({
    queryKey: ['dashboard-bvr', companyId, periodId],
    queryFn: async () => {
      const data = await dashboardApi.getBudgetVsRealization({
        company_id: companyId,
        period_id: periodId,
        group_by: 'coa',
      });
      return Array.isArray(data) ? data : (data?.data || []);
    },
    enabled: Boolean(companyId && periodId),
  });

  const summary = summaryQuery.data;
  const progress = progressQuery.data;
  const bvrRows = useMemo(() => {
    const raw = bvrQuery.data;
    return Array.isArray(raw) ? raw : (raw?.data || []);
  }, [bvrQuery.data]);

  // Data Metrik Ringkasan
  const expenseRkap = summary?.rkap_biaya;
  const expenseReal = summary?.realisasi_biaya;
  const expensePercent = summary?.usage_biaya_percent !== null && summary?.usage_biaya_percent !== undefined
    ? Math.round(summary.usage_biaya_percent)
    : expenseRkap && expenseReal ? Math.round((expenseReal / expenseRkap) * 100) : null;

  const investmentRkap = summary?.rkap_investasi;
  const investmentReal = summary?.realisasi_investasi;
  const investmentPercent = summary?.usage_investasi_percent !== null && summary?.usage_investasi_percent !== undefined
    ? Math.round(summary.usage_investasi_percent)
    : investmentRkap && investmentReal ? Math.round((investmentReal / investmentRkap) * 100) : null;

  // Progres Bar Dokumen
  const draftCount = progress?.draft || 0;
  const diajukanCount = progress?.diajukan || 0;
  const disetujuiCount = progress?.disetujui || 0;
  const finalCount = progress?.final || 0;
  const totalUnits = draftCount + diajukanCount + disetujuiCount + finalCount;
  const lateUnitsCount = progress?.late_units?.length || 0;

  // Ambang Settings
  const warningTh = summary?.threshold?.warning || 80;
  const criticalTh = summary?.threshold?.critical || 100;

  // Judul dinamis sesuai role
  const pageTitle = role === 'akuntansi'
    ? 'Dashboard Akuntansi'
    : role === 'manager'
      ? 'Dashboard Manager'
      : 'Dashboard PIC Unit';

  return (
    <>
      <PageHeader
        title={pageTitle}
        chips={<Chip variant="nt">{companyCode} · RKAP {activeYear}</Chip>}
        onCompanyChange={(c) => {
          setCompanyCode(c);
          localStorage.setItem('rkap_selected_company', c);
        }}
        onPeriodChange={(p) => {
          setPeriodYear(p);
          localStorage.setItem('rkap_selected_period', p);
        }}
      />

      {/* Pesan Peringatan bila ada pengalihan state akses */}
      {alertState && (
        <Banner variant={alertState.variant || 'bd'}>
          {alertState.message}
        </Banner>
      )}

      {/* Tiga Kartu Akses Cepat (.qa -> .qc) Sesuai Role */}
      <div className="qa">
        {/* Kartu 1: ENTRY */}
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

        {/* Kartu 2: PROSES */}
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
            {role === 'akuntansi' ? (
              <>
                <Link to="/laporan/rekap">
                  <span>Laporan Anggaran</span>
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
              </>
            ) : role === 'manager' ? (
              <>
                <Link to="/proses/validasi">
                  <span>Antrian Validasi</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link to="/laporan/rekap">
                  <span>Laporan Anggaran</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </>
            ) : (
              <Link to="/proses/validasi">
                <span>Status Validasi</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Kartu 3: DISPLAY */}
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
            {role !== 'pic' ? (
              <Link to="/entry/laptop-pc">
                <span>Pengadaan Laptop &amp; PC</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ) : (
              <Link to="/entry/biaya">
                <span>Anggaran Biaya Unit</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6070" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Empat Kartu Ringkasan Metrik (.g4 -> .card) */}
      <div className="g4">
        {/* Kartu 1: RKAP Biaya */}
        <div className="card">
          <div className="lb">RKAP Biaya</div>
          <div className="vl">
            {summaryQuery.isLoading ? (
              'Memuat...'
            ) : expenseRkap !== null && expenseRkap !== undefined ? (
              formatRupiahShort(expenseRkap)
            ) : (
              'Belum ada data'
            )}
          </div>
        </div>

        {/* Kartu 2: RKAP Investasi */}
        <div className="card">
          <div className="lb">RKAP Investasi</div>
          <div className="vl">
            {summaryQuery.isLoading ? (
              'Memuat...'
            ) : investmentRkap !== null && investmentRkap !== undefined ? (
              formatRupiahShort(investmentRkap)
            ) : (
              'Belum ada data'
            )}
          </div>
        </div>

        {/* Kartu 3: Pemakaian Anggaran Biaya */}
        <div className="card">
          <div className="lb">Pemakaian anggaran biaya</div>
          <div className="vl">
            {summaryQuery.isLoading ? (
              'Memuat...'
            ) : expensePercent !== null ? (
              `${expensePercent}%`
            ) : (
              'Belum ada data'
            )}
          </div>
          <div className="lb" style={{ marginTop: '2px' }}>
            {expenseReal !== null && expenseReal !== undefined && expenseRkap !== null && expenseRkap !== undefined
              ? `${formatRupiahShort(expenseReal)} dari ${formatRupiahShort(expenseRkap)}`
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

        {/* Kartu 4: Pemakaian Anggaran Investasi */}
        <div className="card">
          <div className="lb">Pemakaian anggaran investasi</div>
          <div className="vl">
            {summaryQuery.isLoading ? (
              'Memuat...'
            ) : investmentPercent !== null ? (
              `${investmentPercent}%`
            ) : (
              'Belum ada data'
            )}
          </div>
          <div className="lb" style={{ marginTop: '2px' }}>
            {investmentReal !== null && investmentReal !== undefined && investmentRkap !== null && investmentRkap !== undefined
              ? `${formatRupiahShort(investmentReal)} dari ${formatRupiahShort(investmentRkap)}`
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
        {progressQuery.isLoading ? (
          <div style={{ padding: '16px', color: '#5E6070', fontSize: '13px', textAlign: 'center' }}>
            Memuat progres pengisian dokumen...
          </div>
        ) : totalUnits === 0 ? (
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
            {draftCount > 0 && (
              <i
                style={{
                  flex: draftCount,
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
                Draft · {draftCount}
              </i>
            )}
            {diajukanCount > 0 && (
              <i
                style={{
                  flex: diajukanCount,
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
                Diajukan · {diajukanCount}
              </i>
            )}
            {disetujuiCount > 0 && (
              <i
                style={{
                  flex: disetujuiCount,
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
                Disetujui · {disetujuiCount}
              </i>
            )}
            {finalCount > 0 && (
              <i
                style={{
                  flex: finalCount,
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
                Final · {finalCount}
              </i>
            )}
          </div>
        )}

        <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
          Draft: sedang diisi unit · Diajukan: menunggu Manager · Disetujui: lolos Manager, menunggu finalisasi · Final: dikunci Akuntansi
        </p>

        {lateUnitsCount > 0 && (
          <p style={{ margin: '6px 0 0' }}>
            <span className="chip bd">{lateUnitsCount} unit melewati deadline</span>
          </p>
        )}
      </div>

      {/* Tabel RKAP vs Realisasi per COA (.card .sc) */}
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
            {bvrQuery.isLoading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                  Memuat data realisasi akun COA...
                </td>
              </tr>
            ) : bvrQuery.isError ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#8A1F1B' }}>
                  Gagal memuat data: {bvrQuery.error?.response?.data?.message || bvrQuery.error?.message}
                </td>
              </tr>
            ) : bvrRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                  Belum ada data realisasi COA untuk periode ini.
                </td>
              </tr>
            ) : (
              bvrRows.map((row, idx) => {
                const percent = row.usage_percent !== null && row.usage_percent !== undefined
                  ? Math.round(row.usage_percent)
                  : row.rkap && row.realisasi ? Math.round((row.realisasi / row.rkap) * 100) : null;

                let variant = 'ok';
                let label = 'Aman';

                if (percent !== null) {
                  if (percent > criticalTh || row.threshold_level === 'critical') {
                    variant = 'bd';
                    label = 'Melebihi';
                  } else if (percent >= warningTh || row.threshold_level === 'warning') {
                    variant = 'wn';
                    label = 'Waspada';
                  }
                }

                return (
                  <tr key={row.code || row.coa_code || idx}>
                    <td>{row.code || row.coa_code}</td>
                    <td>{row.name || row.coa_name}</td>
                    <td className="r">{formatNominal(row.rkap ?? row.rkap_amount)}</td>
                    <td className="r">{formatNominal(row.realisasi ?? row.realization_amount)}</td>
                    <td>
                      {percent !== null ? (
                        <Chip variant={variant}>{percent}% · {label}</Chip>
                      ) : (
                        <Chip variant="nt">—</Chip>
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
