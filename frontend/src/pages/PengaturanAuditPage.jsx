import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';
import PengaturanSubNav from '../components/pengaturan/PengaturanSubNav';

export default function PengaturanAuditPage() {
  return (
    <>
      <PageHeader
        title="Audit Log"
        chips={<Chip variant="nt">Jejak Aktivitas</Chip>}
      />

      <PengaturanSubNav />

      <Card>
        <h2>Jejak Rekam Mutasi Data & Perubahan Status</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Pemantauan aktivitas perubahan anggaran, penetapan status dokumen, dan konfigurasi sistem dengan catatan siapa, kapan, dan nilai sebelum-sesudah.
        </p>
      </Card>
    </>
  );
}
