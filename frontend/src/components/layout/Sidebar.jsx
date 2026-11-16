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
  Layers,
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
  { name: 'Pengaturan', path: '/pengaturan', icon: Settings, roles: ['akuntansi'] }, // Khusus Akuntansi!
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const userRole = (user?.role || 'pic').toLowerCase();

  // Filter menu yang diizinkan untuk peran pengguna saat ini
  const visibleMenuItems = allMenuItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-[#23174f] text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-purple-900/40">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-purple-800/40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-purple-950/40">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-white leading-tight">DIA CAPEX</h1>
          <p className="text-xs text-purple-300">Sistem RKAP Terintegrasi</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-purple-400 uppercase">
          Menu Utama
        </div>
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600/90 text-white shadow-md shadow-purple-900/50 font-semibold'
                    : 'text-purple-200 hover:bg-purple-800/40 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-3 border-t border-purple-800/40">
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
