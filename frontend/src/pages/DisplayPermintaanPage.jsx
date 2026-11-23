import PageHeader from '../components/common/PageHeader';
import DisplaySubNav from '../components/display/DisplaySubNav';
import Card from '../components/common/Card';

export default function DisplayPermintaanPage() {
  return (
    <>
      <PageHeader title="Display · Permintaan" />
      <DisplaySubNav />

      <div
        className="card"
        style={{
          background: '#ECE8F5',
          borderColor: '#CFC8E6',
          color: '#3A3F63',
        }}
      >
        Tampilan baca-saja lintas unit dan dokumen sesuai hak akses Anda. Untuk mengubah isian, buka Entry.
      </div>

      <Card style={{ padding: '48px 24px', textAlign: 'center', background: '#fff' }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#1F2233', marginBottom: '8px' }}>
          Belum tersedia (Fase 2)
        </div>
        <div style={{ fontSize: '13px', color: '#5E6070', maxWidth: '460px', margin: '0 auto' }}>
          Modul monitoring riwayat permintaan barang dan alokasi anggaran akan diaktifkan pada Fase 2.
        </div>
      </Card>
    </>
  );
}
