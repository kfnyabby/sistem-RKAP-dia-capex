import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function RealisasiPage() {
  return (
    <>
      <PageHeader
        title="Input Realisasi"
        chips={<Chip variant="nt">Buku Jurnal Umum</Chip>}
      />

      <Card>
        <h2>Unggah & Monitoring Jurnal Realisasi Keuangan</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Impor batch daftar transaksi jurnal untuk menghitung realisasi pemakaian anggaran per unit dan COA (BR-05).
        </p>
      </Card>
    </>
  );
}
