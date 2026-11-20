import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api/axios';
import HeaderNotificationBell from '../layout/HeaderNotificationBell';

export default function PageHeader({
  title,
  children,
  chips,
  onCompanyChange,
  onPeriodChange,
}) {
  const { user } = useAuth();

  // 1. Daftar Perusahaan sah milik pengguna dari /api/auth/me (Akuntansi melihat semua)
  const userCompanies = useMemo(() => {
    if (user?.companies && user.companies.length > 0) {
      return user.companies;
    }
    // Fallback default sementara bila profil belum termuat
    return [{ company_id: 1, code: 'CN', name: 'PT Cipta Nirmala (CN)' }];
  }, [user]);

  // 2. Daftar Periode sah dari GET /api/periods
  const [periods, setPeriods] = useState([
    { id: 1, year: 2027, name: 'RKAP 2027' },
  ]);

  const [company, setCompany] = useState(() => {
    return localStorage.getItem('rkap_selected_company') || 'CN';
  });

  const [period, setPeriod] = useState(() => {
    return localStorage.getItem('rkap_selected_period') || '2027';
  });

  // Fetch daftar periode dari backend
  useEffect(() => {
    let isMounted = true;
    async function fetchPeriods() {
      try {
        const res = await api.get('/periods');
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (isMounted && list.length > 0) {
          setPeriods(list);
        }
      } catch (err) {
        // Fallback default aman bila backend belum menyajikan data
        console.warn('Gagal mengambil daftar periode:', err.message);
      }
    }
    fetchPeriods();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Validasi nilai tersimpan secara aman bila daftar perusahaan berubah
  useEffect(() => {
    if (userCompanies.length > 0) {
      const validCodes = userCompanies.map((c) => c.code);
      if (!validCodes.includes(company)) {
        const fallbackCompany = validCodes[0];
        localStorage.setItem('rkap_selected_company', fallbackCompany);
        window.dispatchEvent(
          new CustomEvent('rkap:context-change', {
            detail: { company: fallbackCompany, period },
          })
        );
      }
    }
  }, [userCompanies, company, period]);

  // 4. Validasi nilai tersimpan secara aman bila daftar periode berubah
  useEffect(() => {
    if (periods.length > 0) {
      const validYears = periods.map((p) => String(p.year));
      if (!validYears.includes(String(period))) {
        const fallbackPeriod = validYears[0];
        localStorage.setItem('rkap_selected_period', fallbackPeriod);
        window.dispatchEvent(
          new CustomEvent('rkap:context-change', {
            detail: { company, period: fallbackPeriod },
          })
        );
      }
    }
  }, [periods, period, company]);

  const activeCompany = useMemo(() => {
    if (userCompanies.length > 0) {
      const validCodes = userCompanies.map((c) => c.code);
      if (validCodes.includes(company)) return company;
      return validCodes[0];
    }
    return company;
  }, [userCompanies, company]);

  const activePeriod = useMemo(() => {
    if (periods.length > 0) {
      const validYears = periods.map((p) => String(p.year));
      if (validYears.includes(String(period))) return String(period);
      return String(periods[0].year);
    }
    return String(period);
  }, [periods, period]);

  const handleCompanySelect = useCallback(
    (newCompany) => {
      setCompany(newCompany);
      localStorage.setItem('rkap_selected_company', newCompany);
      window.dispatchEvent(
        new CustomEvent('rkap:context-change', {
          detail: { company: newCompany, period },
        })
      );
      if (onCompanyChange) onCompanyChange(newCompany);
    },
    [period, onCompanyChange]
  );

  const handlePeriodSelect = useCallback(
    (newPeriod) => {
      setPeriod(newPeriod);
      localStorage.setItem('rkap_selected_period', newPeriod);
      window.dispatchEvent(
        new CustomEvent('rkap:context-change', {
          detail: { company, period: newPeriod },
        })
      );
      if (onPeriodChange) onPeriodChange(newPeriod);
    },
    [company, onPeriodChange]
  );

  return (
    <div className="hd">
      <h1>{title}</h1>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Pemilih Entitas Perusahaan Sah */}
        <select
          value={activeCompany}
          onChange={(e) => handleCompanySelect(e.target.value)}
          className="chip-select"
          title="Pilih Entitas Perusahaan"
        >
          {userCompanies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name || c.code}
            </option>
          ))}
        </select>

        {/* Pemilih Periode Sah */}
        <select
          value={activePeriod}
          onChange={(e) => handlePeriodSelect(e.target.value)}
          className="chip-select"
          title="Pilih Tahun Anggaran"
        >
          {periods.map((p) => (
            <option key={p.id || p.year} value={String(p.year)}>
              {p.name || `RKAP ${p.year}`}
            </option>
          ))}
        </select>

        {/* Chip status ringkas sesuai mockup */}
        <span className="chip nt">
          {activeCompany} · RKAP {activePeriod}
        </span>

        {/* Chip kustom tambahan */}
        {chips}

        {/* Aksi tombol atau kontrol tambahan */}
        {children}

        {/* Lonceng notifikasi in-app kecil */}
        <HeaderNotificationBell />
      </div>
    </div>
  );
}
