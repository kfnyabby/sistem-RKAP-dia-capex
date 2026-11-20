import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard Akuntansi"
        chips={<Chip variant="wn">Data contoh</Chip>}
      />

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
            <Link to="/laporan/rekap">
              <span>Laporan Rekap Gabungan</span>
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
        <div className="card">
          <div className="lb">RKAP Biaya</div>
          <div className="vl">Rp 2,50 M</div>
        </div>
        <div className="card">
          <div className="lb">RKAP Investasi</div>
          <div className="vl">Rp 1,80 M</div>
        </div>
        <div className="card">
          <div className="lb">Pemakaian anggaran biaya</div>
          <div className="vl">58%</div>
          <div className="lb" style={{ marginTop: '2px' }}>Rp 1,45 M dari Rp 2,50 M s.d. Okt</div>
          <div style={{ height: '6px', borderRadius: '3px', background: '#ECE8F5', marginTop: '10px' }}>
            <i style={{ display: 'block', height: '6px', width: '58%', borderRadius: '3px', background: '#3D4E9C' }} />
          </div>
        </div>
        <div className="card">
          <div className="lb">Pemakaian anggaran investasi</div>
          <div className="vl">34%</div>
          <div className="lb" style={{ marginTop: '2px' }}>Rp 0,61 M dari Rp 1,80 M s.d. Okt</div>
          <div style={{ height: '6px', borderRadius: '3px', background: '#ECE8F5', marginTop: '10px' }}>
            <i style={{ display: 'block', height: '6px', width: '34%', borderRadius: '3px', background: '#3D4E9C' }} />
          </div>
        </div>
      </div>

      {/* Progres Pengisian Unit */}
      <div className="card">
        <h2>Progres pengisian unit</h2>
        <div style={{ display: 'flex', height: '34px', borderRadius: '8px', overflow: 'hidden' }}>
          <i style={{ flex: 20, background: '#B9B4C9', color: '#1F2233', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', padding: '0 6px' }}>
            Draft · 20
          </i>
          <i style={{ flex: 8, background: '#E0A030', color: '#2B1B00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', padding: '0 6px' }}>
            Diajukan · 8
          </i>
          <i style={{ flex: 15, background: '#2F7F5B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', padding: '0 6px' }}>
            Disetujui · 15
          </i>
          <i style={{ flex: 5, background: '#232B4A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'normal', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', padding: '0 6px' }}>
            Final · 5
          </i>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
          Draft: sedang diisi unit · Diajukan: menunggu Manager · Disetujui: lolos Manager, menunggu finalisasi · Final: dikunci Akuntansi
        </p>
        <p style={{ margin: '6px 0 0' }}>
          <span className="chip bd">2 unit melewati deadline</span>
        </p>
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
            <tr>
              <td>5.8.3</td>
              <td>Biaya Cetak &amp; Fotocopy</td>
              <td className="r">8.500.000</td>
              <td className="r">5.200.000</td>
              <td><span className="chip ok">61% · Aman</span></td>
            </tr>
            <tr>
              <td>5.2.4</td>
              <td>Biaya Pemakaian Suku Cadang Medis</td>
              <td className="r">640.000.000</td>
              <td className="r">563.000.000</td>
              <td><span className="chip wn">88% · Waspada</span></td>
            </tr>
            <tr>
              <td>5.8.2</td>
              <td>Biaya Pemakaian Alat Perkantoran</td>
              <td className="r">120.000.000</td>
              <td className="r">126.000.000</td>
              <td><span className="chip bd">105% · Melebihi</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
