import { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { newItemRequestApi } from '../../api/newItemRequest.api';
import RupiahInput from '../common/RupiahInput';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

export default function NewItemRequestPicCard({
  docId: propDocId,
  isReadOnly: propIsReadOnly = false,
  onSubmitted,
  doc,
  disabled = false,
  onLineAdded,
}) {
  const queryClient = useQueryClient();
  const docId = propDocId || doc?.id;
  const isReadOnly = propIsReadOnly || disabled;
  const notifyChanged = onSubmitted || onLineAdded;

  const [formData, setFormData] = useState({
    name: '',
    spec: '',
    uom: '',
    qty: '',
    est_price: '',
    reason: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Ambil data permintaan barang baru
  const {
    data: requestsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['newItemRequests', docId],
    queryFn: async () => {
      if (!docId) return [];
      const res = await newItemRequestApi.getRequestsByDocId(docId);
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!docId,
  });

  const requests = requestsData || [];

  // 2. Mutasi Tambah Draft
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await newItemRequestApi.createDraftRequest(docId, data);
    },
    onSuccess: () => {
      setFormData({
        name: '',
        spec: '',
        uom: '',
        qty: '',
        est_price: '',
        reason: '',
      });
      setErrorMsg('');
      setSuccessMsg('Draft permintaan barang baru berhasil ditambahkan.');
      queryClient.invalidateQueries({ queryKey: ['newItemRequests', docId] });
    },
    onError: (err) => {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Gagal menambahkan permintaan barang.'
      );
    },
  });

  // 3. Mutasi Hapus Draft
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await newItemRequestApi.deleteDraftRequest(id);
    },
    onSuccess: () => {
      setSuccessMsg('Draft permintaan barang berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['newItemRequests', docId] });
    },
    onError: (err) => {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Gagal menghapus draft permintaan.'
      );
    },
  });

  // 4. Mutasi Kirim ke Akuntansi
  const sendMutation = useMutation({
    mutationFn: async () => {
      return await newItemRequestApi.sendRequests(docId);
    },
    onSuccess: (res) => {
      setErrorMsg('');
      setSuccessMsg(res?.message || 'Permintaan barang baru berhasil dikirim ke Akuntansi.');
      queryClient.invalidateQueries({ queryKey: ['newItemRequests', docId] });
      if (notifyChanged) notifyChanged();
    },
    onError: (err) => {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Gagal mengirim permintaan ke Akuntansi.'
      );
    },
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    const mapField = {
      nn: 'name',
      ns: 'spec',
      nu: 'uom',
      nq: 'qty',
      nh: 'est_price',
      na: 'reason',
    };
    const field = mapField[id];
    if (field) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!docId) {
      setErrorMsg('Dokumen anggaran belum tersimpan.');
      return;
    }
    if (!formData.name.trim() || !formData.uom.trim()) {
      setErrorMsg('Nama barang dan satuan wajib diisi.');
      return;
    }
    const qtyNum = parseFloat(formData.qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg('Kuantitas (Qty) harus lebih besar dari 0.');
      return;
    }
    const estPriceNum = parseInt(formData.est_price, 10);
    if (isNaN(estPriceNum) || estPriceNum < 0) {
      setErrorMsg('Estimasi harga satuan harus berupa angka tidak negatif.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    createMutation.mutate({
      name: formData.name.trim(),
      spec: formData.spec.trim(),
      uom: formData.uom.trim(),
      qty: qtyNum,
      est_price: estPriceNum,
      reason: formData.reason.trim(),
    });
  };

  const handleSendToAccounting = () => {
    const draftCount = requests.filter((r) => r.status === 'DRAFT').length;
    if (draftCount === 0) {
      setErrorMsg('Tidak ada permintaan barang baru berstatus draft yang dapat dikirim.');
      return;
    }
    if (
      !window.confirm(
        `Kirim ${draftCount} permintaan barang baru ke Akuntansi? Setelah dikirim, Akuntansi akan menetapkan COA dan barang belum masuk ke total sampai COA ditentukan.`
      )
    ) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    sendMutation.mutate();
  };

  const draftRequests = requests.filter((r) => r.status === 'DRAFT');

  return (
    <div className="card">
      <h2>Permintaan barang baru (tidak ada di daftar)</h2>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#5E6070' }}>
        Isi bila barang yang dibutuhkan belum ada di master. Setelah dikirim, Akuntansi menentukan COA-nya dan menambahkan barang ke master. Barang baru belum masuk total sampai COA ditentukan.
      </p>

      {/* Pesan Kesalahan / Berhasil */}
      {errorMsg && (
        <div
          className="chip bd"
          style={{ display: 'block', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}
        >
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div
          className="chip ok"
          style={{ display: 'block', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}
        >
          {successMsg}
        </div>
      )}

      {/* Formulir Tambah Permintaan (Hanya aktif bila dokumen bukan read-only) */}
      {!isReadOnly && (
        <form onSubmit={handleAddSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
            }}
          >
            <label htmlFor="nn">
              Nama barang
              <input
                id="nn"
                type="text"
                placeholder="Contoh: Kertas thermal EKG"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </label>
            <label htmlFor="ns">
              Spesifikasi
              <input
                id="ns"
                type="text"
                placeholder="Merk / tipe / spesifikasi"
                value={formData.spec}
                onChange={handleInputChange}
              />
            </label>
            <label htmlFor="nu">
              Satuan
              <input
                id="nu"
                type="text"
                placeholder="Roll / Pcs / Box"
                value={formData.uom}
                onChange={handleInputChange}
                required
              />
            </label>
            <label htmlFor="nq">
              Qty
              <input
                id="nq"
                type="number"
                min="0.01"
                step="any"
                placeholder="0"
                value={formData.qty}
                onChange={handleInputChange}
                required
              />
            </label>
            <label htmlFor="nh">
              Estimasi harga satuan (Rp)
              <RupiahInput
                id="nh"
                placeholder="0"
                value={formData.est_price}
                onChange={handleInputChange}
                required
              />
            </label>
            <label htmlFor="na">
              Alasan kebutuhan
              <input
                id="na"
                type="text"
                placeholder="Alasan pengadaan barang..."
                value={formData.reason}
                onChange={handleInputChange}
              />
            </label>
          </div>
          <div style={{ marginTop: '12px' }}>
            <button
              type="submit"
              className="btn b2"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Tambah permintaan'}
            </button>
          </div>
        </form>
      )}

      {/* Tabel Permintaan Barang Baru */}
      <div className="sc" style={{ marginTop: '12px' }}>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama barang</th>
              <th>Satuan</th>
              <th className="r">Qty</th>
              <th className="r">Estimasi harga</th>
              <th className="r">Jumlah</th>
              <th>Status</th>
              <th>COA (oleh Akuntansi)</th>
              {!isReadOnly && <th style={{ textAlign: 'center', width: '60px' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={isReadOnly ? 8 : 9} style={{ textAlign: 'center', padding: '16px', color: '#5E6070' }}>
                  Memuat data permintaan barang baru...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={isReadOnly ? 8 : 9} style={{ textAlign: 'center', padding: '16px', color: '#8A1F1B' }}>
                  Gagal memuat permintaan barang: {error?.message || 'Galat sistem'}
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 8 : 9} style={{ textAlign: 'center', padding: '16px', color: '#5E6070' }}>
                  Belum ada permintaan barang baru untuk dokumen ini.
                </td>
              </tr>
            ) : (
              requests.map((req, idx) => {
                const estAmount = (parseFloat(req.qty) || 0) * (parseInt(req.est_price, 10) || 0);

                let statusBadge = <span className="chip nt">Draft, belum dikirim</span>;
                if (req.status === 'MENUNGGU_COA') {
                  statusBadge = <span className="chip wn">Menunggu penentuan COA</span>;
                } else if (req.status === 'COA_DITENTUKAN') {
                  statusBadge = <span className="chip ok">COA ditentukan</span>;
                }

                return (
                  <tr key={req.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <b>{req.name}</b>
                      {req.spec && <div className="lb">Spek: {req.spec}</div>}
                      {req.reason && <div className="lb" style={{ fontStyle: 'italic' }}>Ket: {req.reason}</div>}
                    </td>
                    <td>{req.uom}</td>
                    <td className="r">{req.qty}</td>
                    <td className="r">{formatRupiah(req.est_price)}</td>
                    <td className="r">{formatRupiah(estAmount)}</td>
                    <td>{statusBadge}</td>
                    <td>
                      {req.status === 'COA_DITENTUKAN' && req.coa_code ? (
                        <>
                          <b>{req.coa_code}</b> {req.coa_name}
                          {req.item_code && <div className="lb">Kode: {req.item_code}</div>}
                        </>
                      ) : (
                        <span className="lb">Belum ditentukan</span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td style={{ textAlign: 'center' }}>
                        {req.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(req.id)}
                            className="btn b3"
                            style={{ minHeight: '30px', height: '30px', padding: '0 8px', fontSize: '11px' }}
                            title="Hapus draft"
                            disabled={deleteMutation.isPending}
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tombol Kirim ke Akuntansi */}
      {!isReadOnly && draftRequests.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn"
            onClick={handleSendToAccounting}
            disabled={sendMutation.isPending}
          >
            {sendMutation.isPending
              ? 'Mengirim...'
              : `Kirim permintaan ke Akuntansi (${draftRequests.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

NewItemRequestPicCard.propTypes = {
  docId: PropTypes.number,
  isReadOnly: PropTypes.bool,
  onSubmitted: PropTypes.func,
  doc: PropTypes.object,
  disabled: PropTypes.bool,
  onLineAdded: PropTypes.func,
};
