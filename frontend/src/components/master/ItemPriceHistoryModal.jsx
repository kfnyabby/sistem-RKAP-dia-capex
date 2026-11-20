import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import masterApi from '../../api/master.api';

export default function ItemPriceHistoryModal({ isOpen, onClose, item, onSuccess }) {
  const initialPriceCn =
    item?.prices?.find((p) => p.company_code === 'CN')?.price ?? item?.price_cn ?? 0;
  const initialPriceCnh =
    item?.prices?.find((p) => p.company_code === 'CNH')?.price ?? item?.price_cnh ?? 0;

  const [priceCn, setPriceCn] = useState(initialPriceCn);
  const [priceCnh, setPriceCnh] = useState(initialPriceCnh);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (item?.id && isOpen) {
      const pCn = item?.prices?.find((p) => p.company_code === 'CN')?.price ?? item?.price_cn ?? 0;
      const pCnh = item?.prices?.find((p) => p.company_code === 'CNH')?.price ?? item?.price_cnh ?? 0;
      setPriceCn(pCn);
      setPriceCnh(pCnh);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Muat log audit untuk barang ini
      setLoadingLogs(true);
      masterApi
        .getItemPriceAuditLogs(item.id)
        .then((res) => {
          const allLogs = res?.data || [];
          // Filter log terkait item ini
          const itemLogs = allLogs.filter(
            (log) => Number(log.entity_id) === Number(item.id) || log.entity_id === String(item.id)
          );
          setAuditLogs(itemLogs);
        })
        .catch(() => {
          setAuditLogs([]);
        })
        .finally(() => {
          setLoadingLogs(false);
        });
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = [
        { company_code: 'CN', price: Math.round(Number(priceCn) || 0) },
        { company_code: 'CNH', price: Math.round(Number(priceCnh) || 0) },
      ];

      await masterApi.updateItemPrices(item.id, payload);
      setSuccessMsg('Harga barang berhasil diperbarui');
      if (onSuccess) onSuccess();

      // Segarkan log audit
      masterApi.getItemPriceAuditLogs(item.id).then((res) => {
        const itemLogs = (res?.data || []).filter(
          (log) => Number(log.entity_id) === Number(item.id)
        );
        setAuditLogs(itemLogs);
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui harga barang');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(35, 43, 74, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Ubah Harga Barang &amp; Riwayat</h2>
            <div style={{ fontSize: '13px', color: '#5E6070', marginTop: '2px' }}>
              <b>{item.code}</b> — {item.name}
            </div>
          </div>
          <button
            type="button"
            className="btn b2"
            onClick={onClose}
            style={{ minHeight: '36px', padding: '0 12px' }}
          >
            ✕ Tutup
          </button>
        </div>

        {errorMsg && (
          <div className="card" style={{ background: '#F8D9D6', borderColor: '#E59B96', color: '#8A1F1B', marginBottom: '14px' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="card" style={{ background: '#DDF1E4', borderColor: '#A2D9B7', color: '#14532D', marginBottom: '14px' }}>
            {successMsg}
          </div>
        )}

        {/* Form Ubah Harga */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <div className="row" style={{ alignItems: 'flex-end', marginBottom: '12px' }}>
            <label style={{ flex: 1, minWidth: '140px' }}>
              Harga Satuan PT CN (Rp)
              <input
                type="number"
                min="0"
                step="1"
                required
                value={priceCn}
                onChange={(e) => setPriceCn(e.target.value)}
                disabled={loading}
              />
            </label>

            <label style={{ flex: 1, minWidth: '140px' }}>
              Harga Satuan PT CNH (Rp)
              <input
                type="number"
                min="0"
                step="1"
                required
                value={priceCnh}
                onChange={(e) => setPriceCnh(e.target.value)}
                disabled={loading}
              />
            </label>

            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ minWidth: '130px' }}
            >
              {loading ? 'Menyimpan...' : 'Simpan Harga'}
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#5E6070' }}>
            * Uang disimpan sebagai bilangan bulat rupiah. Setiap mutasi harga dicatat ke jejak audit sistem.
          </div>
        </form>

        {/* Informasi Harga Terdaftar & Riwayat */}
        <div style={{ borderTop: '1px solid #E6E0D6', paddingTop: '16px' }}>
          <h2 style={{ fontSize: '15px', marginBottom: '10px' }}>Status &amp; Riwayat Harga</h2>

          {/* Kartu Status Saat Ini */}
          <div className="row" style={{ marginBottom: '14px' }}>
            <div className="card" style={{ flex: 1, minWidth: '160px', background: '#FAF7F2' }}>
              <div className="lb">Harga Aktif PT CN</div>
              <div className="vl">Rp {formatNumber(item.price_cn || initialPriceCn)}</div>
              <div style={{ fontSize: '11px', color: '#5E6070', marginTop: '4px' }}>
                {item.prices?.find((p) => p.company_code === 'CN')?.updated_at
                  ? `Diperbarui: ${new Date(item.prices.find((p) => p.company_code === 'CN').updated_at).toLocaleString('id-ID')}`
                  : 'Harga awal master'}
              </div>
            </div>

            <div className="card" style={{ flex: 1, minWidth: '160px', background: '#FAF7F2' }}>
              <div className="lb">Harga Aktif PT CNH</div>
              <div className="vl">Rp {formatNumber(item.price_cnh || initialPriceCnh)}</div>
              <div style={{ fontSize: '11px', color: '#5E6070', marginTop: '4px' }}>
                {item.prices?.find((p) => p.company_code === 'CNH')?.updated_at
                  ? `Diperbarui: ${new Date(item.prices.find((p) => p.company_code === 'CNH').updated_at).toLocaleString('id-ID')}`
                  : (initialPriceCnh > 0 ? 'Harga awal master' : 'Belum diatur (Rp 0)')}
              </div>
            </div>
          </div>

          {/* Tabel Jejak Audit Pembaruan Harga */}
          <div className="sc">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No.</th>
                  <th>Waktu</th>
                  <th>Aktor (Pengubah)</th>
                  <th>Perubahan Nilai</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#5E6070' }}>
                      Memuat riwayat perubahan harga...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#5E6070' }}>
                      Belum ada catatan riwayat perubahan manual untuk barang ini.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => {
                    const pricesVal = Array.isArray(log.new_value)
                      ? log.new_value.map((p) => `${p.company_code}: Rp ${formatNumber(p.price)}`).join(', ')
                      : JSON.stringify(log.new_value || '-');
                    return (
                      <tr key={log.id || idx}>
                        <td>{idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at || log.at).toLocaleString('id-ID')}
                        </td>
                        <td>{log.actor_name || log.actor_email || 'Akuntansi'}</td>
                        <td>
                          <span className="chip ok" style={{ fontSize: '11px' }}>{pricesVal}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

ItemPriceHistoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  item: PropTypes.object,
  onSuccess: PropTypes.func,
};
