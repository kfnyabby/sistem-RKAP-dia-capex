import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function EntryInvestasiPage() {
  return (
    <>
      <PageHeader
        title="Entry Anggaran Investasi"
        chips={<Chip variant="nt">Tersimpan otomatis</Chip>}
      />

      <Card>
        <h2>Usulan Belanja Modal / DIA CAPEX</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Halaman entry item belanja modal investasi dengan kalkulasi otomatis COA, masa manfaat, dan beban penyusutan tahun berjalan.
        </p>
      </Card>
    </>
  );
}
