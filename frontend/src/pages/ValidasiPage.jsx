import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Chip from '../components/common/Chip';

export default function ValidasiPage() {
  return (
    <>
      <PageHeader
        title="Antrian Validasi"
        chips={<Chip variant="wn">Menunggu Telaah</Chip>}
      />

      <Card>
        <h2>Antrian Validasi Dokumen Anggaran</h2>
        <p style={{ color: '#5E6070', fontSize: '13px' }}>
          Daftar dokumen usulan RKAP dari unit kerja yang diajukan untuk ditelaah dan divalidasi oleh Manager dan Akuntansi.
        </p>
      </Card>
    </>
  );
}
