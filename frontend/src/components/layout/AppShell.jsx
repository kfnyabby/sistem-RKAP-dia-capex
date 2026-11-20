import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { LogOut } from 'lucide-react';

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = (user?.role || 'pic').toLowerCase();

  const isAkuntansi = role === 'akuntansi';

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

        <NavLink
          to="/entry/biaya"
          className={() => (location.pathname.startsWith('/entry') ? 'on' : '')}
        >
          Entry
        </NavLink>

        <NavLink
          to="/proses/validasi"
          className={() => (location.pathname.startsWith('/proses') ? 'on' : '')}
        >
          Proses
        </NavLink>

        <NavLink
          to="/display"
          className={() => (location.pathname.startsWith('/display') ? 'on' : '')}
        >
          Display
        </NavLink>

        <NavLink
          to="/laporan/rekap"
          className={() => (location.pathname.startsWith('/laporan') ? 'on' : '')}
        >
          Laporan
        </NavLink>

        {isAkuntansi && (
          <NavLink
            to="/pengaturan/master"
            className={() => (location.pathname.startsWith('/pengaturan') ? 'on' : '')}
          >
            Pengaturan
          </NavLink>
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
