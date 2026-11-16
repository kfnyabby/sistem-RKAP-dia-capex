import { useState } from 'react';

export default function DisplayPage() {
  const [selectedReq, setSelectedReq] = useState('002');
  const [catatan, setCatatan] = useState('Sisa anggaran mencukupi.');

  const requests = [
    { no: '001', unit: '[9220] MCU', item: 'Kertas HVS 20 rim (5.8.3)', nilai: 960000, sisa: 3300000, status: 'Menunggu Manager', badge: 'wn' },
    { no: '002', unit: '[9712] Klinik Gigi PPS', item: 'Suku cadang medis (5.2.4)', nilai: 45000000, sisa: 77000000, status: 'Menunggu Akuntansi', badge: 'wn' },
    { no: '003', unit: '[9805] Depo Obat Bogorejo', item: 'Cetak formulir (5.8.3)', nilai: 2500000, sisa: -300000, status: 'Melebihi sisa', badge: 'bd' },
    { no: '004', unit: '[9815] Depo Obat Rembang', item: 'Alat tulis (5.8.2)', nilai: 750000, sisa: 9000000, status: 'ACC', badge: 'ok' },
  ];

  const currentReq = requests.find((r) => r.no === selectedReq) || requests[1];

  return (
    <main className="mn">
      <div className="hd">
        <h1>Display · Permintaan Anggaran</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="chip wn">Fase 2</span>
          <span className="chip wn">Data contoh</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="card sc" style={{ flex: 2, minWidth: '540px' }}>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Unit</th>
                <th>Permintaan</th>
                <th className="r">Nilai</th>
                <th className="r">Sisa anggaran COA</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.no} style={{ background: selectedReq === r.no ? '#FAF7F2' : 'transparent' }}>
                  <td>{r.no}</td>
                  <td>{r.unit}</td>
                  <td>{r.item}</td>
                  <td className="r">{r.nilai.toLocaleString('id-ID')}</td>
                  <td className="r" style={{ color: r.sisa < 0 ? '#8A1F1B' : 'inherit' }}>
                    {r.sisa.toLocaleString('id-ID')}
                  </td>
                  <td>
                    <span className={`chip ${r.badge}`}>{r.status}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn ${selectedReq === r.no ? '' : 'b2'}`}
                      style={{ minHeight: '36px', padding: '0 12px' }}
                      onClick={() => setSelectedReq(r.no)}
                    >
                      Pilih
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ flex: 1, minWidth: '300px' }}>
          <h2>Form ACC Anggaran No. {currentReq.no}</h2>
          <p style={{ margin: '0 0 6px' }}>Unit: {currentReq.unit}</p>
          <p style={{ margin: '0 0 6px' }}>{currentReq.item} · Rp {currentReq.nilai.toLocaleString('id-ID')}</p>
          <p style={{ margin: '0 0 10px', color: '#5E6070', fontSize: '13px' }}>
            RKAP Rp 640.000.000 · Realisasi Rp 563.000.000 · Sisa Rp {currentReq.sisa.toLocaleString('id-ID')}
          </p>
          <label htmlFor="ca">
            Catatan Akuntansi
            <textarea
              id="ca"
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => alert(`Permintaan No. ${currentReq.no} disetujui (ACC)!`)}
            >
              ACC
            </button>
            <button
              type="button"
              className="btn b3"
              onClick={() => alert(`Permintaan No. ${currentReq.no} ditolak!`)}
            >
              Tolak
            </button>
            <button
              type="button"
              className="btn b2"
              onClick={() => alert(`Mengunduh PDF Form ACC No. ${currentReq.no}...`)}
            >
              Unduh PDF
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
