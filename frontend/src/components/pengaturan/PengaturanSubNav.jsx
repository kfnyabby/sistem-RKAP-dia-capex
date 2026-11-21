import { NavLink } from 'react-router-dom';

export default function PengaturanSubNav() {
  const navItems = [
    { to: '/pengaturan/master', label: 'Master Data' },
    { to: '/pengaturan/pengguna', label: 'Pengguna & Penugasan Unit' },
    { to: '/pengaturan/periode', label: 'Periode & Pengajuan' },
    { to: '/pengaturan/audit', label: 'Jejak Audit' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid #E6E0D6',
        paddingBottom: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#5E6070', marginRight: '4px' }}>
        Menu Pengaturan:
      </span>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `chip ${isActive ? 'ok' : 'nt'}`}
          style={({ isActive }) => ({
            padding: '6px 14px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '99px',
            cursor: 'pointer',
            border: isActive ? '1px solid #14532D' : '1px solid transparent',
            transition: 'all 0.15s ease',
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
