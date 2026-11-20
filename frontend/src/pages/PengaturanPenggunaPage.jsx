import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function PengaturanPenggunaPage() {
  return (
    <>
      <PageHeader
        title="Pengguna & Penugasan Unit"
        chips={<Chip variant="nt">Khusus Akuntansi</Chip>}
      />

      <Card>
        <h2>Manajemen Pengguna & Hak Akses Unit Kerja</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Daftar pengguna sistem, penetapan peran (PIC, Manager, Akuntansi), dan pembagian wewenang unit kerja.
        </p>
      </Card>
    </>
  );
}
