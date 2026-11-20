import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function EntryBiayaPage() {
  return (
    <>
      <PageHeader
        title="Entry Anggaran Biaya"
        chips={<Chip variant="nt">Tersimpan otomatis</Chip>}
      />

      <Card>
        <h2>Daftar Anggaran Biaya Operasional (OPEX)</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Halaman entry rincian usulan anggaran biaya per unit kerja dan akun COA.
        </p>
      </Card>
    </>
  );
}
