import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import masterApi from '../../api/master.api';

export default function InvestmentCategoryModal({ isOpen, onClose, category, coaList = [], onSuccess }) {
  const [usefulLifeMonths, setUsefulLifeMonths] = useState(60);
  const [depreciationCoaId, setDepreciationCoaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (category && isOpen) {
      setUsefulLifeMonths(category.useful_life_months || 60);
      setDepreciationCoaId(category.depreciation_coa_id || '');
      setErrorMsg(null);
    }
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await masterApi.updateInvestmentCategory(category.id, {
        useful_life_months: Math.max(1, parseInt(usefulLifeMonths, 10) || 60),
        depreciation_coa_id: depreciationCoaId ? Number(depreciationCoaId) : null,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memperbarui kategori investasi');
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
            <h2 style={{ margin: 0, fontSize: '18px' }}>Ubah Kategori Investasi</h2>
            <div style={{ fontSize: '12px', color: '#5E6070', marginTop: '2px' }}>
              Atur masa manfaat dan pemetaan akun beban penyusutan
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
              Nama Kategori Investasi
              <input
                type="text"
                disabled
                value={category.name || ''}
                style={{ background: '#FAF7F2', color: '#1F2233', cursor: 'not-allowed' }}
              />
            </label>

            <label>
              Masa Manfaat (Bulan)
              <input
                type="number"
                min="1"
                required
                value={usefulLifeMonths}
                onChange={(e) => setUsefulLifeMonths(e.target.value)}
              />
              <span style={{ fontSize: '11px', color: '#5E6070', marginTop: '3px' }}>
                Contoh: 120 bulan (10 tahun), 60 bulan (5 tahun), 48 bulan (4 tahun).
              </span>
            </label>

            <label>
              Akun COA Biaya Penyusutan
              <select
                value={depreciationCoaId}
                onChange={(e) => setDepreciationCoaId(e.target.value)}
              >
                <option value="">-- Pilih Akun COA Penyusutan --</option>
                {coaList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '11px', color: '#5E6070', marginTop: '3px' }}>
                Akun beban penyusutan yang akan otomatis dipilih saat pengajuan anggaran investasi.
              </span>
            </label>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
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

InvestmentCategoryModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  category: PropTypes.object,
  coaList: PropTypes.array,
  onSuccess: PropTypes.func,
};
