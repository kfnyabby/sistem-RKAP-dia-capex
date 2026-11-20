import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function LaporanMatriksPage() {
  return (
    <>
      <PageHeader
        title="Laporan Matriks Unit × COA"
        chips={<Chip variant="nt">Format ERP</Chip>}
      />

      <Card>
        <h2>Matriks Anggaran per Akun COA & Unit Kerja</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Tabel lebar terkelompok berdasarkan Jenis COA dan instalasi dengan total per kelompok serta ekspor lembar sebar Excel.
        </p>
      </Card>
    </>
  );
}
