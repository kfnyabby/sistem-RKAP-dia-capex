import { useState } from 'react';
import { Bell, ChevronDown, UserCircle2, Building2, Calendar } from 'lucide-react';

export default function Header() {
  const [selectedCompany, setSelectedCompany] = useState('CN');
  const [selectedPeriod, setSelectedPeriod] = useState('2027');

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-xs">
      {/* Left: Quick Selectors */}
      <div className="flex items-center gap-4">
        {/* Company Selector */}
        <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
          <Building2 className="w-4 h-4 text-purple-700 shrink-0" />
          <span className="text-slate-400">Entitas:</span>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
          >
            <option value="CN">PT Cipta Nirmala (CN)</option>
            <option value="CNH">Cipta Nirmala Husada (CNH)</option>
          </select>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
          <Calendar className="w-4 h-4 text-purple-700 shrink-0" />
          <span className="text-slate-400">Tahun:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
          >
            <option value="2027">RKAP 2027</option>
            <option value="2026">RKAP 2026</option>
          </select>
        </div>
      </div>

      {/* Right: Notification & Profile */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <button
          type="button"
          title="Notifikasi"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile */}
        <div className="flex items-center gap-3 cursor-pointer select-none">
          <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
            <UserCircle2 className="w-5 h-5" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              Admin Akuntansi
            </div>
            <div className="text-[11px] text-slate-500">Super Admin (CN & CNH)</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
