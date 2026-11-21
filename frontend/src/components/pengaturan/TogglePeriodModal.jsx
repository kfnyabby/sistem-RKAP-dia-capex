import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function TogglePeriodModal({
  isOpen,
  onClose,
  targetState = 'TUTUP',
  periodName = '',
  onConfirm,
  loading = false,
  errorMsg = null,
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(targetState, reason.trim());
  };

  const isClosing = targetState === 'TUTUP';

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
          maxWidth: '480px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: isClosing ? '#F8D9D6' : '#DDF1E4',
              color: isClosing ? '#8A1F1B' : '#14532D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
            }}
          >
            !
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1F2233' }}>
            {isClosing ? 'Tutup Pengajuan Periode' : 'Buka Kembali Pengajuan Periode'}
          </h2>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#5E6070', lineHeight: 1.5 }}>
          {isClosing ? (
            <>
              Anda akan <strong>menutup pengajuan</strong> untuk seluruh unit kerja pada periode{' '}
              <strong style={{ color: '#1F2233' }}>{periodName}</strong>. Saat ditutup, unit tidak dapat mengubah atau mengajukan anggaran biaya dan investasi.
            </>
          ) : (
            <>
              Anda akan <strong>membuka kembali pengajuan</strong> untuk seluruh unit kerja pada periode{' '}
              <strong style={{ color: '#1F2233' }}>{periodName}</strong>.
            </>
          )}
        </p>

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
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#5E6070' }}>
            <span>
              Alasan {isClosing ? 'Penutupan' : 'Pembukaan Kembali'} <strong style={{ color: '#8A1F1B' }}>*</strong>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isClosing
                  ? 'Contoh: Masa pengisian anggaran RKAP telah berakhir dan masuk tahap review.'
                  : 'Contoh: Memberikan kesempatan penyesuaian revisi program kerja unit.'
              }
              rows={3}
              required
              style={{
                font: 'inherit',
                border: '1px solid #B9B4C9',
                borderRadius: '6px',
                padding: '9px',
                background: '#fff',
                resize: 'vertical',
              }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button type="button" className="btn b2" onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button
              type="submit"
              className={isClosing ? 'btn b3' : 'btn'}
              disabled={loading || !reason.trim()}
              style={{ fontWeight: 600 }}
            >
              {loading
                ? 'Memproses...'
                : isClosing
                ? 'Tutup Pengajuan Periode'
                : 'Buka Kembali Pengajuan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

TogglePeriodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  targetState: PropTypes.string,
  periodName: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  errorMsg: PropTypes.string,
};
