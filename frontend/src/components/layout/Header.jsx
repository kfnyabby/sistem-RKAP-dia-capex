import { useState } from 'react';
import { ChevronDown, UserCircle2, Building2, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState('CN');
  const [selectedPeriod, setSelectedPeriod] = useState('2027');
  const [showDropdown, setShowDropdown] = useState(false);

  const formatRole = (role) => {
    switch ((role || '').toLowerCase()) {
      case 'akuntansi':
        return 'Akuntansi';
      case 'manager':
        return 'Manager';
      case 'pic':
        return 'PIC Unit';
      default:
        return role;
    }
  };

  const userCompanies =
    user?.companies && user.companies.length > 0
      ? user.companies
      : [
          { company_id: 1, code: 'CN', name: 'PT Cipta Nirmala (CN)' },
          { company_id: 2, code: 'CNH', name: 'Cipta Nirmala Husada (CNH)' },
        ];

  return (
    <header className="h-16 bg-white border-b border-card-border px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
      {/* Quick Selectors & Brand Chips */}
      <div className="flex items-center gap-3">
        {/* Entitas */}
        <div className="flex items-center gap-2 bg-canvas px-2.5 py-1.5 rounded-md border border-card-border text-xs text-text-muted">
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Entitas:</span>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-transparent font-semibold text-text-main outline-none cursor-pointer border-0 p-0 min-h-0"
          >
            {userCompanies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Periode */}
        <div className="flex items-center gap-2 bg-canvas px-2.5 py-1.5 rounded-md border border-card-border text-xs text-text-muted">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Tahun:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent font-semibold text-text-main outline-none cursor-pointer border-0 p-0 min-h-0"
          >
            <option value="2027">RKAP 2027</option>
            <option value="2026">RKAP 2026</option>
          </select>
        </div>

        {/* Chips sesuai mockup 01-dashboard.html */}
        <span className="chip nt hidden sm:inline-block">
          {selectedCompany} · RKAP {selectedPeriod}
        </span>
      </div>

      {/* Right: User Profile & Logout */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 cursor-pointer select-none p-1.5 rounded-lg hover:bg-canvas transition border border-transparent hover:border-card-border"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {user?.name ? (
                user.name.slice(0, 2).toUpperCase()
              ) : (
                <UserCircle2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-text-main leading-tight">
                {user?.name || 'Pengguna'}
              </div>
              <div className="text-[11px] text-text-muted font-medium">
                {formatRole(user?.role)}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          </button>

          {/* Profile Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-card-border rounded-xl shadow-lg p-2 z-50">
              <div className="px-3 py-2 border-b border-card-border/60">
                <div className="text-xs font-semibold text-text-main">{user?.name}</div>
                <div className="text-[11px] text-text-muted truncate">{user?.email}</div>
                <div className="mt-1">
                  <span className="chip nt text-[10px] py-0.5 px-2 font-semibold">
                    {formatRole(user?.role)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
