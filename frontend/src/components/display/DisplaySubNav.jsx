import { Link, useLocation } from 'react-router-dom';

export default function DisplaySubNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const isBiaya = pathname === '/display/biaya' || pathname === '/display';
  const isInvestasi = pathname === '/display/investasi';
  const isPermintaan = pathname === '/display/permintaan';

  return (
    <div className="row" style={{ marginTop: 0, marginBottom: 0 }}>
      <Link
        to="/display/biaya"
        className={`chip ${isBiaya ? 'ok' : 'nt'}`}
        style={{ padding: '10px 16px', textDecoration: 'none', fontWeight: isBiaya ? 600 : 500 }}
      >
        Anggaran Biaya
      </Link>
      <Link
        to="/display/investasi"
        className={`chip ${isInvestasi ? 'ok' : 'nt'}`}
        style={{ padding: '10px 16px', textDecoration: 'none', fontWeight: isInvestasi ? 600 : 500 }}
      >
        Anggaran Investasi
      </Link>
      <Link
        to="/display/permintaan"
        className={`chip ${isPermintaan ? 'ok' : 'nt'}`}
        style={{ padding: '10px 16px', textDecoration: 'none', fontWeight: isPermintaan ? 600 : 500 }}
      >
        Permintaan
      </Link>
    </div>
  );
}
