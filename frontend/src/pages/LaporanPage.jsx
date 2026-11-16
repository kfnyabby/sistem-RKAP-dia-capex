import { useSearchParams } from 'react-router-dom';

export default function LaporanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'rekap';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <main className="mn">
      <div className="hd">
        <h1>
          Laporan · {activeTab === 'rekap' ? 'Rekap Anggaran Gabungan CN dan CNH' : 'Matriks Unit × COA'}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip nt">RKAP 2027</span>
          <span className="chip wn">Data contoh</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="row">
        <button
          type="button"
          onClick={() => setTab('rekap')}
          className={`chip ${activeTab === 'rekap' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Rekap per unit
        </button>
        <button
          type="button"
          onClick={() => setTab('matriks')}
          className={`chip ${activeTab === 'matriks' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Matriks unit × COA (format ERP)
        </button>
      </div>

      {/* TAB 1: REKAP PER UNIT */}
      {activeTab === 'rekap' && (
        <>
          <div className="row">
            <label htmlFor="fp">
              Perusahaan
              <select id="fp">
                <option>CN dan CNH</option>
                <option>CN</option>
                <option>CNH</option>
              </select>
            </label>
            <label htmlFor="fj">
              Jenis
              <select id="fj">
                <option>Biaya dan Investasi</option>
                <option>Biaya</option>
                <option>Investasi</option>
              </select>
            </label>
            <label htmlFor="fu">
              Unit
              <select id="fu">
                <option>Semua unit</option>
                <option>[9220] MCU</option>
                <option>[9712] Klinik Gigi PPS</option>
                <option>[9805] Depo Obat Bogorejo</option>
                <option>[9815] Depo Obat Pabrik Rembang</option>
              </select>
            </label>
            <button
              type="button"
              className="btn b2"
              onClick={() => alert('Mengunduh Laporan Rekap dalam format Excel...')}
            >
              Export Excel
            </button>
            <button
              type="button"
              className="btn b2"
              onClick={() => alert('Mengunduh Laporan Rekap dalam format PDF...')}
            >
              Export PDF
            </button>
          </div>

          <div className="card sc">
            <table className="rk">
              <thead>
                <tr>
                  <th>Uraian</th>
                  <th>Kode</th>
                  <th className="r">RKAP 2027</th>
                  <th className="r">Realisasi s.d. Okt</th>
                  <th>Pemakaian</th>
                </tr>
              </thead>
              <tbody>
                {/* CN */}
                <tr className="c">
                  <td colSpan={5}>PT CIPTA NIRMALA (CN)</td>
                </tr>

                <tr className="u">
                  <td colSpan={5}>[9220] MCU · Penunjang Medik</td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Biaya Cetak &amp; Fotocopy</td>
                  <td className="k">5.8.3</td>
                  <td className="r">8.500.000</td>
                  <td className="r">5.200.000</td>
                  <td>
                    <span className="chip ok">61%</span>
                  </td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Biaya Alat Perkantoran</td>
                  <td className="k">5.8.2</td>
                  <td className="r">4.000.000</td>
                  <td className="r">3.100.000</td>
                  <td>
                    <span className="chip ok">78%</span>
                  </td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Investasi: Peralatan Medis</td>
                  <td className="k">Capex</td>
                  <td className="r">185.000.000</td>
                  <td className="r">-</td>
                  <td />
                </tr>
                <tr className="s">
                  <td colSpan={2}>Subtotal unit</td>
                  <td className="r">197.500.000</td>
                  <td className="r">8.300.000</td>
                  <td />
                </tr>

                <tr className="u">
                  <td colSpan={5}>[9712] Klinik Gigi PPS · Pelayanan Medik</td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Biaya Suku Cadang Medis</td>
                  <td className="k">5.2.4</td>
                  <td className="r">640.000.000</td>
                  <td className="r">563.000.000</td>
                  <td>
                    <span className="chip wn">88%</span>
                  </td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Investasi: Peralatan Medis</td>
                  <td className="k">Capex</td>
                  <td className="r">124.000.000</td>
                  <td className="r">-</td>
                  <td />
                </tr>
                <tr className="s">
                  <td colSpan={2}>Subtotal unit</td>
                  <td className="r">764.000.000</td>
                  <td className="r">563.000.000</td>
                  <td />
                </tr>

                <tr className="s">
                  <td colSpan={2}>SUBTOTAL CN</td>
                  <td className="r">961.500.000</td>
                  <td className="r">571.300.000</td>
                  <td />
                </tr>

                {/* CNH */}
                <tr className="c">
                  <td colSpan={5}>CIPTA NIRMALA HUSADA (CNH)</td>
                </tr>

                <tr className="u">
                  <td colSpan={5}>[9805] Depo Obat Bogorejo · Tuban dan Jateng</td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Biaya Suku Cadang Medis</td>
                  <td className="k">5.2.4</td>
                  <td className="r">310.000.000</td>
                  <td className="r">245.000.000</td>
                  <td>
                    <span className="chip ok">79%</span>
                  </td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Biaya Cetak &amp; Fotocopy</td>
                  <td className="k">5.8.3</td>
                  <td className="r">6.000.000</td>
                  <td className="r">6.300.000</td>
                  <td>
                    <span className="chip bd">105%</span>
                  </td>
                </tr>
                <tr className="s">
                  <td colSpan={2}>Subtotal unit</td>
                  <td className="r">316.000.000</td>
                  <td className="r">251.300.000</td>
                  <td />
                </tr>

                <tr className="u">
                  <td colSpan={5}>[9815] Depo Obat Pabrik Rembang · Tuban dan Jateng</td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Biaya Suku Cadang Non Medis</td>
                  <td className="k">5.2.6</td>
                  <td className="r">95.000.000</td>
                  <td className="r">71.000.000</td>
                  <td>
                    <span className="chip ok">75%</span>
                  </td>
                </tr>
                <tr>
                  <td>&nbsp;&nbsp;Investasi: Peralatan Non Medis</td>
                  <td className="k">Capex</td>
                  <td className="r">48.000.000</td>
                  <td className="r">-</td>
                  <td />
                </tr>
                <tr className="s">
                  <td colSpan={2}>Subtotal unit</td>
                  <td className="r">143.000.000</td>
                  <td className="r">71.000.000</td>
                  <td />
                </tr>

                <tr className="s">
                  <td colSpan={2}>SUBTOTAL CNH</td>
                  <td className="r">459.000.000</td>
                  <td className="r">322.300.000</td>
                  <td />
                </tr>

                <tr className="t">
                  <td colSpan={2}>TOTAL CN + CNH</td>
                  <td className="r">1.420.500.000</td>
                  <td className="r">893.600.000</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: MATRIKS UNIT X COA (ERP FORMAT) */}
      {activeTab === 'matriks' && (
        <>
          <div className="row">
            <label htmlFor="fp2">
              Perusahaan
              <select id="fp2">
                <option>CN dan CNH</option>
                <option>CN</option>
                <option>CNH</option>
              </select>
            </label>
            <label htmlFor="fy">
              Periode
              <select id="fy">
                <option>TH 2027</option>
              </select>
            </label>
            <label htmlFor="fk">
              Kelompok COA
              <select id="fk">
                <option>Semua kelompok</option>
              </select>
            </label>
            <button
              type="button"
              className="btn b2"
              onClick={() => alert('Exporting Excel in ERP Matrix format...')}
            >
              Export Excel (format template ERP)
            </button>
            <button
              type="button"
              className="btn b2"
              onClick={() => alert('Exporting PDF...')}
            >
              Export PDF
            </button>
          </div>

          <div className="card" style={{ background: '#DDF0E6', borderColor: '#B7DCC8', color: '#14532D' }}>
            <b>Template Biaya RKAP · Periode: TH 2027 · ERP Version</b> · Satu baris per unit, satu kolom per COA,
            dikelompokkan per instalasi dengan subtotal. Geser ke kanan untuk kelompok COA berikutnya.
          </div>

          <div className="card sc" style={{ padding: 0 }}>
            <table className="mx" style={{ width: 'max-content', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th className="h1 s1" rowSpan={3}>Company</th>
                  <th className="h1 s2" rowSpan={3}>Unit (analytic group)</th>
                  <th className="h1" rowSpan={3}>Klasifikasi</th>
                  <th className="cat" colSpan={8}>Biaya Bahan Medis</th>
                  <th className="cat" colSpan={4}>Biaya Bahan Non medis</th>
                  <th className="cat" colSpan={3}>Biaya Pemeliharaan</th>
                  <th className="cat" colSpan={3}>Biaya Administrasi</th>
                  <th className="tt2" rowSpan={3}>TOTAL BIAYA</th>
                </tr>
                <tr>
                  <th className="cn">Tablet</th>
                  <th className="cn">Syrup</th>
                  <th className="cn">Injeksi</th>
                  <th className="cn">Salep</th>
                  <th className="cn">Chemicalien</th>
                  <th className="cn">Alkes</th>
                  <th className="cn">O2 &amp; NO2</th>
                  <th className="tt2" rowSpan={2}>TOTAL</th>
                  <th className="cn">Bahan makan</th>
                  <th className="cn">Bahan cucian</th>
                  <th className="cn">Bahan pembersih</th>
                  <th className="tt2" rowSpan={2}>TOTAL</th>
                  <th className="cn">Suku cadang medis</th>
                  <th className="cn">Suku cadang non medis</th>
                  <th className="tt2" rowSpan={2}>TOTAL</th>
                  <th className="cn">Alat perkantoran</th>
                  <th className="cn">Cetak &amp; fotocopy</th>
                  <th className="tt2" rowSpan={2}>TOTAL</th>
                </tr>
                <tr>
                  <th className="cd">4.1.1</th>
                  <th className="cd">4.1.2</th>
                  <th className="cd">4.1.3</th>
                  <th className="cd">4.1.4</th>
                  <th className="cd">4.1.5</th>
                  <th className="cd">4.1.6</th>
                  <th className="cd">4.1.7</th>
                  <th className="cd">4.2.1</th>
                  <th className="cd">4.2.2</th>
                  <th className="cd">4.2.3</th>
                  <th className="cd">5.2.4</th>
                  <th className="cd">5.2.6</th>
                  <th className="cd">5.8.2</th>
                  <th className="cd">5.8.3</th>
                </tr>
              </thead>
              <tbody>
                {/* CN Laboratorium */}
                <tr>
                  <td className="s1"><span className="chip nt">CN</span></td>
                  <td className="s2">[9241] LABORATORIUM</td>
                  <td>PENUNJANG INTERMEDIATE</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">96.500.000</td>
                  <td className="n z">0</td>
                  <td className="tot">96.500.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">1.200.000</td>
                  <td className="tot">1.200.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">0</td>
                  <td className="n">3.100.000</td>
                  <td className="n">2.750.000</td>
                  <td className="tot">5.850.000</td>
                  <td className="tt">103.550.000</td>
                </tr>
                {/* CN Rontgen */}
                <tr>
                  <td className="s1"><span className="chip nt">CN</span></td>
                  <td className="s2">[9252] RONTGEN</td>
                  <td>PENUNJANG INTERMEDIATE</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">187.500.000</td>
                  <td className="n z">0</td>
                  <td className="tot">187.500.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">950.000</td>
                  <td className="tot">950.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">0</td>
                  <td className="n">1.800.000</td>
                  <td className="n">1.200.000</td>
                  <td className="tot">3.000.000</td>
                  <td className="tt">191.450.000</td>
                </tr>
                {/* CN MCU */}
                <tr>
                  <td className="s1"><span className="chip nt">CN</span></td>
                  <td className="s2">[9220] MCU</td>
                  <td>PUSAT LABA</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">4.300.000</td>
                  <td className="n z">0</td>
                  <td className="tot">4.300.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">600.000</td>
                  <td className="tot">600.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">0</td>
                  <td className="n">4.000.000</td>
                  <td className="n">8.500.000</td>
                  <td className="tot">12.500.000</td>
                  <td className="tt">17.400.000</td>
                </tr>
                {/* Subtotal Penunjang Medik */}
                <tr className="g">
                  <td className="s1 gl" />
                  <td className="s2 gl">Instalasi Penunjang Medik</td>
                  <td className="gl" />
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">288.300.000</td>
                  <td className="gb">0</td>
                  <td className="gb gt">288.300.000</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">2.750.000</td>
                  <td className="gb gt">2.750.000</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb gt">0</td>
                  <td className="gb">8.900.000</td>
                  <td className="gb">12.450.000</td>
                  <td className="gb gt">21.350.000</td>
                  <td className="gb gt">312.400.000</td>
                </tr>

                {/* CN Klinik Gigi PPS */}
                <tr>
                  <td className="s1"><span className="chip nt">CN</span></td>
                  <td className="s2">[9712] Klinik Gigi PPS</td>
                  <td>PUSAT LABA</td>
                  <td className="n">21.000.000</td>
                  <td className="n z">0</td>
                  <td className="n">8.400.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">55.000.000</td>
                  <td className="n z">0</td>
                  <td className="tot">84.400.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">0</td>
                  <td className="n">640.000.000</td>
                  <td className="n z">0</td>
                  <td className="tot">640.000.000</td>
                  <td className="n">2.600.000</td>
                  <td className="n">1.900.000</td>
                  <td className="tot">4.500.000</td>
                  <td className="tt">728.900.000</td>
                </tr>
                {/* Subtotal Pelayanan Medik */}
                <tr className="g">
                  <td className="s1 gl" />
                  <td className="s2 gl">Instalasi Pelayanan Medik</td>
                  <td className="gl" />
                  <td className="gb">21.000.000</td>
                  <td className="gb">0</td>
                  <td className="gb">8.400.000</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">55.000.000</td>
                  <td className="gb">0</td>
                  <td className="gb gt">84.400.000</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb gt">0</td>
                  <td className="gb">640.000.000</td>
                  <td className="gb">0</td>
                  <td className="gb gt">640.000.000</td>
                  <td className="gb">2.600.000</td>
                  <td className="gb">1.900.000</td>
                  <td className="gb gt">4.500.000</td>
                  <td className="gb gt">728.900.000</td>
                </tr>

                {/* CNH Bogorejo */}
                <tr>
                  <td className="s1"><span className="chip nt">CNH</span></td>
                  <td className="s2">[9805] Depo Obat Bogorejo</td>
                  <td>PUSAT LABA</td>
                  <td className="n">88.000.000</td>
                  <td className="n">14.500.000</td>
                  <td className="n">31.000.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">9.800.000</td>
                  <td className="n z">0</td>
                  <td className="tot">143.300.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">0</td>
                  <td className="n">310.000.000</td>
                  <td className="n z">0</td>
                  <td className="tot">310.000.000</td>
                  <td className="n z">0</td>
                  <td className="n">6.000.000</td>
                  <td className="tot">6.000.000</td>
                  <td className="tt">459.300.000</td>
                </tr>
                {/* CNH Rembang */}
                <tr>
                  <td className="s1"><span className="chip nt">CNH</span></td>
                  <td className="s2">[9815] Depo Obat Pabrik Rembang</td>
                  <td>PUSAT LABA</td>
                  <td className="n">42.000.000</td>
                  <td className="n">7.200.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">49.200.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">0</td>
                  <td className="n z">0</td>
                  <td className="n">95.000.000</td>
                  <td className="tot">95.000.000</td>
                  <td className="n">1.500.000</td>
                  <td className="n z">0</td>
                  <td className="tot">1.500.000</td>
                  <td className="tt">145.700.000</td>
                </tr>
                {/* Subtotal Tuban & Jateng */}
                <tr className="g">
                  <td className="s1 gl" />
                  <td className="s2 gl">Unit Bisnis Tuban dan Jateng</td>
                  <td className="gl" />
                  <td className="gb">130.000.000</td>
                  <td className="gb">21.700.000</td>
                  <td className="gb">31.000.000</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">9.800.000</td>
                  <td className="gb">0</td>
                  <td className="gb gt">192.500.000</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb">0</td>
                  <td className="gb gt">0</td>
                  <td className="gb">310.000.000</td>
                  <td className="gb">95.000.000</td>
                  <td className="gb gt">405.000.000</td>
                  <td className="gb">1.500.000</td>
                  <td className="gb">6.000.000</td>
                  <td className="gb gt">7.500.000</td>
                  <td className="gb gt">605.000.000</td>
                </tr>

                {/* TOTAL CN */}
                <tr className="st">
                  <td className="s1" colSpan={1} />
                  <td className="s2">TOTAL CN</td>
                  <td />
                  <td className="n">21.000.000</td>
                  <td className="n z">0</td>
                  <td className="n">8.400.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">343.300.000</td>
                  <td className="n z">0</td>
                  <td className="tot">372.700.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">2.750.000</td>
                  <td className="tot">2.750.000</td>
                  <td className="n">640.000.000</td>
                  <td className="n z">0</td>
                  <td className="tot">640.000.000</td>
                  <td className="n">11.500.000</td>
                  <td className="n">14.350.000</td>
                  <td className="tot">25.850.000</td>
                  <td className="tt">1.041.300.000</td>
                </tr>

                {/* TOTAL CNH */}
                <tr className="st">
                  <td className="s1" colSpan={1} />
                  <td className="s2">TOTAL CNH</td>
                  <td />
                  <td className="n">130.000.000</td>
                  <td className="n">21.700.000</td>
                  <td className="n">31.000.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">9.800.000</td>
                  <td className="n z">0</td>
                  <td className="tot">192.500.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="tot">0</td>
                  <td className="n">310.000.000</td>
                  <td className="n">95.000.000</td>
                  <td className="tot">405.000.000</td>
                  <td className="n">1.500.000</td>
                  <td className="n">6.000.000</td>
                  <td className="tot">7.500.000</td>
                  <td className="tt">605.000.000</td>
                </tr>

                {/* TOTAL CN + CNH */}
                <tr className="gr">
                  <td className="s1" colSpan={1} />
                  <td className="s2">TOTAL CN + CNH</td>
                  <td />
                  <td className="n">151.000.000</td>
                  <td className="n">21.700.000</td>
                  <td className="n">39.400.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">353.100.000</td>
                  <td className="n z">0</td>
                  <td className="tot">565.200.000</td>
                  <td className="n z">0</td>
                  <td className="n z">0</td>
                  <td className="n">2.750.000</td>
                  <td className="tot">2.750.000</td>
                  <td className="n">950.000.000</td>
                  <td className="n">95.000.000</td>
                  <td className="tot">1.045.000.000</td>
                  <td className="n">13.000.000</td>
                  <td className="n">20.350.000</td>
                  <td className="tot">33.350.000</td>
                  <td className="tt">1.646.300.000</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#5E6070' }}>
            Kelompok COA (Biaya Bahan Medis, dst.) mengikuti Jenis COA di master data. Nama kelompok mengikuti sheet
            BIAYA CN. Klasifikasi unit (Penunjang Intermediate, Pusat Laba) menjadi atribut unit.
          </p>
        </>
      )}
    </main>
  );
}
