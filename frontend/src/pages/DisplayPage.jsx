import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function DisplayPage() {
  return (
    <>
      <PageHeader
        title="Display Permintaan Anggaran"
        chips={<Chip variant="nt">Display &amp; Monitoring</Chip>}
      />

      <Card>
        <h2>Monitoring Penggunaan &amp; Permintaan Anggaran</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Tampilan informasi pagu anggaran, histori permintaan, dan status persetujuan penggunaan dana per unit kerja.
        </p>
      </Card>
    </>
  );
}
