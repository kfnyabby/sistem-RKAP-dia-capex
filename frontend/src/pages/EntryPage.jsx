import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function EntryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'biaya';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // State for Anggaran Biaya
  const [biayaItems, setBiayaItems] = useState([
    { id: 1, name: 'Kertas HVS A4 70 gr', uom: 'Rim', price: 48000, real: 30, qty: 36, coa: '5.8.3', coaName: 'Biaya Cetak & Fotocopy', jenis: 'Biaya Perkantoran' },
    { id: 2, name: 'Tinta printer hitam', uom: 'Botol', price: 85000, real: 12, qty: 14, coa: '5.8.3', coaName: 'Biaya Cetak & Fotocopy', jenis: 'Biaya Perkantoran' },
    { id: 3, name: 'Map plastik folder', uom: 'Pak', price: 22000, real: 20, qty: 20, coa: '5.8.2', coaName: 'Biaya Pemakaian Alat Perkantoran', jenis: 'Biaya Perkantoran' },
    { id: 4, name: 'Spidol whiteboard', uom: 'Pcs', price: 9500, real: 40, qty: 48, coa: '5.8.2', coaName: 'Biaya Pemakaian Alat Perkantoran', jenis: 'Biaya Perkantoran' },
  ]);

  const [filterCari, setFilterCari] = useState('');
  const [filterJenis, setFilterJenis] = useState('Semua jenis');
  const [filterCoa, setFilterCoa] = useState('Semua COA');

  const handleQtyChange = (id, newQty) => {
    const val = parseInt(newQty, 10) || 0;
    setBiayaItems(items => items.map(item => item.id === id ? { ...item, qty: val } : item));
  };

  const totalBiaya = biayaItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);

  // New item request state
  const [newItemName, setNewItemName] = useState('');
  const [newItemSpec, setNewItemSpec] = useState('');
  const [newItemUom, setNewItemUom] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemReason, setNewItemReason] = useState('');
  const [newItemSuccess, setNewItemSuccess] = useState(false);

  const handleAddNewItem = (e) => {
    e.preventDefault();
    if (!newItemName) return;
    setNewItemSuccess(true);
    setTimeout(() => setNewItemSuccess(false), 3000);
    setNewItemName('');
    setNewItemSpec('');
    setNewItemUom('');
    setNewItemQty('');
    setNewItemPrice('');
    setNewItemReason('');
  };

  // State for Anggaran Investasi
  const [investItems, setInvestItems] = useState([
    {
      id: 1,
      name: 'USG Portable',
      jenis: 'Peralatan Medis',
      coa: '5.4.2 Biaya Penyusutan Peralatan Medis',
      susutBln: 60,
      prioritas: 'Improvement',
      qty: 1,
      harga: 185000000,
      bulan: 'Apr',
      bulanNum: 4,
      susut2027: 24666667,
      strategiObjektif: 'Meningkatkan mutu layanan gigi dan kepuasan pasien melalui peralatan yang andal dan waktu tunggu yang lebih singkat',
      counterMeasureKpi: 'Indeks kepuasan pasien gigi minimal 85% dan waktu tunggu rata-rata kurang dari 20 menit',
      programKerja: 'Penambahan fasilitas pendukung layanan',
      strategicAction: 'Pembelian USG portable untuk pemeriksaan di ruang tindakan',
    },
    {
      id: 2,
      name: 'Dental unit chair',
      jenis: 'Peralatan Medis',
      coa: '5.4.2 Biaya Penyusutan Peralatan Medis',
      susutBln: 60,
      prioritas: 'Keep Operation',
      qty: 2,
      harga: 62000000,
      bulan: 'Jun',
      bulanNum: 6,
      susut2027: 12400000,
      strategiObjektif: 'Meningkatkan mutu layanan gigi dan kepuasan pasien melalui peralatan yang andal dan waktu tunggu yang lebih singkat',
      counterMeasureKpi: 'Indeks kepuasan pasien gigi minimal 85% dan waktu tunggu rata-rata kurang dari 20 menit',
      programKerja: 'Penambahan dan peremajaan peralatan diagnostik layanan gigi',
      strategicAction: 'Peremajaan dental unit chair yang sudah melewati masa pakai',
    },
    {
      id: 3,
      name: 'Laptop staf',
      jenis: 'PC/Laptop',
      coa: '5.4.3 Biaya Penyusutan Peralatan Non Medis',
      susutBln: 60,
      prioritas: 'Keep Operation',
      qty: 3,
      harga: 12500000,
      bulan: 'Mar',
      bulanNum: 3,
      susut2027: 5625000,
      strategiObjektif: 'Meningkatkan Operational Excellence',
      counterMeasureKpi: 'Indikator mutu layanan tercapai minimal 95%',
      programKerja: 'Peremajaan fasilitas layanan administrasi',
      strategicAction: 'Penggantian laptop staf administrasi',
    },
  ]);

  // Form Investasi
  const [formJenisInv, setFormJenisInv] = useState('Peralatan Medis');
  const [formSusutBln, setFormSusutBln] = useState(60);
  const [formPrioritas, setFormPrioritas] = useState('Strategic');
  const [formNamaBarang, setFormNamaBarang] = useState('Autoclave kecil');
  const [formQty, setFormQty] = useState(1);
  const [formHarga, setFormHarga] = useState(22000000);
  const [formBulan, setFormBulan] = useState('Jul');
  const [formSO, setFormSO] = useState('Meningkatkan mutu layanan gigi dan kepuasan pasien melalui peralatan yang andal dan waktu tunggu yang lebih singkat');
  const [formKPI, setFormKPI] = useState('Indeks kepuasan pasien gigi minimal 85% dan waktu tunggu rata-rata kurang dari 20 menit');
  const [formPK, setFormPK] = useState('Penambahan dan peremajaan peralatan diagnostik layanan gigi');
  const [formSA, setFormSA] = useState('Pembelian autoclave kecil untuk sterilisasi alat gigi agar siklus pemakaian instrumen lebih cepat');
  const [investError, setInvestError] = useState('');

  const monthMap = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12 };

  const handleJenisInvChange = (val) => {
    setFormJenisInv(val);
    if (val === 'Bangunan') setFormSusutBln(120);
    else if (val === 'Kendaraan') setFormSusutBln(48);
    else setFormSusutBln(60);
  };

  const estimasiPenyusutan = Math.round(
    ((formQty * formHarga) / formSusutBln) * (12 - (monthMap[formBulan] || 7))
  );

  const handleAddInvestasi = () => {
    const totalItem = formQty * formHarga;
    if (totalItem <= 5000000) {
      setInvestError('Validasi BR-01: Nilai item harus lebih dari Rp 5.000.000. Item ini harus dimasukkan ke Anggaran Biaya.');
      return;
    }
    setInvestError('');
    const nextId = investItems.length ? Math.max(...investItems.map(i => i.id)) + 1 : 1;
    const newItem = {
      id: nextId,
      name: formNamaBarang,
      jenis: formJenisInv,
      coa: formJenisInv === 'Peralatan Medis' ? '5.4.2 Biaya Penyusutan Peralatan Medis' : '5.4.3 Biaya Penyusutan Peralatan Non Medis',
      susutBln: formSusutBln,
      prioritas: formPrioritas,
      qty: formQty,
      harga: formHarga,
      bulan: formBulan,
      bulanNum: monthMap[formBulan] || 7,
      susut2027: estimasiPenyusutan,
      strategiObjektif: formSO,
      counterMeasureKpi: formKPI,
      programKerja: formPK,
      strategicAction: formSA,
    };
    setInvestItems([...investItems, newItem]);
    alert('Baris investasi berhasil ditambahkan!');
  };

  // State for Diklat & Tenaga
  const [diklatItems, setDiklatItems] = useState([
    { id: 1, jenis: 'Diklat', kebutuhan: 'Pelatihan/Workshop ATLM', qty: 2, nilai: 3000000, unit: '[9241] Laboratorium', jadwal: 'Apr', prioritas: 'Improvement' },
    { id: 2, jenis: 'Diklat', kebutuhan: 'Pelatihan Flebotomi', qty: 1, nilai: 4500000, unit: '[9241] Laboratorium', jadwal: 'Apr', prioritas: 'Regulasi' },
    { id: 3, jenis: 'Tenaga Kerja', kebutuhan: 'Tenaga admin', qty: 1, nilai: null, unit: '[9220] MCU', jadwal: 'Mar', prioritas: 'Keep Operation' },
    { id: 4, jenis: 'Diklat', kebutuhan: 'Pelatihan dan Workshop', qty: 1, nilai: 6000000, unit: '[9220] MCU', jadwal: 'Sesuai jadwal pelaksanaan', prioritas: 'Regulasi' },
  ]);
  const [diklatJenis, setDiklatJenis] = useState('Diklat');
  const [diklatKebutuhan, setDiklatKebutuhan] = useState('Pelatihan audiometri');
  const [diklatQty, setDiklatQty] = useState(2);
  const [diklatNilai, setDiklatNilai] = useState(4000000);
  const [diklatJadwal, setDiklatJadwal] = useState('Mei');
  const [diklatPrioritas, setDiklatPrioritas] = useState('Regulasi');

  const handleAddDiklat = () => {
    const nextId = diklatItems.length ? Math.max(...diklatItems.map(i => i.id)) + 1 : 1;
    setDiklatItems([
      ...diklatItems,
      {
        id: nextId,
        jenis: diklatJenis,
        kebutuhan: diklatKebutuhan,
        qty: diklatQty,
        nilai: diklatJenis === 'Tenaga Kerja' ? null : diklatNilai,
        unit: '[9220] MCU',
        jadwal: diklatJadwal,
        prioritas: diklatPrioritas,
      },
    ]);
    alert('Kebutuhan berhasil disimpan!');
  };

  // State for SDM
  const [sdmItems, setSdmItems] = useState([
    { coa: '5.1.1.1', nama: 'Gaji pegawai tetap', rkap2026: 60000, realAgt: 34000, est4bln: 17000, prognosa: 51000, kenaikan: 3 },
    { coa: '5.1.1.2', nama: 'Gaji pegawai kontrak', rkap2026: 1400, realAgt: 470, est4bln: 235, prognosa: 705, kenaikan: 5 },
    { coa: '5.1.2', nama: 'Tunjangan hari raya', rkap2026: 4600, realAgt: 2500, est4bln: 1250, prognosa: 3750, kenaikan: 2 },
    { coa: '5.1.7', nama: 'Pengobatan', rkap2026: 4200, realAgt: 2200, est4bln: 1100, prognosa: 3300, kenaikan: 0 },
  ]);

  const handleSdmKenaikanChange = (coa, val) => {
    const num = parseFloat(val) || 0;
    setSdmItems(items => items.map(item => item.coa === coa ? { ...item, kenaikan: num } : item));
  };

  return (
    <main className="mn">
      {/* Header */}
      <div className="hd">
        <h1>
          Entry · {activeTab === 'biaya' ? 'Anggaran Biaya' : activeTab === 'investasi' ? 'Anggaran Investasi' : activeTab === 'pc' ? 'Investasi: Laptop & PC' : activeTab === 'diklat' ? 'Diklat & Tenaga' : 'Usulan RKAP SDM per COA'}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip nt">
            {activeTab === 'investasi' ? '[9712] Klinik Gigi PPS' : activeTab === 'pc' ? 'Jenis: PC/Laptop' : activeTab === 'sdm' ? 'Rp juta' : '[9220] MCU'}
          </span>
          {activeTab === 'pc' || activeTab === 'diklat' || activeTab === 'sdm' ? <span className="chip wn">Usulan MVP</span> : null}
          <span className="chip wn">Data contoh</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="row" style={{ marginTop: '4px' }}>
        <button
          type="button"
          onClick={() => setTab('biaya')}
          className={`chip ${activeTab === 'biaya' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Anggaran Biaya
        </button>
        <button
          type="button"
          onClick={() => setTab('investasi')}
          className={`chip ${activeTab === 'investasi' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Anggaran Investasi
        </button>
        <button
          type="button"
          onClick={() => setTab('pc')}
          className={`chip ${activeTab === 'pc' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Laptop & PC
        </button>
        <button
          type="button"
          onClick={() => setTab('diklat')}
          className={`chip ${activeTab === 'diklat' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Diklat & Tenaga
        </button>
        <button
          type="button"
          onClick={() => setTab('sdm')}
          className={`chip ${activeTab === 'sdm' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Usulan RKAP SDM
        </button>
      </div>

      {/* TAB 1: ANGGARAN BIAYA */}
      {activeTab === 'biaya' && (
        <>
          <div className="card" style={{ background: '#DDF1E4', borderColor: '#9ACDAA', color: '#14532D' }}>
            Pengajuan dibuka. Deadline pengisian: 15 Nov 2026. Semua perubahan tersimpan otomatis.
          </div>

          <div className="row">
            <label htmlFor="cari">
              Cari barang
              <input
                id="cari"
                placeholder="Nama atau kode"
                value={filterCari}
                onChange={(e) => setFilterCari(e.target.value)}
              />
            </label>
            <label htmlFor="jns">
              Jenis COA
              <select id="jns" value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}>
                <option>Semua jenis</option>
                <option>Biaya Perkantoran</option>
                <option>Biaya Suku Cadang</option>
              </select>
            </label>
            <label htmlFor="coa">
              COA
              <select id="coa" value={filterCoa} onChange={(e) => setFilterCoa(e.target.value)}>
                <option>Semua COA</option>
                <option>5.8.3 Biaya Cetak & Fotocopy</option>
                <option>5.8.2 Biaya Pemakaian Alat Perkantoran</option>
              </select>
            </label>
            <label htmlFor="per">
              Periode
              <select id="per">
                <option>RKAP 2027</option>
              </select>
            </label>
            <label htmlFor="b1">
              Realisasi dari bulan
              <select id="b1">
                <option>Januari</option>
                <option>Februari</option>
              </select>
            </label>
            <label htmlFor="b2">
              s.d. bulan
              <select id="b2">
                <option>Oktober</option>
                <option>September</option>
              </select>
            </label>
          </div>

          <div className="card sc">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Barang</th>
                  <th>Satuan</th>
                  <th className="r">Harga</th>
                  <th className="r">Real (Jan s.d. Okt)</th>
                  <th>Qty RKAP 2027</th>
                  <th className="r">Jumlah</th>
                  <th>COA</th>
                </tr>
              </thead>
              <tbody>
                {biayaItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.uom}</td>
                    <td className="r">{item.price.toLocaleString('id-ID')}</td>
                    <td className="r">{item.real}</td>
                    <td>
                      <input
                        aria-label={`Qty ${item.name}`}
                        value={item.qty}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        style={{ width: '72px' }}
                      />
                    </td>
                    <td className="r">{(item.qty * item.price).toLocaleString('id-ID')}</td>
                    <td>
                      <b>{item.coa}</b> {item.coaName}
                      <div className="lb">Jenis: {item.jenis}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Permintaan barang baru */}
          <div className="card">
            <h2>Permintaan barang baru (tidak ada di daftar)</h2>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#5E6070' }}>
              Isi bila barang yang dibutuhkan belum ada di master. Setelah dikirim, Akuntansi menentukan COA-nya dan
              menambahkan barang ke master. Barang baru belum masuk total sampai COA ditentukan.
            </p>
            {newItemSuccess && (
              <div className="card" style={{ background: '#DDF1E4', borderColor: '#9ACDAA', color: '#14532D', marginBottom: '12px' }}>
                Permintaan barang baru berhasil disimpan dan dikirim ke antrian Akuntansi (Status: MENUNGGU_COA).
              </div>
            )}
            <form onSubmit={handleAddNewItem}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '12px' }}>
                <label htmlFor="nn">
                  Nama barang
                  <input id="nn" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required />
                </label>
                <label htmlFor="ns">
                  Spesifikasi
                  <input id="ns" value={newItemSpec} onChange={(e) => setNewItemSpec(e.target.value)} />
                </label>
                <label htmlFor="nu">
                  Satuan
                  <input id="nu" value={newItemUom} onChange={(e) => setNewItemUom(e.target.value)} placeholder="Rim, Pcs, Box" />
                </label>
                <label htmlFor="nq">
                  Qty
                  <input id="nq" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)} placeholder="1" />
                </label>
                <label htmlFor="nh">
                  Estimasi harga
                  <input id="nh" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} placeholder="Rp" />
                </label>
                <label htmlFor="na">
                  Alasan kebutuhan
                  <input id="na" value={newItemReason} onChange={(e) => setNewItemReason(e.target.value)} />
                </label>
              </div>
              <div style={{ marginTop: '12px' }}>
                <button type="submit" className="btn">
                  Simpan &amp; Kirim ke Akuntansi
                </button>
              </div>
            </form>
          </div>

          <div className="hd" style={{ marginTop: '12px' }}>
            <span className="chip ok" role="status">
              Tersimpan otomatis · 08:15
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <b>Total Biaya: Rp {totalBiaya.toLocaleString('id-ID')}</b>
              <button
                type="button"
                className="btn"
                onClick={() => alert('Dokumen Anggaran Biaya berhasil diajukan ke Manager!')}
              >
                Ajukan ke Manager
              </button>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: ANGGARAN INVESTASI */}
      {activeTab === 'investasi' && (
        <>
          <div className="card" style={{ background: '#DDF1E4', borderColor: '#9ACDAA', color: '#14532D' }}>
            Pengajuan dibuka. Deadline pengisian: 15 Nov 2026. Item investasi harus bernilai lebih dari Rp 5.000.000. Semua
            perubahan tersimpan otomatis.
          </div>

          {investError && (
            <div className="card" style={{ background: '#F8D9D6', borderColor: '#E8A39E', color: '#8A1F1B' }}>
              {investError}
            </div>
          )}

          <div className="card sc">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Nama barang</th>
                  <th>Jenis</th>
                  <th>COA</th>
                  <th className="r">Susut (bln)</th>
                  <th>Prioritas</th>
                  <th className="r">Qty</th>
                  <th className="r">Harga satuan</th>
                  <th className="r">Jumlah</th>
                  <th>Bulan</th>
                  <th className="r">Penyusutan 2027</th>
                </tr>
              </thead>
              <tbody>
                {investItems.map((inv, idx) => (
                  <React.Fragment key={inv.id}>
                    <tr>
                      <td>{idx + 1}</td>
                      <td>{inv.name}</td>
                      <td>{inv.jenis}</td>
                      <td>{inv.coa}</td>
                      <td className="r">{inv.susutBln}</td>
                      <td>{inv.prioritas}</td>
                      <td className="r">{inv.qty}</td>
                      <td className="r">{inv.harga.toLocaleString('id-ID')}</td>
                      <td className="r">{(inv.qty * inv.harga).toLocaleString('id-ID')}</td>
                      <td>{inv.bulan}</td>
                      <td className="r">{inv.susut2027.toLocaleString('id-ID')}</td>
                    </tr>
                    <tr>
                      <td colSpan={11} style={{ padding: '0 8px 8px' }}>
                        <details open={idx === 0}>
                          <summary style={{ cursor: 'pointer', color: '#3D4E9C', padding: '10px 0', minHeight: '24px' }}>
                            Lihat strategi objektif, counter measure (KPI), program kerja, dan strategic action
                          </summary>
                          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '200px 1fr', gap: '6px 12px' }}>
                            <dt className="lb">Strategi objektif</dt>
                            <dd style={{ margin: 0 }}>{inv.strategiObjektif}</dd>
                            <dt className="lb">Counter measure (KPI)</dt>
                            <dd style={{ margin: 0 }}>{inv.counterMeasureKpi}</dd>
                            <dt className="lb">Program kerja / inisiatif</dt>
                            <dd style={{ margin: 0 }}>{inv.programKerja}</dd>
                            <dt className="lb">Strategic action</dt>
                            <dd style={{ margin: 0 }}>{inv.strategicAction}</dd>
                          </dl>
                        </details>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr style={{ fontWeight: 700, background: '#F3F1EA' }}>
                  <td colSpan={8}>Total</td>
                  <td className="r">
                    {investItems.reduce((acc, c) => acc + (c.qty * c.harga), 0).toLocaleString('id-ID')}
                  </td>
                  <td />
                  <td className="r">
                    {investItems.reduce((acc, c) => acc + c.susut2027, 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Tambah baris investasi</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '12px' }}>
              <label htmlFor="jn">
                Jenis investasi
                <select id="jn" value={formJenisInv} onChange={(e) => handleJenisInvChange(e.target.value)}>
                  <option>Peralatan Medis</option>
                  <option>Peralatan Non Medis</option>
                  <option>PC/Laptop</option>
                  <option>AC 2 PK</option>
                  <option>Bangunan</option>
                  <option>Kendaraan</option>
                  <option>Aset Tak Berwujud</option>
                </select>
              </label>
              <label htmlFor="ss">
                Susut / masa layak pakai (bulan)
                <input id="ss" value={formSusutBln} readOnly style={{ background: '#F3F1EA', color: '#3A3F63' }} />
              </label>
              <label htmlFor="pr">
                Prioritas
                <select id="pr" value={formPrioritas} onChange={(e) => setFormPrioritas(e.target.value)}>
                  <option>Strategic</option>
                  <option>Improvement</option>
                  <option>Regulasi</option>
                  <option>Keep Operation</option>
                </select>
              </label>
              <label htmlFor="nb">
                Nama barang atau kegiatan
                <input id="nb" value={formNamaBarang} onChange={(e) => setFormNamaBarang(e.target.value)} />
              </label>
              <label htmlFor="qt">
                Qty
                <input id="qt" type="number" min="1" value={formQty} onChange={(e) => setFormQty(parseInt(e.target.value, 10) || 1)} />
              </label>
              <label htmlFor="hs">
                Harga satuan (Rp)
                <input id="hs" type="number" value={formHarga} onChange={(e) => setFormHarga(parseInt(e.target.value, 10) || 0)} />
              </label>
              <label htmlFor="bl">
                Bulan rencana
                <select id="bl" value={formBulan} onChange={(e) => setFormBulan(e.target.value)}>
                  <option>Jan</option>
                  <option>Feb</option>
                  <option>Mar</option>
                  <option>Apr</option>
                  <option>Mei</option>
                  <option>Jun</option>
                  <option>Jul</option>
                  <option>Agu</option>
                  <option>Sep</option>
                  <option>Okt</option>
                  <option>Nov</option>
                  <option>Des</option>
                </select>
              </label>
              <label htmlFor="pn">
                Estimasi penyusutan 2027 (Rp)
                <input id="pn" value={estimasiPenyusutan.toLocaleString('id-ID')} readOnly style={{ background: '#F3F1EA', color: '#3A3F63' }} />
              </label>
            </div>

            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              COA ditentukan otomatis dari jenis investasi: <b>{formJenisInv === 'Peralatan Medis' ? '5.4.2 Biaya Penyusutan Peralatan Medis' : '5.4.3 Biaya Penyusutan Peralatan Non Medis'}</b> · masa manfaat {formSusutBln} bulan.
              Penyusutan = Jumlah ÷ Susut × (12 − bulan rencana, Januari = 1).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="so" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Strategi objektif
                  </label>
                  <span className="lb">{formSO.length} / 300 karakter</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                  <button
                    type="button"
                    className="btn b2"
                    style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
                    onClick={() => setFormSO('Peningkatan Customer Satisfaction Index')}
                  >
                    Peningkatan Customer Satisfaction Index
                  </button>
                  <button
                    type="button"
                    className="btn b2"
                    style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
                    onClick={() => setFormSO('Meningkatkan Operational Excellence')}
                  >
                    Meningkatkan Operational Excellence
                  </button>
                </div>
                <textarea
                  id="so"
                  rows={2}
                  maxLength={300}
                  value={formSO}
                  onChange={(e) => setFormSO(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="kp" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Counter measure (KPI)
                  </label>
                  <span className="lb">{formKPI.length} / 300 karakter</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' }}>
                  <button
                    type="button"
                    className="btn b2"
                    style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
                    onClick={() => setFormKPI('Internal Customer Satisfaction Index 85%')}
                  >
                    Internal Customer Satisfaction Index 85%
                  </button>
                </div>
                <textarea
                  id="kp"
                  rows={2}
                  maxLength={300}
                  value={formKPI}
                  onChange={(e) => setFormKPI(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="pk" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Program kerja / inisiatif strategis
                  </label>
                  <span className="lb">{formPK.length} / 300 karakter</span>
                </div>
                <textarea
                  id="pk"
                  rows={2}
                  maxLength={300}
                  value={formPK}
                  onChange={(e) => setFormPK(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label htmlFor="sa" style={{ display: 'block', fontSize: '12px', color: '#5E6070' }}>
                    Strategic action
                  </label>
                  <span className="lb">{formSA.length} / 300 karakter</span>
                </div>
                <textarea
                  id="sa"
                  rows={2}
                  maxLength={300}
                  value={formSA}
                  onChange={(e) => setFormSA(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', marginTop: '4px' }}
                />
              </div>
            </div>

            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              Kotak teks melebar mengikuti isi dan selalu menampilkan seluruh ketikan. Chip di atas berisi isian yang
              pernah dipakai unit ini; satu ketukan mengisi kotaknya, lalu boleh diedit.
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
              <button type="button" className="btn" onClick={handleAddInvestasi}>
                Tambah baris
              </button>
              <button
                type="button"
                className="btn b2"
                onClick={() => {
                  setFormSO(investItems[0].strategiObjektif);
                  setFormKPI(investItems[0].counterMeasureKpi);
                  setFormPK(investItems[0].programKerja);
                  setFormSA(investItems[0].strategicAction);
                }}
              >
                Salin teks dari baris sebelumnya
              </button>
              <span className="chip ok" role="status">
                Tersimpan otomatis · 08:15
              </span>
              <button
                type="button"
                className="btn b2"
                onClick={() => alert('Dokumen Anggaran Investasi berhasil diajukan ke Manager!')}
              >
                Ajukan ke Manager
              </button>
            </div>
          </div>
        </>
      )}

      {/* TAB 3: LAPTOP & PC */}
      {activeTab === 'pc' && (
        <>
          <div className="card" style={{ background: '#ECE8F5', borderColor: '#CFC8E6', color: '#3A3F63' }}>
            Bagian dari Anggaran Investasi. Kolom sama dengan sheet unit; tampilan ini menyaring jenis Laptop/PC dari semua
            unit agar mudah direkap. Item baru dibuat dari Entry Investasi.
          </div>
          <div className="row">
            <label htmlFor="lu">
              Unit
              <select id="lu">
                <option>Semua unit</option>
                <option>Akuntansi</option>
                <option>Penagihan</option>
                <option>Keamanan Data Cyber</option>
                <option>Pengadaan Barang dan Jasa</option>
              </select>
            </label>
            <label htmlFor="lp">
              Prioritas
              <select id="lp">
                <option>Semua</option>
                <option>Keep Operation</option>
                <option>Improvement</option>
                <option>Strategic</option>
              </select>
            </label>
            <button type="button" className="btn b2">
              Export Excel
            </button>
            <button type="button" className="btn" onClick={() => setTab('investasi')}>
              Tambah laptop atau PC
            </button>
          </div>
          <div className="card sc">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Strategic action</th>
                  <th>Nama barang</th>
                  <th className="r">Qty</th>
                  <th className="r">Harga satuan</th>
                  <th className="r">Jumlah</th>
                  <th>Unit</th>
                  <th>Jadwal</th>
                  <th>Prioritas</th>
                  <th>COA · Susut</th>
                  <th className="r">Penyusutan 2027</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Penambahan laptop pegawai</td>
                  <td>Laptop</td>
                  <td className="r">1</td>
                  <td className="r">7.500.000</td>
                  <td className="r">7.500.000</td>
                  <td>Akuntansi</td>
                  <td>Feb</td>
                  <td>
                    <span className="chip nt">Keep Operation</span>
                  </td>
                  <td>5.4.3 Biaya Penyusutan Peralatan Non Medis · 60 bln</td>
                  <td className="r">1.250.000</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Pengadaan laptop staf penagihan</td>
                  <td>Laptop</td>
                  <td className="r">1</td>
                  <td className="r">6.500.000</td>
                  <td className="r">6.500.000</td>
                  <td>Penagihan</td>
                  <td>Mar</td>
                  <td>
                    <span className="chip nt">Keep Operation</span>
                  </td>
                  <td>5.4.3 Biaya Penyusutan Peralatan Non Medis · 60 bln</td>
                  <td className="r">975.000</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>Pengadaan laptop SIMRS baru</td>
                  <td>Laptop</td>
                  <td className="r">3</td>
                  <td className="r">17.000.000</td>
                  <td className="r">51.000.000</td>
                  <td>Keamanan Data Cyber</td>
                  <td>Feb</td>
                  <td>
                    <span className="chip nt">Keep Operation</span>
                  </td>
                  <td>5.4.3 Biaya Penyusutan Peralatan Non Medis · 60 bln</td>
                  <td className="r">8.500.000</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>Penggantian laptop staf pengadaan</td>
                  <td>Laptop</td>
                  <td className="r">3</td>
                  <td className="r">11.000.000</td>
                  <td className="r">33.000.000</td>
                  <td>Pengadaan Barang dan Jasa</td>
                  <td>Feb</td>
                  <td>
                    <span className="chip nt">Keep Operation</span>
                  </td>
                  <td>5.4.3 Biaya Penyusutan Peralatan Non Medis · 60 bln</td>
                  <td className="r">5.500.000</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <b>Total Laptop &amp; PC: Rp 98.000.000</b>{' '}
            <span className="lb">· Penyusutan 2027: Rp 16.225.000</span>{' '}
            <span className="lb">· 4 baris · 4 unit</span>
          </div>
        </>
      )}

      {/* TAB 4: DIKLAT & TENAGA */}
      {activeTab === 'diklat' && (
        <>
          <div className="card" style={{ background: '#ECE8F5', borderColor: '#CFC8E6', color: '#3A3F63' }}>
            Dua jenis dalam satu form: Diklat (ada nilai rupiah) dan Tenaga Kerja (hanya jumlah orang, tanpa nilai). Nilai
            rupiah dikunci otomatis saat jenis Tenaga Kerja dipilih.
          </div>
          <div className="card sc">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Jenis</th>
                  <th>Kebutuhan</th>
                  <th className="r">Qty</th>
                  <th className="r">Nilai rupiah</th>
                  <th>Unit</th>
                  <th>Jadwal</th>
                  <th>Prioritas</th>
                </tr>
              </thead>
              <tbody>
                {diklatItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.jenis}</td>
                    <td>{item.kebutuhan}</td>
                    <td className="r">{item.qty}</td>
                    <td className="r">{item.nilai ? item.nilai.toLocaleString('id-ID') : '-'}</td>
                    <td>{item.unit}</td>
                    <td>{item.jadwal}</td>
                    <td>
                      <span className="chip nt">{item.prioritas}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Tambah kebutuhan</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px' }}>
              <label htmlFor="dj">
                Jenis
                <select id="dj" value={diklatJenis} onChange={(e) => setDiklatJenis(e.target.value)}>
                  <option>Diklat</option>
                  <option>Tenaga Kerja</option>
                </select>
              </label>
              <label htmlFor="dk">
                Kebutuhan
                <input id="dk" value={diklatKebutuhan} onChange={(e) => setDiklatKebutuhan(e.target.value)} />
              </label>
              <label htmlFor="dq">
                Qty
                <input id="dq" type="number" min="1" value={diklatQty} onChange={(e) => setDiklatQty(parseInt(e.target.value, 10) || 1)} />
              </label>
              <label htmlFor="dn">
                Nilai rupiah
                <input
                  id="dn"
                  value={diklatJenis === 'Tenaga Kerja' ? '-' : diklatNilai}
                  disabled={diklatJenis === 'Tenaga Kerja'}
                  onChange={(e) => setDiklatNilai(parseInt(e.target.value, 10) || 0)}
                  style={{ background: diklatJenis === 'Tenaga Kerja' ? '#F3F1EA' : '#fff' }}
                />
              </label>
              <label htmlFor="dc">
                Jadwal
                <select id="dc" value={diklatJadwal} onChange={(e) => setDiklatJadwal(e.target.value)}>
                  <option>Mei</option>
                  <option>Apr</option>
                  <option>Mar</option>
                  <option>Sesuai jadwal pelaksanaan</option>
                </select>
              </label>
              <label htmlFor="dp">
                Prioritas
                <select id="dp" value={diklatPrioritas} onChange={(e) => setDiklatPrioritas(e.target.value)}>
                  <option>Regulasi</option>
                  <option>Improvement</option>
                  <option>Strategic</option>
                  <option>Keep Operation</option>
                </select>
              </label>
              <label htmlFor="ds">
                Strategi objektif
                <input id="ds" placeholder="Opsional" />
              </label>
              <label htmlFor="dkp">
                KPI
                <input id="dkp" placeholder="Opsional" />
              </label>
              <label htmlFor="dpk">
                Program kerja
                <input id="dpk" placeholder="Opsional" />
              </label>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              Perlu konfirmasi: nilai rupiah dihitung per peserta atau total kebutuhan, dan apakah “Sesuai jadwal
              pelaksanaan” tetap diizinkan sebagai jadwal.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="btn" onClick={handleAddDiklat}>
                Simpan baris
              </button>
              <button
                type="button"
                className="btn b2"
                onClick={() => alert('Kebutuhan Diklat & Tenaga diajukan ke Manager!')}
              >
                Ajukan ke Manager
              </button>
            </div>
          </div>
        </>
      )}

      {/* TAB 5: USULAN RKAP SDM */}
      {activeTab === 'sdm' && (
        <>
          <div className="card" style={{ background: '#ECE8F5', borderColor: '#CFC8E6', color: '#3A3F63' }}>
            Prognosa = realisasi s.d. Agustus + estimasi 4 bulan sisa (rata-rata bulanan x 4). Usulan 2027 = prognosa x (1 +
            persentase kenaikan). Kolom kuning dapat diisi.
          </div>

          <div className="card sc">
            <table>
              <thead>
                <tr>
                  <th>COA</th>
                  <th>Nama</th>
                  <th className="r">RKAP 2026</th>
                  <th className="r">Real s.d. Agt</th>
                  <th className="r">Estimasi 4 bln</th>
                  <th className="r">Prognosa</th>
                  <th>Kenaikan (%)</th>
                  <th className="r">Usulan 2027</th>
                  <th className="r">vs RKAP 2026</th>
                  <th className="r">vs Prognosa</th>
                </tr>
              </thead>
              <tbody>
                {sdmItems.map((item) => {
                  const usulan = Math.round(item.prognosa * (1 + item.kenaikan / 100));
                  const vsRkap = ((usulan / item.rkap2026) * 100).toFixed(1).replace('.', ',');
                  const vsProg = ((usulan / item.prognosa) * 100).toFixed(1).replace('.', ',');
                  return (
                    <tr key={item.coa}>
                      <td>{item.coa}</td>
                      <td>{item.nama}</td>
                      <td className="r">{item.rkap2026.toLocaleString('id-ID')}</td>
                      <td className="r">{item.realAgt.toLocaleString('id-ID')}</td>
                      <td className="r">{item.est4bln.toLocaleString('id-ID')}</td>
                      <td className="r">{item.prognosa.toLocaleString('id-ID')}</td>
                      <td>
                        <input
                          aria-label={`Kenaikan ${item.nama}`}
                          value={item.kenaikan}
                          onChange={(e) => handleSdmKenaikanChange(item.coa, e.target.value)}
                          style={{ width: '64px', background: '#FFF6D6' }}
                        />
                      </td>
                      <td className="r">{usulan.toLocaleString('id-ID')}</td>
                      <td className="r">{vsRkap}%</td>
                      <td className="r">{vsProg}%</td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: 700, background: '#F3F1EA' }}>
                  <td colSpan={2}>Total biaya tenaga kerja</td>
                  <td className="r">70.200</td>
                  <td className="r">39.170</td>
                  <td className="r">19.585</td>
                  <td className="r">58.755</td>
                  <td />
                  <td className="r">60.395</td>
                  <td className="r">86,0%</td>
                  <td className="r">102,8%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="chip ok" role="status">
              Tersimpan otomatis · 08:15
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => alert('Usulan RKAP SDM berhasil diajukan ke Manager!')}
            >
              Ajukan ke Manager
            </button>
          </div>
        </>
      )}
    </main>
  );
}
