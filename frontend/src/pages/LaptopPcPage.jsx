import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function LaptopPcPage() {
  return (
    <>
      <PageHeader
        title="Laptop & PC"
        chips={<Chip variant="nt">Konsolidasi Pengadaan</Chip>}
      />

      <Card>
        <h2>Daftar Usulan Perangkat Komputer Lintas Unit</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Tampilan rekapitulasi kebutuhan pengadaan Laptop dan PC dari seluruh unit kerja untuk efisiensi pengadaan terpusat.
        </p>
      </Card>
    </>
  );
}
