import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import masterApi from '../../api/master.api';

export default function UnitFormModal({ isOpen, onClose, unit, coaList = [], companies = [], onSuccess, onDelete }) {
  const [formData, setFormData] = useState({
    source_key: '',
    code: '',
    name: '',
    company_id: 1,
    group_name: '',
    classification: 'Pusat Biaya',
    revenue_coa_id: '',
    needs_review: false,
    review_notes: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (unit) {
        setFormData({
          source_key: unit.source_key || '',
          code: unit.code || '',
          name: unit.name || '',
          company_id: unit.company_id || 1,
          group_name: unit.group_name || '',
          classification: unit.classification || 'Pusat Biaya',
          revenue_coa_id: unit.revenue_coa_id || '',
          needs_review: Boolean(unit.needs_review),
          review_notes: unit.review_notes || '',
          is_active: unit.is_active !== undefined ? unit.is_active : true,
        });
      } else {
        setFormData({
          source_key: '',
          code: '',
          name: '',
          company_id: companies[0]?.id || 1,
          group_name: '',
          classification: 'Pusat Biaya',
          revenue_coa_id: '',
          needs_review: false,
          review_notes: '',
          is_active: true,
        });
      }
      setErrorMsg(null);
    }
  }, [unit, isOpen, companies]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        company_id: Number(formData.company_id),
        code: formData.code && formData.code.trim() ? formData.code.trim() : null,
        source_key: formData.source_key && formData.source_key.trim() ? formData.source_key.trim() : null,
        name: formData.name.trim(),
        group_name: formData.group_name ? formData.group_name.trim() : null,
        classification: formData.classification,
        revenue_coa_id: formData.revenue_coa_id ? Number(formData.revenue_coa_id) : null,
        needs_review: Boolean(formData.needs_review),
        review_notes: formData.review_notes ? formData.review_notes.trim() : null,
        is_active: Boolean(formData.is_active),
      };

      if (unit?.id) {
        await masterApi.updateUnit(unit.id, payload);
      } else {
        await masterApi.createUnit(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data unit kerja');
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
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              {unit?.id ? 'Ubah Unit Kerja' : 'Tambah Unit Kerja Baru'}
            </h2>
            <div style={{ fontSize: '12px', color: '#5E6070', marginTop: '2px' }}>
              Master unit kerja operasional dan penetapan klasifikasi
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

        {formData.needs_review && (
          <div className="card" style={{ background: '#FBE8C8', borderColor: '#E3C58A', color: '#7A3E00', marginBottom: '14px' }}>
            <b>Perlu Dicek:</b> Unit ini ditandai memerlukan review atau verifikasi kode/struktur organisasi oleh Akuntansi.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="row">
              <label style={{ flex: 1, minWidth: '140px' }}>
                Perusahaan
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  disabled={Boolean(unit?.id)}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ flex: 1, minWidth: '140px' }}>
                ID Draf (source_key)
                <input
                  type="text"
                  value={formData.source_key}
                  onChange={(e) => setFormData({ ...formData, source_key: e.target.value })}
                  placeholder="cth. DRAF-01"
                />
              </label>
            </div>

            <div className="row">
              <label style={{ flex: 1, minWidth: '140px' }}>
                Kode Unit (Opsional)
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="cth. 9910 atau kosongkan jika belum ada"
                />
              </label>

              <label style={{ flex: 1, minWidth: '140px' }}>
                Kelompok Unit (Org Group)
                <input
                  type="text"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  placeholder="cth. Rawat Inap, Penunjang"
                />
              </label>
            </div>

            <label>
              Nama Unit Kerja
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama resmi unit kerja di lembar RKAP"
              />
            </label>

            <div className="row">
              <label style={{ flex: 1, minWidth: '140px' }}>
                Klasifikasi Unit
                <select
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                >
                  <option value="Pusat Biaya">Pusat Biaya</option>
                  <option value="Pusat Laba">Pusat Laba</option>
                  <option value="Penunjang Intermediate">Penunjang Intermediate</option>
                </select>
              </label>

              <label style={{ flex: 1, minWidth: '140px' }}>
                COA Pendapatan (Bila Ada)
                <select
                  value={formData.revenue_coa_id}
                  onChange={(e) => setFormData({ ...formData, revenue_coa_id: e.target.value })}
                >
                  <option value="">-- Tanpa COA Pendapatan --</option>
                  {coaList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={formData.needs_review}
                onChange={(e) => setFormData({ ...formData, needs_review: e.target.checked })}
                style={{ minHeight: 'auto', width: '16px', height: '16px', margin: 0 }}
              />
              <span>Tandai unit ini &quot;Perlu Dicek&quot;</span>
            </label>

            <label>
              Catatan Isu / Review Akuntansi
              <textarea
                rows="2"
                value={formData.review_notes}
                onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
                placeholder="Catatan penyesuaian kode atau nama untuk verifikasi"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ minHeight: 'auto', width: '16px', height: '16px', margin: 0 }}
              />
              <span>Unit Aktif (dapat mengajukan dan menyusun RKAP)</span>
            </label>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              {unit?.id && onDelete && (
                <button
                  type="button"
                  className="btn b3"
                  style={{ marginRight: 'auto' }}
                  onClick={() => {
                    onClose();
                    onDelete(unit);
                  }}
                  disabled={loading}
                >
                  Hapus Unit
                </button>
              )}
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Menyimpan...' : (unit?.id ? 'Simpan Perubahan' : 'Tambahkan Unit')}
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

UnitFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  unit: PropTypes.object,
  coaList: PropTypes.array,
  companies: PropTypes.array,
  onSuccess: PropTypes.func,
  onDelete: PropTypes.func,
};
