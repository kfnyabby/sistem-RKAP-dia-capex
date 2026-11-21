import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import masterApi from '../../api/master.api';

export default function CoaFormModal({ isOpen, onClose, coa, groupList = [], onSuccess, onDelete }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'biaya',
    group_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (coa) {
        setFormData({
          code: coa.code || '',
          name: coa.name || '',
          category: coa.category || 'biaya',
          group_id: coa.group_id || '',
        });
      } else {
        setFormData({
          code: '',
          name: '',
          category: 'biaya',
          group_id: groupList[0]?.id || '',
        });
      }
      setErrorMsg(null);
    }
  }, [coa, isOpen, groupList]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category,
        group_id: formData.group_id ? Number(formData.group_id) : null,
      };

      if (coa?.id) {
        await masterApi.updateCoa(coa.id, payload);
      } else {
        await masterApi.createCoa(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data bagan akun COA');
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
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              {coa?.id ? 'Ubah Akun COA' : 'Tambah Akun COA Baru'}
            </h2>
            <div style={{ fontSize: '12px', color: '#5E6070', marginTop: '2px' }}>
              Bagan akun standar biaya dan investasi
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label>
              Kode COA (Format Standar)
              <input
                type="text"
                required
                disabled={Boolean(coa?.id)}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="cth. 5.8.3 atau 1.3.1"
              />
            </label>

            <label>
              Nama Akun COA
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="cth. Biaya Cetak &amp; Fotocopy"
              />
            </label>

            <label>
              Kategori Akun
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="biaya">Biaya (Operasional &amp; Pemeliharaan)</option>
                <option value="investasi">Investasi (Aset Tetap)</option>
              </select>
            </label>

            <label>
              Kelompok Akun (Jenis COA)
              <select
                value={formData.group_id}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              >
                <option value="">-- Tanpa Kelompok Khusus --</option>
                {groupList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} - {g.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              {coa?.id && onDelete && (
                <button
                  type="button"
                  className="btn b3"
                  style={{ marginRight: 'auto' }}
                  onClick={() => {
                    onClose();
                    onDelete(coa);
                  }}
                  disabled={loading}
                >
                  Hapus COA
                </button>
              )}
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Menyimpan...' : (coa?.id ? 'Simpan Perubahan' : 'Tambahkan COA')}
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

CoaFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  coa: PropTypes.object,
  groupList: PropTypes.array,
  onSuccess: PropTypes.func,
  onDelete: PropTypes.func,
};
