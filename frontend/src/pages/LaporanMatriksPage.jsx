import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import reportApi from '../api/report.api';
import budgetApi from '../api/budget.api';
import masterApi from '../api/master.api';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';

function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('id-ID').format(val);
}

export default function LaporanMatriksPage() {
  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL'); // 'ALL' | 'CN' | 'CNH'
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [hideEmpty, setHideEmpty] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Load Periods
  const periodsQuery = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const data = await budgetApi.getPeriods();
      return data || [];
    },
  });

  const periods = periodsQuery.data || [];
  const activeYear = selectedYear || (periods.length > 0 ? String(periods[0].year) : '2027');

  // 2. Load Kelompok COA (coa_groups)
  const coaGroupsQuery = useQuery({
    queryKey: ['coa-groups'],
    queryFn: async () => {
      const data = await masterApi.getCoaGroups();
      return data || [];
    },
  });

  const coaGroups = coaGroupsQuery.data || [];

  // 3. Load Matrix Report Data
  const matrixQuery = useQuery({
    queryKey: ['report-matrix', activeYear, companyFilter, selectedGroupId, hideEmpty],
    queryFn: async () => {
      if (!activeYear) return null;
      const params = {
        period_year: activeYear,
        hide_empty: hideEmpty,
      };
      if (companyFilter === 'CN') params.company_ids = '1';
      if (companyFilter === 'CNH') params.company_ids = '2';
      if (selectedGroupId) params.group_ids = selectedGroupId;

      const data = await reportApi.getMatrix(params);
      return data || null;
    },
    enabled: Boolean(activeYear),
  });

  const matrixData = matrixQuery.data;

  // Filter kelompok kolom jika pengguna memilih filter kelompok COA lokal
  const columns = useMemo(() => {
    const rawCols = matrixData?.columns || [];
    if (!selectedGroupId) return rawCols;
    return rawCols.filter((col) => String(col.group_id) === String(selectedGroupId));
  }, [matrixData?.columns, selectedGroupId]);

  const companies = useMemo(() => matrixData?.companies || [], [matrixData?.companies]);
  const grandTotal = matrixData?.grand_total || { values: {}, group_totals: {}, total: 0 };

  // Handler Export Excel Template ERP
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = {
        period_year: activeYear,
        hide_empty: hideEmpty,
      };
      if (companyFilter === 'CN') params.company_ids = '1';
      if (companyFilter === 'CNH') params.company_ids = '2';
      if (selectedGroupId) params.group_ids = selectedGroupId;

      const res = await reportApi.exportExcel('matrix', params);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Matriks_Unit_x_COA_${activeYear}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengekspor laporan matriks ke Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <style>{`
        .mx th, .mx td { white-space: nowrap; border: 1px solid #E6E0D6; padding: 8px 10px; }
        .mx .h1 { background: #F3F1EA; color: #1F2233; text-align: left; }
        .mx .cat { background: #F6E7B4; color: #4A3500; text-align: center; font-weight: 700; }
        .mx .cn { background: #ECE8F5; color: #3A3F63; text-align: center; font-weight: 500; font-size: 12px; white-space: normal; min-width: 92px; }
        .mx .cd { background: #E6E0D6; color: #3A3F63; text-align: center; font-size: 12px; }
        .mx .tt2 { background: #232B4A; color: #fff; text-align: center; }
        .mx td.n { text-align: right; }
        .mx td.z { color: #9A97A8; }
        .mx td.tot { background: #F3F1EA; text-align: right; font-weight: 600; }
        .mx td.tt { background: #232B4A; color: #fff; text-align: right; font-weight: 700; }
        .mx tr.g td.gl { background: #2F7F5B; color: #fff; font-weight: 700; }
        .mx tr.g td.gb { background: #E4DDF3; text-align: right; font-weight: 700; }
        .mx tr.g td.gt { background: #D3C8EC; }
        .mx tr.st td { background: #ECE8F5; font-weight: 700; }
        .mx tr.st td.tt, .mx tr.gr td.tt { background: #232B4A; }
        .mx tr.gr td { background: #3D4E9C; color: #fff; font-weight: 700; }
        .mx tr.gr td.tot { background: #3D4E9C; color: #fff; }
        .mx tr.st td.tot { background: #E4DDF3; }
        .mx .s1 { position: sticky; left: 0; z-index: 2; background: #fff; min-width: 64px; }
        .mx .s2 { position: sticky; left: 64px; z-index: 2; background: #fff; min-width: 250px; }
        .mx tr.g td.s1, .mx tr.g td.s2 { background: #2F7F5B; }
        .mx tr.st td.s1, .mx tr.st td.s2 { background: #ECE8F5; }
        .mx tr.gr td.s1, .mx tr.gr td.s2 { background: #3D4E9C; }
        .mx th.s1, .mx th.s2 { z-index: 3; background: #F3F1EA; }
        .mx td.gl.s1, .mx td.gl.s2 { z-index: 2; }
      `}</style>

      <PageHeader
        title="Laporan · Matriks Unit × COA"
        chips={<Chip variant="nt">RKAP {activeYear}</Chip>}
      />

      {/* Sub-navigasi Tab Antara Rekap dan Matriks */}
      <div className="row" style={{ marginBottom: 12 }}>
        <Link
          to="/laporan/rekap"
          className="chip nt"
          style={{ padding: '10px 16px', textDecoration: 'none' }}
        >
          Rekap per unit
        </Link>
        <Link
          to="/laporan/matriks"
          className="chip ok"
          style={{ padding: '10px 16px', textDecoration: 'none', fontWeight: 600 }}
        >
          Matriks unit × COA (format ERP)
        </Link>
      </div>

      {/* Baris Filter Mockup */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div className="row">
          <label htmlFor="fp" style={{ minWidth: 150 }}>
            Perusahaan
            <select
              id="fp"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="ALL">CN dan CNH</option>
              <option value="CN">CN</option>
              <option value="CNH">CNH</option>
            </select>
          </label>

          <label htmlFor="fy" style={{ minWidth: 120 }}>
            Periode
            <select
              id="fy"
              value={activeYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {periods.map((p) => (
                <option key={p.id} value={String(p.year)}>
                  TH {p.year}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="fk" style={{ flex: 1, minWidth: 200 }}>
            Kelompok COA
            <select
              id="fk"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">Semua kelompok</option>
              {coaGroups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer', height: '44px' }}>
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
              style={{ width: 16, height: 16, minHeight: 'auto' }}
            />
            <span style={{ fontSize: 13, color: '#1F2233' }}>Sembunyikan COA kosong</span>
          </label>

          <button
            type="button"
            className="btn b2"
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{ minHeight: '44px' }}
          >
            {isExporting ? 'Mengekspor...' : 'Export Excel (format template ERP)'}
          </button>
        </div>
      </div>

      {/* Banner Informasi ERP Format */}
      <div
        className="card"
        style={{
          background: '#DDF0E6',
          borderColor: '#B7DCC8',
          color: '#14532D',
          marginBottom: 16,
        }}
      >
        <b>Template Biaya RKAP · Periode: TH {activeYear} · ERP Version</b> · Satu baris per unit, satu kolom per COA, dikelompokkan per instalasi dengan subtotal. Geser ke kanan untuk kelompok COA berikutnya.
      </div>

      {/* Tabel Matriks Unit x COA (.mx) */}
      <div className="card sc" style={{ padding: 0 }}>
        {matrixQuery.isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Memuat matriks anggaran unit × COA format ERP...
          </div>
        ) : matrixQuery.isError ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#8A1F1B', fontSize: 13 }}>
            Gagal memuat matriks: {matrixQuery.error?.response?.data?.message || matrixQuery.error?.message}
          </div>
        ) : columns.length === 0 || companies.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Belum ada data anggaran biaya untuk parameter filter yang dipilih pada periode TH {activeYear}.
          </div>
        ) : (
          <table className="mx" style={{ width: 'max-content', minWidth: '100%' }}>
            <thead>
              {/* Header Baris 1: Company, Unit, Klasifikasi, Kelompok COA (.cat), TOTAL BIAYA */}
              <tr>
                <th className="h1 s1" rowSpan={3}>Company</th>
                <th className="h1 s2" rowSpan={3}>Unit (analytic group)</th>
                <th className="h1" rowSpan={3}>Klasifikasi</th>
                {columns.map((grp) => (
                  <th key={grp.group_id || grp.group} className="cat" colSpan={grp.coas.length + 1}>
                    {grp.group}
                  </th>
                ))}
                <th className="tt2" rowSpan={3}>TOTAL BIAYA</th>
              </tr>

              {/* Header Baris 2: Nama COA (.cn), Subtotal Kelompok (.tt2) */}
              <tr>
                {columns.map((grp) => (
                  <GroupSubHeaders key={`sub_${grp.group_id || grp.group}`} grp={grp} />
                ))}
              </tr>

              {/* Header Baris 3: Kode COA (.cd) */}
              <tr>
                {columns.map((grp) => (
                  <GroupCodeHeaders key={`cd_${grp.group_id || grp.group}`} grp={grp} />
                ))}
              </tr>
            </thead>

            <tbody>
              {companies.map((comp) => (
                <CompanyMatrixRows key={comp.code} comp={comp} columns={columns} />
              ))}

              {/* Baris Grand Total Gabungan CN + CNH (.gr) */}
              <tr className="gr">
                <td className="s1" colSpan={1}></td>
                <td className="s2">TOTAL CN + CNH</td>
                <td></td>
                {columns.map((grp) => (
                  <GroupGrandTotalCells key={`gt_${grp.group_id || grp.group}`} grp={grp} grandTotal={grandTotal} />
                ))}
                <td className="tt">Rp {formatRupiah(grandTotal.total || 0)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 13, color: '#5E6070' }}>
        Kelompok COA mengikuti Jenis COA di master data. Klasifikasi unit menjadi atribut unit kerja.
      </p>
    </>
  );
}

function GroupSubHeaders({ grp }) {
  return (
    <>
      {grp.coas.map((coa) => (
        <th key={coa.code} className="cn">
          {coa.name}
        </th>
      ))}
      <th className="tt2" rowSpan={2}>
        TOTAL
      </th>
    </>
  );
}

function GroupCodeHeaders({ grp }) {
  return (
    <>
      {grp.coas.map((coa) => (
        <th key={coa.code} className="cd">
          {coa.code}
        </th>
      ))}
    </>
  );
}

function CompanyMatrixRows({ comp, columns }) {
  return (
    <>
      {/* Setiap Instalasi di Perusahaan */}
      {comp.instalasi.map((inst, iIdx) => (
        <InstalasiMatrixRows key={`${comp.code}_inst_${iIdx}`} comp={comp} inst={inst} columns={columns} />
      ))}

      {/* Baris Subtotal Perusahaan (.st) */}
      <tr className="st">
        <td className="s1" colSpan={1}></td>
        <td className="s2">TOTAL {comp.code}</td>
        <td></td>
        {columns.map((grp) => {
          const groupTotalVal = comp.subtotal?.group_totals?.[grp.group] || 0;
          return (
            <GroupCells
              key={`st_${comp.code}_${grp.group}`}
              grp={grp}
              values={comp.subtotal?.values || {}}
              groupTotalVal={groupTotalVal}
              totClass="tot"
            />
          );
        })}
        <td className="tt">Rp {formatRupiah(comp.subtotal?.total || 0)}</td>
      </tr>
    </>
  );
}

function InstalasiMatrixRows({ comp, inst, columns }) {
  return (
    <>
      {/* Unit-Unit di Bawah Instalasi */}
      {inst.units.map((unit) => (
        <tr key={unit.unit_id || unit.code}>
          <td className="s1">
            <Chip variant="nt">{comp.code}</Chip>
          </td>
          <td className="s2">
            [{unit.code}] {unit.name}
          </td>
          <td>{unit.classification || '—'}</td>

          {columns.map((grp) => {
            const groupTotalVal = unit.group_totals?.[grp.group] || 0;
            return (
              <GroupCells
                key={`u_${unit.unit_id}_${grp.group}`}
                grp={grp}
                values={unit.values || {}}
                groupTotalVal={groupTotalVal}
                totClass="tot"
              />
            );
          })}

          <td className="tt">Rp {formatRupiah(unit.total || 0)}</td>
        </tr>
      ))}

      {/* Baris Subtotal Instalasi (.g) */}
      <tr className="g">
        <td className="s1 gl"></td>
        <td className="s2 gl">{inst.name}</td>
        <td className="gl"></td>

        {columns.map((grp) => {
          const groupTotalVal = inst.subtotal?.group_totals?.[grp.group] || 0;
          return (
            <GroupCells
              key={`inst_${inst.group_id}_${grp.group}`}
              grp={grp}
              values={inst.subtotal?.values || {}}
              groupTotalVal={groupTotalVal}
              cellClass="gb"
              totClass="gb gt"
            />
          );
        })}

        <td className="gb gt">Rp {formatRupiah(inst.subtotal?.total || 0)}</td>
      </tr>
    </>
  );
}

function GroupCells({ grp, values, groupTotalVal, cellClass, totClass = 'tot' }) {
  return (
    <>
      {grp.coas.map((coa) => {
        const val = values[coa.code] || 0;
        const cls = cellClass || (val === 0 ? 'n z' : 'n');
        return (
          <td key={coa.code} className={cls}>
            {formatRupiah(val)}
          </td>
        );
      })}
      <td className={totClass}>{formatRupiah(groupTotalVal)}</td>
    </>
  );
}

function GroupGrandTotalCells({ grp, grandTotal }) {
  const groupTotalVal = grandTotal.group_totals?.[grp.group] || 0;
  return (
    <>
      {grp.coas.map((coa) => {
        const val = grandTotal.values?.[coa.code] || 0;
        return (
          <td key={coa.code} className={val === 0 ? 'n z' : 'n'}>
            {formatRupiah(val)}
          </td>
        );
      })}
      <td className="tot">{formatRupiah(groupTotalVal)}</td>
    </>
  );
}
