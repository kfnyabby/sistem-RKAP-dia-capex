import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LogOut } from 'lucide-react';

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = (user?.role || 'pic').toLowerCase();

  const isAkuntansi = role === 'akuntansi';
  const canAccessLaptopPc = role === 'akuntansi' || role === 'manager';

  const formatRole = (r) => {
    switch (r) {
      case 'akuntansi':
        return 'Akuntansi';
      case 'manager':
        return 'Manager';
      case 'pic':
        return 'PIC Unit';
      default:
        return r;
    }
  };

  return (
    <div className="app">
      <nav className="sb" aria-label="Menu utama">
        <b>Sistem RKAP</b>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'on' : '')}
        >
          Dashboard
        </NavLink>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink
            to="/entry/biaya"
            className={() => (location.pathname.startsWith('/entry') ? 'on' : '')}
          >
            Entry
          </NavLink>
          {location.pathname.startsWith('/entry') && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingLeft: '12px',
                marginTop: '2px',
              }}
            >
              <NavLink
                to="/entry/biaya"
                className={({ isActive }) => (isActive ? 'on' : '')}
                style={{ fontSize: '13px', padding: '6px 10px' }}
              >
                · Anggaran Biaya
              </NavLink>
              <NavLink
                to="/entry/investasi"
                className={({ isActive }) => (isActive ? 'on' : '')}
                style={{ fontSize: '13px', padding: '6px 10px' }}
              >
                · Anggaran Investasi
              </NavLink>
              {canAccessLaptopPc && (
                <NavLink
                  to="/entry/laptop-pc"
                  className={({ isActive }) => (isActive ? 'on' : '')}
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                >
                  · Laptop &amp; PC
                </NavLink>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink
            to="/proses/validasi"
            className={() => (location.pathname.startsWith('/proses') ? 'on' : '')}
          >
            Proses
          </NavLink>
          {location.pathname.startsWith('/proses') && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingLeft: '12px',
                marginTop: '2px',
              }}
            >
              {(isAkuntansi || role === 'manager') && (
                <NavLink
                  to="/proses/validasi"
                  className={({ isActive }) => (isActive ? 'on' : '')}
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                >
                  · Antrian Validasi
                </NavLink>
              )}
              {isAkuntansi && (
                <>
                  <NavLink
                    to="/proses/realisasi"
                    className={({ isActive }) => (isActive ? 'on' : '')}
                    style={{ fontSize: '13px', padding: '6px 10px' }}
                  >
                    · Input Realisasi
                  </NavLink>
                  <NavLink
                    to="/proses/penentuan-coa"
                    className={({ isActive }) => (isActive ? 'on' : '')}
                    style={{ fontSize: '13px', padding: '6px 10px' }}
                  >
                    · Penentuan COA
                  </NavLink>
                </>
              )}
            </div>
          )}
        </div>

        <NavLink
          to="/display"
          className={() => (location.pathname.startsWith('/display') ? 'on' : '')}
        >
          Display
        </NavLink>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <NavLink
            to="/laporan/rekap"
            className={() => (location.pathname.startsWith('/laporan') ? 'on' : '')}
          >
            Laporan
          </NavLink>
          {location.pathname.startsWith('/laporan') && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingLeft: '12px',
                marginTop: '2px',
              }}
            >
              <NavLink
                to="/laporan/rekap"
                className={({ isActive }) => (isActive ? 'on' : '')}
                style={{ fontSize: '13px', padding: '6px 10px' }}
              >
                · Rekap per Unit
              </NavLink>
              <NavLink
                to="/laporan/matriks"
                className={({ isActive }) => (isActive ? 'on' : '')}
                style={{ fontSize: '13px', padding: '6px 10px' }}
              >
                · Matriks Unit × COA
              </NavLink>
            </div>
          )}
        </div>

        {isAkuntansi && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <NavLink
              to="/pengaturan/master"
              className={() => (location.pathname.startsWith('/pengaturan') ? 'on' : '')}
            >
              Pengaturan
            </NavLink>
            {location.pathname.startsWith('/pengaturan') && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  paddingLeft: '12px',
                  marginTop: '2px',
                }}
              >
                <NavLink
                  to="/pengaturan/master"
                  className={({ isActive }) => (isActive ? 'on' : '')}
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                >
                  · Master Data
                </NavLink>
                <NavLink
                  to="/pengaturan/pengguna"
                  className={({ isActive }) => (isActive ? 'on' : '')}
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                >
                  · Pengguna &amp; Unit
                </NavLink>
                <NavLink
                  to="/pengaturan/periode"
                  className={({ isActive }) => (isActive ? 'on' : '')}
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                >
                  · Periode
                </NavLink>
                <NavLink
                  to="/pengaturan/audit"
                  className={({ isActive }) => (isActive ? 'on' : '')}
                  style={{ fontSize: '13px', padding: '6px 10px' }}
                >
                  · Jejak Audit
                </NavLink>
              </div>
            )}
          </div>
        )}

        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-user-name" title={user?.name}>
              {user?.name || 'Pengguna'}
            </div>
            <div style={{ color: '#A0A6C7', fontSize: '11px', marginTop: '2px' }}>
              {formatRole(role)}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="sb-logout-btn"
            title="Keluar dari sesi"
          >
            <LogOut size={13} />
            <span>Keluar</span>
          </button>
        </div>
      </nav>

      <main className="mn">
        <Outlet />
      </main>
    </div>
  );
}
