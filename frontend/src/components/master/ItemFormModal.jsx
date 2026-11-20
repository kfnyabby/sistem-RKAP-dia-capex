import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import masterApi from '../../api/master.api';

export default function ItemFormModal({ isOpen, onClose, item, coaList = [], groupList = [], onSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    product_code: '',
    name: '',
    group_name: 'Umum',
    uom: 'Pcs',
    price_cn: 0,
    price_cnh: 0,
    coa_id: '',
    inventory_coa_id: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        const pCn = item.prices?.find((p) => p.company_code === 'CN')?.price ?? item.price_cn ?? 0;
        const pCnh = item.prices?.find((p) => p.company_code === 'CNH')?.price ?? item.price_cnh ?? 0;
        setFormData({
          code: item.code || '',
          product_code: item.product_code || '',
          name: item.name || '',
          group_name: item.group_name || 'Umum',
          uom: item.uom || 'Pcs',
          price_cn: pCn,
          price_cnh: pCnh,
          coa_id: item.coa_id || '',
          inventory_coa_id: item.inventory_coa_id || '',
          is_active: item.is_active !== undefined ? item.is_active : true,
        });
      } else {
        setFormData({
          code: '',
          product_code: '',
          name: '',
          group_name: groupList[0] || 'Umum',
          uom: 'Pcs',
          price_cn: 0,
          price_cnh: 0,
          coa_id: '',
          inventory_coa_id: '',
          is_active: true,
        });
      }
      setErrorMsg(null);
    }
  }, [item, isOpen, groupList]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        code: formData.code.trim(),
        product_code: formData.product_code ? formData.product_code.trim() : null,
        name: formData.name.trim(),
        group_name: formData.group_name || 'Umum',
        uom: formData.uom || 'Pcs',
        coa_id: formData.coa_id ? Number(formData.coa_id) : null,
        inventory_coa_id: formData.inventory_coa_id ? Number(formData.inventory_coa_id) : null,
        is_active: Boolean(formData.is_active),
      };

      if (!item?.id) {
        payload.prices = [
          { company_code: 'CN', price: Math.round(Number(formData.price_cn) || 0) },
          { company_code: 'CNH', price: Math.round(Number(formData.price_cnh) || 0) },
        ];
        await masterApi.createItem(payload);
      } else {
        await masterApi.updateItem(item.id, payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data master barang');
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
          maxWidth: '580px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              {item?.id ? 'Ubah Master Barang' : 'Tambah Master Barang Baru'}
            </h2>
            <div style={{ fontSize: '12px', color: '#5E6070', marginTop: '2px' }}>
              Katalog barang logistik dan pengaitan akun COA biaya
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="row">
              <label style={{ flex: 1, minWidth: '140px' }}>
                Kode Barang (ID Unik)
                <input
                  type="text"
                  required
                  disabled={Boolean(item?.id)}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="cth. 101 atau BRG-001"
                />
              </label>

              <label style={{ flex: 1, minWidth: '140px' }}>
                Kode Produk (Logistik)
                <input
                  type="text"
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                  placeholder="cth. 6L atau PRD-88"
                />
              </label>
            </div>

            <label>
              Nama Barang
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama lengkap barang spesifik"
              />
            </label>

            <div className="row">
              <label style={{ flex: 1, minWidth: '140px' }}>
                Golongan Barang
                <input
                  type="text"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  placeholder="cth. Bahan Cetakan, ATK"
                />
              </label>

              <label style={{ flex: 1, minWidth: '140px' }}>
                Satuan Beli (UOM)
                <input
                  type="text"
                  required
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                  placeholder="cth. Lembar, Pcs, Pak"
                />
              </label>
            </div>

            <label>
              COA Biaya (Bagan Akun Pengeluaran)
              <select
                value={formData.coa_id}
                onChange={(e) => setFormData({ ...formData, coa_id: e.target.value })}
              >
                <option value="">-- Pilih Akun COA Biaya --</option>
                {coaList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              COA Persediaan (Opsional)
              <select
                value={formData.inventory_coa_id}
                onChange={(e) => setFormData({ ...formData, inventory_coa_id: e.target.value })}
              >
                <option value="">-- Tanpa COA Persediaan --</option>
                {coaList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </label>

            {!item?.id && (
              <div className="row">
                <label style={{ flex: 1, minWidth: '140px' }}>
                  HPP Awal PT CN (Rp)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price_cn}
                    onChange={(e) => setFormData({ ...formData, price_cn: e.target.value })}
                  />
                </label>

                <label style={{ flex: 1, minWidth: '140px' }}>
                  HPP Awal PT CNH (Rp)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price_cnh}
                    onChange={(e) => setFormData({ ...formData, price_cnh: e.target.value })}
                  />
                </label>
              </div>
            )}

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ minHeight: 'auto', width: '16px', height: '16px', margin: 0 }}
              />
              <span>Barang Aktif (tersedia untuk pengajuan anggaran unit)</span>
            </label>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Menyimpan...' : (item?.id ? 'Simpan Perubahan' : 'Tambahkan Barang')}
              </button>
              <button type="button" className="btn b2" onClick={onClose} disabled={loading}>
                Batal
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

ItemFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  item: PropTypes.object,
  coaList: PropTypes.array,
  groupList: PropTypes.array,
  onSuccess: PropTypes.func,
};
