import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import budgetApi from '../../api/budget.api';

export default function CreatePeriodModal({
  isOpen,
  onClose,
  companies = [],
  onSuccess,
}) {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    company_id: '',
    year: currentYear + 1,
    fill_deadline: '',
    review_deadline: '',
    lock_date: '',
    auto_close: true,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        company_id: companies[0]?.id ? String(companies[0].id) : '1',
        year: currentYear + 1,
        fill_deadline: '',
        review_deadline: '',
        lock_date: '',
        auto_close: true,
      });
      setErrorMsg(null);
    }
  }, [isOpen, companies, currentYear]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Validasi review deadline >= fill deadline
    if (formData.fill_deadline && formData.review_deadline) {
      if (new Date(formData.review_deadline) < new Date(formData.fill_deadline)) {
        setErrorMsg('Batas waktu telaah (Validasi) tidak boleh lebih awal dari batas pengisian');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        company_id: parseInt(formData.company_id, 10),
        year: parseInt(formData.year, 10),
        fill_deadline: formData.fill_deadline || null,
        review_deadline: formData.review_deadline || null,
        lock_date: formData.lock_date || null,
        submission_state: 'BUKA',
        auto_close: Boolean(formData.auto_close),
      };

      await budgetApi.createPeriod(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal membuat periode anggaran baru';
      setErrorMsg(msg);
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
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1F2233' }}>Buat Periode Anggaran Baru</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: '18px', color: '#5E6070' }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#F8D9D6',
              color: '#8A1F1B',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '14px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="row">
            <label style={{ flex: 1, minWidth: '160px' }}>
              Perusahaan
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ flex: 1, minWidth: '120px' }}>
              Tahun RKAP
              <input
                type="number"
                min="2020"
                max="2100"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                required
              />
            </label>
          </div>

          <label>
            Batas Waktu Pengisian (Fill Deadline)
            <input
              type="date"
              value={formData.fill_deadline}
              onChange={(e) => setFormData({ ...formData, fill_deadline: e.target.value })}
            />
          </label>

          <label>
            Batas Waktu Validasi (Review Deadline)
            <input
              type="date"
              value={formData.review_deadline}
              onChange={(e) => setFormData({ ...formData, review_deadline: e.target.value })}
            />
          </label>

          <label>
            Tanggal Penguncian Akhir (Lock Date)
            <input
              type="date"
              value={formData.lock_date}
              onChange={(e) => setFormData({ ...formData, lock_date: e.target.value })}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
            <input
              type="checkbox"
              checked={formData.auto_close}
              onChange={(e) => setFormData({ ...formData, auto_close: e.target.checked })}
              style={{ minHeight: 'auto', width: '16px', height: '16px', margin: 0 }}
            />
            <span>Tutup otomatis pengajuan saat batas waktu pengisian terlewati</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="btn b2" onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className="btn" disabled={loading} style={{ fontWeight: 600 }}>
              {loading ? 'Menyimpan...' : 'Buat Periode Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreatePeriodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  companies: PropTypes.array,
  onSuccess: PropTypes.func,
};
