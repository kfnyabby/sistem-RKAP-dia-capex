import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function PengaturanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'periode';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // State for Periode & Pengajuan
  const [fillDeadline, setFillDeadline] = useState('2026-11-15');
  const [validDeadline, setValidDeadline] = useState('2026-11-30');
  const [lockDeadline, setLockDeadline] = useState('2026-12-05');
  const [autoClose, setAutoClose] = useState(true);
  const [autoReopen, setAutoReopen] = useState(true);
  const [unitStatuses, setUnitStatuses] = useState([
    { unit: '[9220] MCU', jenis: 'Biaya', status: 'Buka', deadline: '25 Nov 2026', sumber: 'Manual (perpanjangan)' },
    { unit: '[9712] Klinik Gigi PPS', jenis: 'Investasi', status: 'Buka', deadline: '30 Nov 2026', sumber: 'Dikembalikan (otomatis)' },
    { unit: '[9714] Laboratorium PPS', jenis: 'Semua', status: 'Tutup', deadline: '15 Nov 2026', sumber: 'Periode' },
  ]);

  const toggleUnitStatus = (unitName) => {
    setUnitStatuses((items) =>
      items.map((item) =>
        item.unit === unitName
          ? {
              ...item,
              status: item.status === 'Buka' ? 'Tutup' : 'Buka',
              sumber: item.status === 'Buka' ? 'Manual' : 'Manual (perpanjangan)',
            }
          : item
      )
    );
  };

  // State for Pengguna & Penugasan
  const [users, setUsers] = useState([
    { id: 1, nama: 'Rina Pratiwi', role: 'PIC', roleBadge: 'nt', comp: 'CN', unit: '[9220] MCU', status: 'Aktif' },
    { id: 2, nama: 'Budi Santoso', role: 'Manager', roleBadge: 'wn', comp: 'CN', unit: 'Penunjang Medik (6 unit)', status: 'Aktif' },
    { id: 3, nama: 'Andi Kusuma', role: 'PIC', roleBadge: 'nt', comp: 'CNH', unit: '[9805] Depo Obat Bogorejo', status: 'Aktif' },
    { id: 4, nama: 'Dya Putri', role: 'Akuntansi', roleBadge: 'ok', comp: 'CN dan CNH', unit: 'Semua unit', status: 'Aktif' },
    { id: 5, nama: 'Sari Wulan', role: 'PIC', roleBadge: 'nt', comp: 'CN', unit: '[9714] Laboratorium PPS', status: 'Nonaktif' },
  ]);

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('PIC Unit');
  const [newUserComp, setNewUserComp] = useState('CN');

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
    setUsers([
      ...users,
      {
        id: nextId,
        nama: newUserName,
        role: newUserRole === 'PIC Unit' ? 'PIC' : newUserRole,
        roleBadge: newUserRole === 'Akuntansi' ? 'ok' : newUserRole === 'Manager' ? 'wn' : 'nt',
        comp: newUserComp,
        unit: '[9220] MCU',
        status: 'Aktif',
      },
    ]);
    setNewUserName('');
    setNewUserEmail('');
    alert('Pengguna baru berhasil ditambahkan!');
  };

  return (
    <main className="mn">
      <div className="hd">
        <h1>
          Pengaturan · {activeTab === 'periode' ? 'Periode dan Pengajuan' : activeTab === 'master' ? 'Master Data' : activeTab === 'pengguna' ? 'Pengguna dan Penugasan Unit' : activeTab === 'kategori' ? 'Kategori Investasi dan Kelompok Biaya' : 'Audit Log'}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip nt">
            {activeTab === 'periode' ? 'CN · RKAP 2027' : 'Akuntansi'}
          </span>
          <span className="chip wn">Data contoh</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="row">
        <button
          type="button"
          onClick={() => setTab('periode')}
          className={`chip ${activeTab === 'periode' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Periode &amp; Pengajuan
        </button>
        <button
          type="button"
          onClick={() => setTab('master')}
          className={`chip ${activeTab === 'master' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Master Data
        </button>
        <button
          type="button"
          onClick={() => setTab('pengguna')}
          className={`chip ${activeTab === 'pengguna' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Pengguna &amp; Penugasan
        </button>
        <button
          type="button"
          onClick={() => setTab('kategori')}
          className={`chip ${activeTab === 'kategori' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Kategori &amp; Kelompok Biaya
        </button>
        <button
          type="button"
          onClick={() => setTab('audit')}
          className={`chip ${activeTab === 'audit' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Audit Log
        </button>
      </div>

      {/* TAB 1: PERIODE & PENGAJUAN */}
      {activeTab === 'periode' && (
        <>
          <div className="card">
            <h2>Deadline per tahap</h2>
            <div className="row">
              <label htmlFor="d1">
                Pengisian
                <input id="d1" type="date" value={fillDeadline} onChange={(e) => setFillDeadline(e.target.value)} />
              </label>
              <label htmlFor="d2">
                Validasi
                <input id="d2" type="date" value={validDeadline} onChange={(e) => setValidDeadline(e.target.value)} />
              </label>
              <label htmlFor="d3">
                Lock
                <input id="d3" type="date" value={lockDeadline} onChange={(e) => setLockDeadline(e.target.value)} />
              </label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1F2233' }}>
                <input
                  type="checkbox"
                  checked={autoClose}
                  onChange={(e) => setAutoClose(e.target.checked)}
                  style={{ minHeight: '20px' }}
                />
                Tutup otomatis saat deadline
              </label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1F2233' }}>
                <input
                  type="checkbox"
                  checked={autoReopen}
                  onChange={(e) => setAutoReopen(e.target.checked)}
                  style={{ minHeight: '20px' }}
                />
                Buka otomatis saat dokumen dikembalikan
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => alert('Deadline periode RKAP 2027 berhasil disimpan!')}
              >
                Simpan deadline
              </button>
              <button
                type="button"
                className="btn b3"
                onClick={() => alert('Pengajuan untuk periode RKAP 2027 ditutup manual oleh Akuntansi!')}
              >
                Tutup pengajuan periode
              </button>
            </div>
          </div>

          <div className="card sc">
            <h2>Status per unit</h2>
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Jenis</th>
                  <th>Status</th>
                  <th>Deadline efektif</th>
                  <th>Sumber</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {unitStatuses.map((item) => (
                  <tr key={item.unit}>
                    <td>{item.unit}</td>
                    <td>{item.jenis}</td>
                    <td>
                      <span className={`chip ${item.status === 'Buka' ? 'ok' : 'bd'}`}>{item.status}</span>
                    </td>
                    <td>{item.deadline}</td>
                    <td>{item.sumber}</td>
                    <td>
                      <button
                        type="button"
                        className={`btn ${item.status === 'Buka' ? 'b2' : ''}`}
                        style={{ minHeight: '34px', padding: '0 12px' }}
                        onClick={() => toggleUnitStatus(item.unit)}
                      >
                        {item.status === 'Buka' ? 'Tutup' : 'Buka kembali'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: MASTER DATA */}
      {activeTab === 'master' && (
        <>
          <div className="card">
            <h2>Hasil pemeriksaan import terakhir · Master_Barang_Logistik.xlsx</h2>
            <div className="g4">
              <div>
                <div className="lb">Barang dibaca</div>
                <div className="vl">3.204</div>
              </div>
              <div>
                <div className="lb">Cocok dengan spreadsheet RKAP</div>
                <div className="vl">3.080</div>
              </div>
              <div>
                <div className="lb">Barang baru</div>
                <div className="vl">124</div>
              </div>
              <div>
                <div className="lb">Tanpa COA</div>
                <div className="vl">0</div>
              </div>
            </div>
            <p style={{ margin: '12px 0 0' }}>
              <span className="chip wn" style={{ marginRight: '6px' }}>35 barang COA-nya berubah</span>
              <span className="chip wn" style={{ marginRight: '6px' }}>52 barang HPP 0</span>
              <span className="chip wn">1 barang ada di spreadsheet, tidak ada di master</span>
            </p>
          </div>

          <div className="card" style={{ background: '#FBE8C8', borderColor: '#E3C58A', color: '#5C3600' }}>
            <b>Harga:</b> master ini cocok dengan harga spreadsheet CN (2.822 dari 3.067 barang), tetapi hanya 239 dari
            2.619 barang CNH. CNH perlu master atau daftar harganya sendiri.
          </div>

          <div className="row">
            <label htmlFor="sb">
              Cari barang
              <input id="sb" placeholder="Nama atau kode produk" />
            </label>
            <label htmlFor="sc">
              COA biaya
              <select id="sc">
                <option>Semua COA</option>
                <option>5.8.3 Biaya Cetak &amp; Fotocopy</option>
                <option>5.8.2 Biaya Pemakaian Alat Perkantoran</option>
              </select>
            </label>
            <label htmlFor="sg">
              Golongan
              <select id="sg">
                <option>Semua golongan</option>
                <option>Bahan Cetakan</option>
                <option>Alat Tulis Kantor</option>
              </select>
            </label>
            <label htmlFor="ss">
              Status
              <select id="ss">
                <option>Aktif</option>
                <option>Tidak aktif</option>
              </select>
            </label>
            <button
              type="button"
              className="btn b2"
              onClick={() => alert('Fitur import master Excel (dry-run/validasi) siap.')}
            >
              Import master (xlsx)
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => alert('Modal Tambah Barang baru siap.')}
            >
              Tambah barang
            </button>
          </div>

          <div className="card sc">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID</th>
                  <th>Kode produk</th>
                  <th>Nama barang</th>
                  <th>Golongan</th>
                  <th>Satuan beli</th>
                  <th className="r">HPP</th>
                  <th>COA biaya</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>1</td>
                  <td>6L</td>
                  <td>6-002- AMPLOP COKLAT PT. CN 1/2 FOLIO</td>
                  <td>Bahan Cetakan</td>
                  <td>Lembar</td>
                  <td className="r">644</td>
                  <td>5.8.3 Biaya Cetak &amp; Fotocopy</td>
                  <td>
                    <span className="chip ok">Aktif</span>
                  </td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>3</td>
                  <td>6L</td>
                  <td>6-004- AMPLOP ECG</td>
                  <td>Bahan Cetakan</td>
                  <td>Lembar</td>
                  <td className="r">794</td>
                  <td>5.8.3 Biaya Cetak &amp; Fotocopy</td>
                  <td>
                    <span className="chip ok">Aktif</span>
                  </td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>6</td>
                  <td>6L</td>
                  <td>6-007- AMPLOP KABINET RSSG (DESIGN)</td>
                  <td>Bahan Cetakan</td>
                  <td>Pak</td>
                  <td className="r">84.249</td>
                  <td>5.8.3 Biaya Cetak &amp; Fotocopy</td>
                  <td>
                    <span className="chip ok">Aktif</span>
                  </td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>7</td>
                  <td>6L</td>
                  <td>6-008- AMPLOP RSSG KECIL (DESIGN B)</td>
                  <td>Bahan Cetakan</td>
                  <td>Pak</td>
                  <td className="r">37.968</td>
                  <td>5.8.3 Biaya Cetak &amp; Fotocopy</td>
                  <td>
                    <span className="chip ok">Aktif</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#5E6070' }}>
            Kolom lain di file (produsen, satuan jual, stok minimum dan maksimum, COA persediaan, kategori COA)
            tersimpan tetapi tidak ditampilkan di tabel ini. Semua baris di file contoh berstatus Aktif.
          </p>
        </>
      )}

      {/* TAB 3: PENGGUNA & PENUGASAN */}
      {activeTab === 'pengguna' && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="card sc" style={{ flex: 2, minWidth: '520px' }}>
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Role</th>
                  <th>Perusahaan</th>
                  <th>Unit ditugaskan</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nama}</td>
                    <td>
                      <span className={`chip ${u.roleBadge}`}>{u.role}</span>
                    </td>
                    <td>{u.comp}</td>
                    <td>{u.unit}</td>
                    <td>
                      <span className={`chip ${u.status === 'Aktif' ? 'ok' : 'bd'}`}>{u.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn ${u.status === 'Aktif' ? 'b2' : ''}`}
                        style={{ minHeight: '34px', padding: '0 12px' }}
                        onClick={() => {
                          setUsers((prev) =>
                            prev.map((item) =>
                              item.id === u.id
                                ? { ...item, status: item.status === 'Aktif' ? 'Nonaktif' : 'Aktif' }
                                : item
                            )
                          );
                        }}
                      >
                        {u.status === 'Aktif' ? 'Ubah' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ flex: 1, minWidth: '300px' }}>
            <h2>Tambah pengguna</h2>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label htmlFor="un">
                Nama
                <input id="un" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
              </label>
              <label htmlFor="ue">
                Email
                <input id="ue" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required />
              </label>
              <label htmlFor="ur">
                Role
                <select id="ur" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                  <option>PIC Unit</option>
                  <option>Manager</option>
                  <option>Akuntansi</option>
                </select>
              </label>
              <label htmlFor="uc">
                Perusahaan
                <select id="uc" value={newUserComp} onChange={(e) => setNewUserComp(e.target.value)}>
                  <option>CN</option>
                  <option>CNH</option>
                  <option>CN dan CNH</option>
                </select>
              </label>
              <fieldset style={{ border: '1px solid #B9B4C9', borderRadius: '6px', padding: '8px 12px' }}>
                <legend style={{ fontSize: '12px', color: '#5E6070' }}>Unit ditugaskan</legend>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1F2233', minHeight: '32px' }}>
                  <input type="checkbox" defaultChecked style={{ minHeight: '20px' }} />
                  [9220] MCU
                </label>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1F2233', minHeight: '32px' }}>
                  <input type="checkbox" style={{ minHeight: '20px' }} />
                  [9712] Klinik Gigi PPS
                </label>
              </fieldset>
              <button type="submit" className="btn">
                Simpan pengguna
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: KATEGORI & KELOMPOK BIAYA */}
      {activeTab === 'kategori' && (
        <>
          <div className="card sc">
            <h2>Kategori investasi, masa manfaat, dan COA penyusutan</h2>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Kategori investasi</th>
                  <th className="r">Masa manfaat (bulan)</th>
                  <th>Kode COA</th>
                  <th>Nama COA</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>BANGUNAN</td>
                  <td className="r">120</td>
                  <td>5.4.1</td>
                  <td>Biaya Penyusutan Bangunan</td>
                  <td><button type="button" className="btn b2" style={{ minHeight: '32px', padding: '0 12px' }}>Ubah</button></td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>PERALATAN MEDIS</td>
                  <td className="r">60</td>
                  <td>5.4.2</td>
                  <td>Biaya Penyusutan Peralatan Medis</td>
                  <td><button type="button" className="btn b2" style={{ minHeight: '32px', padding: '0 12px' }}>Ubah</button></td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>PERALATAN NON MEDIS</td>
                  <td className="r">60</td>
                  <td>5.4.3</td>
                  <td>Biaya Penyusutan Peralatan Non Medis</td>
                  <td><button type="button" className="btn b2" style={{ minHeight: '32px', padding: '0 12px' }}>Ubah</button></td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>KENDARAAN</td>
                  <td className="r">48</td>
                  <td>5.4.4</td>
                  <td>Biaya Penyusutan Kendaraan</td>
                  <td><button type="button" className="btn b2" style={{ minHeight: '32px', padding: '0 12px' }}>Ubah</button></td>
                </tr>
                <tr>
                  <td>5</td>
                  <td>ASET TAK BERWUJUD</td>
                  <td className="r">48</td>
                  <td>5.4.5</td>
                  <td>Amortisasi Aset Tak Berwujud</td>
                  <td><button type="button" className="btn b2" style={{ minHeight: '32px', padding: '0 12px' }}>Ubah</button></td>
                </tr>
                <tr>
                  <td>6</td>
                  <td>PC/LAPTOP</td>
                  <td className="r">60</td>
                  <td>5.4.3</td>
                  <td>Biaya Penyusutan Peralatan Non Medis</td>
                  <td><button type="button" className="btn b2" style={{ minHeight: '32px', padding: '0 12px' }}>Ubah</button></td>
                </tr>
                <tr>
                  <td>7</td>
                  <td>AC 2 PK</td>
                  <td className="r">60</td>
                  <td>5.4.3</td>
                  <td>Biaya Penyusutan Peralatan Non Medis</td>
                  <td><button type="button" className="btn b2" style={{ minHeight: '32px', padding: '0 12px' }}>Ubah</button></td>
                </tr>
              </tbody>
            </table>
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              Dipakai di Entry Anggaran Investasi: kategori yang dipilih menentukan COA dan susut otomatis.
              Penyusutan = Jumlah ÷ Masa manfaat × (12 − bulan rencana, Januari = 1).
            </p>
          </div>

          <div className="card sc">
            <h2>Kelompok biaya (Jenis COA)</h2>
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Kelompok</th>
                  <th className="r">Jumlah COA</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>4.1</td><td>Biaya Bahan Medis</td><td className="r">7</td></tr>
                <tr><td>4.2</td><td>Biaya Bahan Non medis</td><td className="r">6</td></tr>
                <tr><td>5.1</td><td>Biaya Tenaga Kerja</td><td className="r">14</td></tr>
                <tr><td>5.2</td><td>Biaya Pemeliharaan</td><td className="r">9</td></tr>
                <tr><td>5.3</td><td>Biaya Sewa</td><td className="r">5</td></tr>
                <tr><td>5.4</td><td>Biaya Penyusutan</td><td className="r">5</td></tr>
                <tr><td>5.5</td><td>Biaya Asuransi</td><td className="r">4</td></tr>
                <tr><td>5.6</td><td>Biaya Pajak</td><td className="r">5</td></tr>
                <tr><td>5.7</td><td>Biaya Umum</td><td className="r">10</td></tr>
                <tr><td>5.8</td><td>Biaya Administrasi</td><td className="r">4</td></tr>
                <tr><td>5.9</td><td>Biaya Pemasaran</td><td className="r">2</td></tr>
                <tr><td>5.99</td><td>Biaya Lain</td><td className="r">4</td></tr>
              </tbody>
            </table>
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              Kelompok 5.x berasal dari sheet Kategori Biaya. Kelompok 4.1 dan 4.2 ada di template ERP (sheet BIAYA CN)
              tetapi belum ada di sheet Kategori Biaya; jumlah COA-nya dihitung dari Master COA.
            </p>
          </div>
        </>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === 'audit' && (
        <>
          <div className="row">
            <label htmlFor="ae">
              Entitas
              <select id="ae">
                <option>Semua</option>
                <option>Dokumen anggaran</option>
                <option>Periode</option>
                <option>Master</option>
              </select>
            </label>
            <label htmlFor="ap">
              Pengguna
              <input id="ap" placeholder="Nama" />
            </label>
            <label htmlFor="a1">
              Dari
              <input id="a1" type="date" defaultValue="2026-10-01" />
            </label>
            <label htmlFor="a2">
              Sampai
              <input id="a2" type="date" defaultValue="2026-10-31" />
            </label>
            <button
              type="button"
              className="btn b2"
              onClick={() => alert('Exporting Audit Log to Excel...')}
            >
              Export Excel
            </button>
          </div>

          <div className="card sc">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pengguna</th>
                  <th>Aksi</th>
                  <th>Entitas</th>
                  <th>Perubahan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>26 Okt 08:20</td>
                  <td>Rina Pratiwi</td>
                  <td><span className="chip nt">Ubah</span></td>
                  <td>Baris biaya Kertas HVS (MCU)</td>
                  <td>Qty 30 → 36</td>
                </tr>
                <tr>
                  <td>26 Okt 08:30</td>
                  <td>Rina Pratiwi</td>
                  <td><span className="chip nt">Ajukan</span></td>
                  <td>Dokumen Biaya [9220] MCU</td>
                  <td>DRAFT → DIAJUKAN</td>
                </tr>
                <tr>
                  <td>27 Okt 10:10</td>
                  <td>Budi Santoso</td>
                  <td><span className="chip wn">Kembalikan</span></td>
                  <td>Dokumen Biaya [9220] MCU</td>
                  <td>Catatan: qty cetak terlalu tinggi</td>
                </tr>
                <tr>
                  <td>27 Okt 10:10</td>
                  <td>Sistem</td>
                  <td><span className="chip ok">Buka otomatis</span></td>
                  <td>Akses unit [9220] MCU (Biaya)</td>
                  <td>TUTUP → BUKA sampai 30 Nov</td>
                </tr>
                <tr>
                  <td>15 Nov 17:00</td>
                  <td>Sistem</td>
                  <td><span className="chip bd">Tutup otomatis</span></td>
                  <td>Periode RKAP 2027 CN</td>
                  <td>BUKA → TUTUP (deadline lewat)</td>
                </tr>
                <tr>
                  <td>16 Nov 09:05</td>
                  <td>Dya Putri</td>
                  <td><span className="chip ok">Buka manual</span></td>
                  <td>Akses unit [9712] Klinik Gigi PPS</td>
                  <td>Alasan: perpanjangan, deadline 25 Nov</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#5E6070' }}>
            Log hanya dapat dibaca. Tidak ada tombol ubah atau hapus.
          </p>
        </>
      )}
    </main>
  );
}
