import { useState, useEffect } from 'react';
import HeaderNotificationBell from '../layout/HeaderNotificationBell';

export default function PageHeader({ title, children, chips }) {
  // Pilihan perusahaan & periode tersimpan di localStorage agar konsisten antar navigasi
  const [company, setCompany] = useState(() => {
    return localStorage.getItem('rkap_selected_company') || 'CN';
  });

  const [period, setPeriod] = useState(() => {
    return localStorage.getItem('rkap_selected_period') || '2027';
  });

  useEffect(() => {
    localStorage.setItem('rkap_selected_company', company);
  }, [company]);

  useEffect(() => {
    localStorage.setItem('rkap_selected_period', period);
  }, [period]);

  return (
    <div className="hd">
      <h1>{title}</h1>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Pemilih Entitas Perusahaan bergaya Chip */}
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="chip-select"
          title="Pilih Entitas Perusahaan"
        >
          <option value="CN">PT Cipta Nirmala (CN)</option>
          <option value="CNH">Cipta Nirmala Husada (CNH)</option>
        </select>

        {/* Pemilih Periode bergaya Chip */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="chip-select"
          title="Pilih Tahun Anggaran"
        >
          <option value="2027">RKAP 2027</option>
          <option value="2026">RKAP 2026</option>
        </select>

        {/* Chip status default sesuai mockup */}
        <span className="chip nt">
          {company} · RKAP {period}
        </span>

        {/* Chip kustom tambahan bila ada */}
        {chips}

        {/* Aksi tombol atau kontrol tambahan halaman */}
        {children}

        {/* Lonceng notifikasi in-app kecil */}
        <HeaderNotificationBell />
      </div>
    </div>
  );
}
