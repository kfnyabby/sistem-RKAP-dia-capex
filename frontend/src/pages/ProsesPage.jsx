import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ProsesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'validasi';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  // State for Antrian Validasi
  const [selectedDoc, setSelectedDoc] = useState('mcu');
  const [returnNote, setReturnNote] = useState('Qty cetak terlalu tinggi, mohon dijustifikasi.');
  const [validationDocs, setValidationDocs] = useState([
    { id: 'mcu', unit: '[9220] MCU', type: 'Biaya', total: 12500000, submittedBy: 'Rina Pratiwi', status: 'Diajukan', self: false },
    { id: 'gigi', unit: '[9712] Klinik Gigi PPS', type: 'Investasi', total: 185000000, submittedBy: 'Andi Kusuma', status: 'Diajukan', self: false },
    { id: 'lab', unit: '[9714] Laboratorium PPS', type: 'Biaya', total: 4200000, submittedBy: 'Anda', status: 'Diajukan sendiri', self: true },
  ]);

  const handleApprove = () => {
    setValidationDocs(docs => docs.map(d => d.id === selectedDoc ? { ...d, status: 'Disetujui' } : d));
    alert('Dokumen berhasil DISETUJUI dan diteruskan ke Akuntansi!');
  };

  const handleReturn = () => {
    if (!returnNote.trim()) {
      alert('Catatan wajib diisi saat mengembalikan dokumen (BR-08)!');
      return;
    }
    setValidationDocs(docs => docs.map(d => d.id === selectedDoc ? { ...d, status: 'Dikembalikan' } : d));
    alert('Dokumen DIKEMBALIKAN ke PIC Unit dengan catatan: ' + returnNote);
  };

  // State for Input Realisasi
  const [step, setStep] = useState(2);
  const [mappedUnit1, setMappedUnit1] = useState('[9170] Poli Rawat Jalan');

  return (
    <main className="mn">
      <div className="hd">
        <h1>
          Proses · {activeTab === 'validasi' ? 'Antrian Validasi' : 'Input Realisasi'}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip nt">
            {activeTab === 'validasi' ? 'Manager · Penunjang Medik' : 'Akuntansi · CN'}
          </span>
          <span className="chip wn">Data contoh</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="row">
        <button
          type="button"
          onClick={() => setTab('validasi')}
          className={`chip ${activeTab === 'validasi' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Antrian Validasi
        </button>
        <button
          type="button"
          onClick={() => setTab('realisasi')}
          className={`chip ${activeTab === 'realisasi' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px' }}
        >
          Input Realisasi
        </button>
      </div>

      {/* SUB-PAGE 1: ANTRIAN VALIDASI */}
      {activeTab === 'validasi' && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="card sc" style={{ flex: 2, minWidth: '520px' }}>
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Jenis</th>
                  <th className="r">Total</th>
                  <th>Diajukan oleh</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {validationDocs.map((doc) => (
                  <tr key={doc.id} style={{ background: selectedDoc === doc.id ? '#FAF7F2' : 'transparent' }}>
                    <td>{doc.unit}</td>
                    <td>{doc.type}</td>
                    <td className="r">{doc.total.toLocaleString('id-ID')}</td>
                    <td>{doc.submittedBy}</td>
                    <td>
                      <span className={`chip ${doc.status === 'Disetujui' ? 'ok' : doc.status === 'Dikembalikan' ? 'bd' : doc.self ? 'nt' : 'wn'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td>
                      {doc.self ? (
                        <span className="lb">Tidak dapat disetujui sendiri</span>
                      ) : (
                        <button
                          type="button"
                          className={`btn ${selectedDoc === doc.id ? '' : 'b2'}`}
                          style={{ minHeight: '36px', padding: '0 12px' }}
                          onClick={() => setSelectedDoc(doc.id)}
                        >
                          {selectedDoc === doc.id ? 'Sedang Ditinjau' : 'Tinjau'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ flex: 1, minWidth: '300px' }}>
            <h2>
              {selectedDoc === 'mcu'
                ? '[9220] MCU · Biaya'
                : selectedDoc === 'gigi'
                ? '[9712] Klinik Gigi PPS · Investasi'
                : '[9714] Laboratorium PPS · Biaya'}
            </h2>
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#5E6070' }}>
              {selectedDoc === 'mcu'
                ? 'Total Rp 12.500.000 · 38 baris terisi · naik 18% dari realisasi.'
                : 'Total Rp 185.000.000 · 1 item investasi (USG Portable) · Prioritas Improvement.'}
            </p>
            <label htmlFor="cat">
              Catatan (wajib bila dikembalikan)
              <textarea
                id="cat"
                rows={4}
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
              />
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="btn" onClick={handleApprove}>
                Setujui
              </button>
              <button type="button" className="btn b3" onClick={handleReturn}>
                Kembalikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PAGE 2: INPUT REALISASI */}
      {activeTab === 'realisasi' && (
        <>
          <ol style={{ display: 'flex', gap: '8px', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
            <li>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="chip nt"
                style={{ padding: '8px 16px', fontWeight: step === 1 ? 700 : 400 }}
              >
                1. Unggah
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="chip nt"
                style={{ padding: '8px 16px', fontWeight: step === 2 ? 700 : 400, textDecoration: step === 2 ? 'underline' : 'none' }}
              >
                2. Pratinjau
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="chip nt"
                style={{ padding: '8px 16px', fontWeight: step === 3 ? 700 : 400 }}
              >
                3. Konfirmasi
              </button>
            </li>
          </ol>

          <div className="card">
            <h2>File daftar jurnal (xlsx)</h2>
            <div className="row">
              <label htmlFor="co">
                Perusahaan
                <select id="co">
                  <option>CN</option>
                  <option>CNH</option>
                </select>
              </label>
              <label htmlFor="fx">
                File daftar jurnal
                <input id="fx" type="file" />
              </label>
              <label htmlFor="md">
                Bila bulan ini sudah pernah diunggah
                <select id="md">
                  <option>Ganti data bulan ini (disarankan)</option>
                  <option>Tambahkan saja; lewati ID sub jurnal yang sama</option>
                </select>
              </label>
              <button type="button" className="btn b2" onClick={() => alert('Pratinjau diperbarui!')}>
                Unggah dan pratinjau
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
              Periode terdeteksi dari kolom TANGGAL: <b>Oktober 2026</b> (1 sampai 31 Okt). File ini 620.848 baris dan
              71 MB; dibaca di latar belakang, halaman boleh ditinggalkan. Selesai dibaca dalam 2 menit 40 detik.
            </p>
          </div>

          <div className="g4">
            <div className="card">
              <div className="lb">Baris dibaca</div>
              <div className="vl">620.848</div>
            </div>
            <div className="card">
              <div className="lb">Dipakai sebagai realisasi</div>
              <div className="vl">85.558</div>
              <div className="lb">85.502 biaya · 56 investasi</div>
            </div>
            <div className="card">
              <div className="lb">Dilewati (bukan akun biaya/invest)</div>
              <div className="vl">535.290</div>
              <div className="lb">pendapatan, piutang, hutang, kas</div>
            </div>
            <div className="card">
              <div className="lb">Baris biaya tanpa unit</div>
              <div className="vl" style={{ color: '#8A1F1B' }}>
                41
              </div>
            </div>
          </div>

          <div className="card sc">
            <h2>Pratinjau baris yang dipakai</h2>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Tanggal</th>
                  <th>No. jurnal</th>
                  <th>Unit</th>
                  <th>COA</th>
                  <th>Jenis</th>
                  <th>Uraian</th>
                  <th className="r">Debet</th>
                  <th className="r">Kredit</th>
                  <th className="r">Nilai (D − K)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>15 Okt</td>
                  <td>LOGBP-1939</td>
                  <td>
                    INSTALASI RAWAT JALAN <span className="chip wn">Perlu dipetakan</span>
                  </td>
                  <td>5.8.3 Biaya Cetak &amp; Fotocopy</td>
                  <td>
                    <span className="chip nt">Biaya</span>
                  </td>
                  <td>Pemakaian 1939, (7) Amplop RSSG kecil</td>
                  <td className="r">265.773</td>
                  <td className="r">0</td>
                  <td className="r">265.773</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>14 Okt</td>
                  <td>LOGBP-1932</td>
                  <td>[9026] REKAM MEDIK</td>
                  <td>5.8.3 Biaya Cetak &amp; Fotocopy</td>
                  <td>
                    <span className="chip nt">Biaya</span>
                  </td>
                  <td>Pemakaian 1932, (309) Amplop RSSG</td>
                  <td className="r">108.000</td>
                  <td className="r">0</td>
                  <td className="r">108.000</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>15 Okt</td>
                  <td>LOGBP-1938</td>
                  <td>[8145] Penagihan</td>
                  <td>5.8.2 Biaya Alat Perkantoran</td>
                  <td>
                    <span className="chip nt">Biaya</span>
                  </td>
                  <td>Pemakaian 1938, (1306) Keyboard wireless</td>
                  <td className="r">688.563</td>
                  <td className="r">0</td>
                  <td className="r">688.563</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>13 Okt</td>
                  <td>LOGBP-1919</td>
                  <td>[9140] INSTALASI RAWAT INAP</td>
                  <td>5.2.4 Suku Cadang Medis</td>
                  <td>
                    <span className="chip nt">Biaya</span>
                  </td>
                  <td>Pemakaian 1919, (1614) Manset dewasa</td>
                  <td className="r">39.782</td>
                  <td className="r">0</td>
                  <td className="r">39.782</td>
                </tr>
                <tr>
                  <td>5</td>
                  <td>07 Okt</td>
                  <td>IBA-2997</td>
                  <td>[9185] KEMOTERAPI</td>
                  <td>1.2.1.1.4 Peralatan Medis</td>
                  <td>
                    <span className="chip nt">Investasi</span>
                  </td>
                  <td>Perpindahan COA fixed asset 2997</td>
                  <td className="r">35.000.001</td>
                  <td className="r">0</td>
                  <td className="r">35.000.001</td>
                </tr>
                <tr>
                  <td>6</td>
                  <td>15 Okt</td>
                  <td>IBA-3003</td>
                  <td>[8017] PEMASARAN</td>
                  <td>1.2.1.1.6 Peralatan Non Medis</td>
                  <td>
                    <span className="chip nt">Investasi</span>
                  </td>
                  <td>Perpindahan COA fixed asset 3003</td>
                  <td className="r">8.899.000</td>
                  <td className="r">0</td>
                  <td className="r">8.899.000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="card sc" style={{ flex: 1, minWidth: '420px' }}>
              <h2>Pemetaan unit</h2>
              <table>
                <thead>
                  <tr>
                    <th>Nama unit di file</th>
                    <th className="r">Baris</th>
                    <th>Dipetakan ke</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>INSTALASI RAWAT JALAN</td>
                    <td className="r">782</td>
                    <td>
                      <select
                        aria-label="Petakan INSTALASI RAWAT JALAN"
                        value={mappedUnit1}
                        onChange={(e) => setMappedUnit1(e.target.value)}
                      >
                        <option>Pilih unit</option>
                        <option>[9170] Poli Rawat Jalan</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td>POLI SPESIALIS</td>
                    <td className="r">33</td>
                    <td>
                      <select aria-label="Petakan POLI SPESIALIS">
                        <option>Pilih unit</option>
                        <option>[9171] Poli Spesialis Penyakit Dalam</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td>Gudang Fixed Asset</td>
                    <td className="r">89</td>
                    <td>
                      <select aria-label="Petakan Gudang Fixed Asset">
                        <option>Pilih unit</option>
                        <option>[9010] Gudang Logistik Umum</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#5E6070' }}>
                Pemetaan disimpan dan dipakai lagi di unggahan berikutnya.
              </p>
            </div>

            <div className="card" style={{ flex: 1, minWidth: '420px' }}>
              <h2>Kolom yang dipakai dari file</h2>
              <table>
                <thead>
                  <tr>
                    <th>Kolom di file</th>
                    <th>Dipakai untuk</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>TANGGAL</td>
                    <td>Bulan realisasi</td>
                  </tr>
                  <tr>
                    <td>ID SUB JURNAL, IDGL</td>
                    <td>Penanda unik baris dan nomor jurnal (mencegah data ganda)</td>
                  </tr>
                  <tr>
                    <td>KODE COA, NAMA COA</td>
                    <td>COA; nama dicocokkan sebagai pengecekan</td>
                  </tr>
                  <tr>
                    <td>UNIT</td>
                    <td>Unit kerja (kode dalam kurung)</td>
                  </tr>
                  <tr>
                    <td>DEBET, KREDIT</td>
                    <td>Nilai realisasi</td>
                  </tr>
                  <tr>
                    <td>KETERANGAN</td>
                    <td>Uraian; baris &quot;Pemakaian&quot; dibaca sebagai barang (opsional)</td>
                  </tr>
                  <tr>
                    <td className="lb">Lainnya (CC, sub unit, operasional, dll.)</td>
                    <td className="lb">Tidak dipakai</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Aturan hitung</h2>
            <p style={{ margin: '0 0 6px' }}>
              <b>Biaya:</b> nilai = DEBET − KREDIT pada akun 4.x dan 5.x, dijumlah per COA, unit, dan bulan.
            </p>
            <p style={{ margin: '0 0 6px' }}>
              <b>Investasi:</b> akun aset tetap (1.2.1.1.x). Aset dalam pelaksanaan (1.2.1.3) dipindah ke aset tetap
              lewat jurnal IBA, jadi hanya satu sisi yang dihitung agar tidak ganda. Daftar akun ini dapat diubah di
              Pengaturan.
            </p>
            <p style={{ margin: 0 }}>
              <b>Data ganda:</b> baris dengan ID sub jurnal yang sudah ada diganti, bukan ditambah.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => alert('Import Realisasi berhasil dikonfirmasi dan data disimpan!')}
            >
              Konfirmasi import
            </button>
            <button
              type="button"
              className="btn b3"
              onClick={() => alert('Import realisasi dibatalkan (Rollback)!')}
            >
              Batalkan
            </button>
          </div>
        </>
      )}
    </main>
  );
}
