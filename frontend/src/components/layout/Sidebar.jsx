import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  LayoutDashboard,
  FileEdit,
  Workflow,
  Eye,
  FileSpreadsheet,
  Settings,
  LogOut,
} from 'lucide-react';

const allMenuItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['pic', 'manager', 'akuntansi'],
  },
  { name: 'Entry', path: '/entry', icon: FileEdit, roles: ['pic', 'manager', 'akuntansi'] },
  { name: 'Proses', path: '/proses', icon: Workflow, roles: ['pic', 'manager', 'akuntansi'] },
  { name: 'Display', path: '/display', icon: Eye, roles: ['pic', 'manager', 'akuntansi'] },
  {
    name: 'Laporan',
    path: '/laporan',
    icon: FileSpreadsheet,
    roles: ['pic', 'manager', 'akuntansi'],
  },
  { name: 'Pengaturan', path: '/pengaturan', icon: Settings, roles: ['akuntansi'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const userRole = (user?.role || 'pic').toLowerCase();

  const visibleMenuItems = allMenuItems.filter((item) => item.roles.includes(userRole));

  return (
    <nav
      className="w-[208px] bg-sidebar text-sidebar-text p-5 flex flex-col gap-1 shrink-0 min-h-screen select-none"
      aria-label="Menu utama"
    >
      {/* Brand Title sesuai mockup .sb b */}
      <b className="text-white text-[15px] px-2.5 pb-4 block tracking-tight">Sistem RKAP</b>

      {/* Navigasi Utama */}
      <div className="flex-1 flex flex-col gap-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 p-2.5 rounded-[6px] text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-white font-medium'
                    : 'text-sidebar-text hover:bg-sidebar-active/50 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Tombol Keluar */}
      <div className="pt-4 border-t border-sidebar-active/40">
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-[6px] text-sm text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </nav>
  );
}
