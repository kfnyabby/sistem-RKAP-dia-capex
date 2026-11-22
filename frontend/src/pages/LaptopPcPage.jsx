import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import investmentApi from '../api/investment.api';
import budgetApi from '../api/budget.api';
import { masterApi } from '../api/master.api';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import Banner from '../components/common/Banner';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Agu' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Okt' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Des' },
];

export default function LaptopPcPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State Filter
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedPriorityId, setSelectedPriorityId] = useState('');
  const [selectedPeriodYear, setSelectedPeriodYear] = useState('2027');

  // 1. Otorisasi Peran: Hanya Akuntansi & Manager
  const isAuthorized = user?.role === 'akuntansi' || user?.role === 'manager';

  // 2. Ambil Daftar Periode
  const { data: periodsData = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const res = await budgetApi.getPeriods();
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: isAuthorized,
  });

  const selectedPeriod = useMemo(() => {
    if (!periodsData || periodsData.length === 0) return null;
    return (
      periodsData.find((p) => String(p.year) === String(selectedPeriodYear)) ||
      periodsData[0]
    );
  }, [periodsData, selectedPeriodYear]);

  // 3. Ambil Daftar Unit untuk Filter
  const { data: unitsData = [] } = useQuery({
    queryKey: ['units', user?.id],
    queryFn: async () => {
      if (user?.role === 'akuntansi') {
        const res = await masterApi.getUnits({ is_active: true });
        return Array.isArray(res) ? res : (res?.data || []);
      }
      return user?.units || [];
    },
    enabled: isAuthorized,
  });

  // 4. Ambil Daftar Prioritas
  const { data: prioritiesData = [] } = useQuery({
    queryKey: ['priorities'],
    queryFn: async () => {
      const res = await investmentApi.getPriorities();
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: isAuthorized,
  });

  // 5. Ambil Baris Usulan Laptop & PC Lintas Unit
  const {
    data: crossUnitData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      'laptopPcCrossUnit',
      selectedPeriod?.id,
      selectedUnitId,
      selectedPriorityId,
    ],
    queryFn: async () => {
      const params = { is_laptop_pc: true };
      if (selectedPeriod?.id) params.period_id = selectedPeriod.id;
      if (selectedUnitId) params.unit_id = selectedUnitId;
      if (selectedPriorityId) params.priority_id = selectedPriorityId;
      return await investmentApi.listCrossUnitLines(params);
    },
    enabled: isAuthorized && !!selectedPeriod?.id,
  });

  const lines = useMemo(() => {
    return crossUnitData?.data || [];
  }, [crossUnitData]);

  // Kalkulasi Ringkasan
  const totalAmount = useMemo(() => {
    return lines.reduce((acc, l) => acc + (parseInt(l.amount, 10) || 0), 0);
  }, [lines]);

  const totalDepreciation = useMemo(() => {
    return lines.reduce((acc, l) => acc + (parseInt(l.depreciation_amount, 10) || 0), 0);
  }, [lines]);

  const distinctUnitsCount = useMemo(() => {
    const s = new Set();
    lines.forEach((l) => {
      if (l.unit_id) s.add(l.unit_id);
      else if (l.unit_name) s.add(l.unit_name);
    });
    return s.size;
  }, [lines]);

  // Fungsi Export Data ke Excel (CSV UTF-8 dengan BOM)
  const handleExportExcel = () => {
    if (lines.length === 0) {
      alert('Tidak ada data usulan Laptop & PC untuk diekspor.');
      return;
    }

    const headers = [
      'No',
      'Strategic Action',
      'Nama Barang',
      'Qty',
      'Harga Satuan (Rp)',
      'Jumlah (Rp)',
      'Unit Kerja',
      'Jadwal Bulan',
      'Prioritas',
      'COA',
      'Masa Susut (Bln)',
      `Penyusutan ${selectedPeriodYear} (Rp)`,
    ];

    const rows = lines.map((l, idx) => {
      const monthLabel =
        MONTHS.find((m) => m.value === l.plan_month)?.label || `Bln ${l.plan_month}`;
      return [
        idx + 1,
        `"${(l.strategic_action || '').replace(/"/g, '""')}"`,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        l.qty,
        l.price,
        l.amount,
        `"${(l.unit_name || '').replace(/"/g, '""')}"`,
        `"${monthLabel}"`,
        `"${l.priority_name || 'Keep Operation'}"`,
        `"${l.coa_code || ''} ${l.coa_name || ''}"`,
        l.useful_life_months || 0,
        l.depreciation_amount || 0,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-laptop-pc-${selectedPeriodYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Jika Pengguna Bukan Akuntansi atau Manager
  if (!isAuthorized) {
    return (
      <>
        <PageHeader title="Entry · Investasi: Laptop & PC" />
        <Banner variant="bd">
          <b>Akses Ditolak:</b> Halaman telaah konsolidasi pengadaan Laptop &amp; PC lintas unit hanya dapat diakses oleh peran <b>Akuntansi</b> dan <b>Manager</b>.
        </Banner>
        <div style={{ marginTop: '16px' }}>
          <Link to="/entry/investasi" className="btn">
            &larr; Kembali ke Entry Investasi
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* 1. Header F0 */}
      <PageHeader
        title="Entry · Investasi: Laptop & PC"
        chips={
          <>
            <Chip variant="nt">Jenis: PC/Laptop</Chip>
            <Chip variant="ok">Konsolidasi Terpusat</Chip>
          </>
        }
      />

      {/* 2. Kartu Penjelasan Sesuai Mockup 15-laptop-pc */}
      <div
        className="card"
        style={{
          background: '#ECE8F5',
          borderColor: '#CFC8E6',
          color: '#3A3F63',
          lineHeight: '1.5',
        }}
      >
        Bagian dari Anggaran Investasi. Kolom sama dengan sheet unit; tampilan ini menyaring jenis Laptop/PC dari semua unit agar mudah direkap. Item baru dibuat dari Entry Investasi.
      </div>

      {/* 3. Baris Filter & Kontrol Aksi */}
      <div className="row" style={{ alignItems: 'flex-end', gap: '12px' }}>
        {/* Filter Periode */}
        <label htmlFor="lp-period">
          Periode
          <select
            id="lp-period"
            value={selectedPeriodYear}
            onChange={(e) => setSelectedPeriodYear(e.target.value)}
          >
            {periodsData.map((p) => (
              <option key={p.id} value={String(p.year)}>
                {p.name || `RKAP ${p.year}`}
              </option>
            ))}
          </select>
        </label>

        {/* Filter Unit */}
        <label htmlFor="lu">
          Unit
          <select
            id="lu"
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
          >
            <option value="">Semua unit</option>
            {unitsData.map((u) => {
              const uid = String(u.unit_id || u.id);
              return (
                <option key={uid} value={uid}>
                  [{u.code || u.unit_code}] {u.name || u.unit_name}
                </option>
              );
            })}
          </select>
        </label>

        {/* Filter Prioritas */}
        <label htmlFor="lp">
          Prioritas
          <select
            id="lp"
            value={selectedPriorityId}
            onChange={(e) => setSelectedPriorityId(e.target.value)}
          >
            <option value="">Semua</option>
            {prioritiesData.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {/* Tombol Aksi Kanan */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn b2"
            onClick={handleExportExcel}
            disabled={lines.length === 0}
          >
            Export Excel
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/entry/investasi')}
          >
            Tambah laptop atau PC
          </button>
        </div>
      </div>

      {/* 4. Tabel Rekapitulasi Sesuai Mockup */}
      <div className="card sc">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>No.</th>
              <th>Strategic action</th>
              <th>Nama barang</th>
              <th className="r">Qty</th>
              <th className="r">Harga satuan</th>
              <th className="r">Jumlah</th>
              <th>Unit</th>
              <th>Jadwal</th>
              <th>Prioritas</th>
              <th>COA · Susut</th>
              <th className="r">Penyusutan {selectedPeriodYear}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                  Memuat rekapitulasi usulan Laptop &amp; PC lintas unit...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '32px', color: '#8A1F1B' }}>
                  Gagal memuat data: {error?.message || 'Galat sistem'}
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                  Tidak ada usulan pengadaan Laptop atau PC pada periode {selectedPeriodYear} untuk kriteria filter yang dipilih.
                </td>
              </tr>
            ) : (
              lines.map((line, idx) => {
                const monthLabel =
                  MONTHS.find((m) => m.value === line.plan_month)?.label || `Bln ${line.plan_month}`;

                return (
                  <tr key={line.id}>
                    <td>{idx + 1}</td>
                    <td>{line.strategic_action || '—'}</td>
                    <td>
                      <b>{line.name}</b>
                      {line.specification && (
                        <div className="lb">Spek: {line.specification}</div>
                      )}
                    </td>
                    <td className="r">{line.qty}</td>
                    <td className="r">{formatRupiah(line.price)}</td>
                    <td className="r font-bold">{formatRupiah(line.amount)}</td>
                    <td>
                      <b>{line.unit_name}</b>
                      {line.unit_code && <div className="lb">[{line.unit_code}]</div>}
                    </td>
                    <td>{monthLabel}</td>
                    <td>
                      <span className="chip nt">{line.priority_name || 'Keep Operation'}</span>
                    </td>
                    <td>
                      {line.coa_code} {line.coa_name} · {line.useful_life_months} bln
                    </td>
                    <td className="r" style={{ color: '#14532D', fontWeight: 600 }}>
                      {formatRupiah(line.depreciation_amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Baris Ringkasan Bawah Sesuai Mockup */}
      <div style={{ marginTop: '12px', fontSize: '14px' }}>
        <b>Total Laptop &amp; PC: Rp {formatRupiah(totalAmount)}</b>{' '}
        <span className="lb">· Penyusutan {selectedPeriodYear}: Rp {formatRupiah(totalDepreciation)}</span>{' '}
        <span className="lb">· {lines.length} baris · {distinctUnitsCount} unit</span>
      </div>
    </>
  );
}
