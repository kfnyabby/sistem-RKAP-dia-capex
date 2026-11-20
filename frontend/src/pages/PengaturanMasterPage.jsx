import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function PengaturanMasterPage() {
  return (
    <>
      <PageHeader
        title="Master Data"
        chips={<Chip variant="nt">Khusus Akuntansi</Chip>}
      />

      <Card>
        <h2>Pengaturan Master Barang, Unit Kerja, dan Akun COA</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Kelola master barang dan penetapan harga per perusahaan, hierarki unit kerja, kelompok anggaran, dan bagan akun standar.
        </p>
      </Card>
    </>
  );
}
