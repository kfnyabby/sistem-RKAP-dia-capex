import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function PengaturanPeriodePage() {
  return (
    <>
      <PageHeader
        title="Pengaturan Periode & Pengajuan"
        chips={<Chip variant="nt">Khusus Akuntansi</Chip>}
      />

      <Card>
        <h2>Jadwal Periode & Kontrol Akses Pengajuan</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Atur batas waktu pengisian anggaran (*fill deadline*), batas waktu telaah (*review deadline*), dan override akses unit.
        </p>
      </Card>
    </>
  );
}
