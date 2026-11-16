import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Entry', path: '/entry' },
  { name: 'Proses', path: '/proses' },
  { name: 'Display', path: '/display' },
  { name: 'Laporan', path: '/laporan' },
  { name: 'Pengaturan', path: '/pengaturan' },
];

export default function Sidebar() {
  return (
    <nav className="sb" aria-label="Menu utama">
      <b>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        Sistem RKAP
      </b>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'on' : '')}
          >
            {item.name}
          </NavLink>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '12px' }}>
        <div style={{ fontSize: '11px', color: '#8A92B2', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>
          Mode Demo / Mockup
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '10px 12px' }}>
          <div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>DIA CAPEX</div>
          <div style={{ color: '#8A92B2', fontSize: '11px', marginTop: '2px' }}>PT CN & CNH · 2027</div>
        </div>
      </div>
    </nav>
  );
}
