import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function LaporanRekapPage() {
  return (
    <>
      <PageHeader
        title="Rekap Gabungan CN & CNH"
        chips={<Chip variant="nt">Konsolidasi Perusahaan</Chip>}
      />

      <Card>
        <h2>Laporan Anggaran Konsolidasi</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Rekapitulasi total anggaran dan realisasi per unit kerja PT Cipta Nirmala (CN) dan Cipta Nirmala Husada (CNH).
        </p>
      </Card>
    </>
  );
}
