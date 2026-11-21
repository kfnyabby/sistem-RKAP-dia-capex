import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function PeriodOverrideModal({
  isOpen,
  onClose,
  units = [], // Array of units to override
  targetState = 'BUKA',
  onConfirm,
  loading = false,
  errorMsg = null,
}) {
  const [docType, setDocType] = useState('SEMUA');
  const [deadline, setDeadline] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDocType('SEMUA');
      setDeadline('');
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isClosing = targetState === 'TUTUP';
  const isBulk = units.length > 1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    onConfirm({
      units,
      targetState,
      docType,
      deadlineOverride: deadline || null,
      reason: reason.trim(),
    });
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
          maxWidth: '500px',
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
            {isClosing
              ? `Tutup Pengajuan ${isBulk ? `(${units.length} Unit)` : 'Unit'}`
              : `Buka Kembali Pengajuan ${isBulk ? `(${units.length} Unit)` : 'Unit'}`}
          </h2>
        </div>

        <div style={{ marginBottom: '14px', fontSize: '13px', color: '#5E6070', lineHeight: 1.5 }}>
          {!isBulk ? (
            <div>
              Unit Kerja:{' '}
              <strong style={{ color: '#1F2233' }}>
                [{units[0]?.unit_code}] {units[0]?.unit_name}
              </strong>
            </div>
          ) : (
            <div>
              Anda memilih <strong style={{ color: '#1F2233' }}>{units.length} unit kerja</strong> untuk diubah status akses pengajuannya secara bersamaan.
            </div>
          )}
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
          {/* Pilihan Jenis Dokumen */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#5E6070' }}>
            Jenis Dokumen Anggaran
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              style={{
                font: 'inherit',
                border: '1px solid #B9B4C9',
                borderRadius: '6px',
                padding: '9px',
                minHeight: '44px',
                background: '#fff',
              }}
            >
              <option value="SEMUA">Semua (Biaya &amp; Investasi)</option>
              <option value="BIAYA">Hanya Anggaran Biaya</option>
              <option value="INVESTASI">Hanya Anggaran Investasi</option>
            </select>
          </label>

          {/* Batas Waktu Baru (Opsional saat Buka) */}
          {!isClosing && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#5E6070' }}>
              <span>Deadline Efektif Baru (Opsional)</span>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={{
                  font: 'inherit',
                  border: '1px solid #B9B4C9',
                  borderRadius: '6px',
                  padding: '9px',
                  minHeight: '44px',
                  background: '#fff',
                }}
              />
              <span style={{ fontSize: '11px', color: '#5E6070' }}>
                Bila dikosongkan, tenggat efektif akan mengikuti batas waktu periode default.
              </span>
            </label>
          )}

          {/* Alasan Wajib */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#5E6070' }}>
            <span>
              Alasan {isClosing ? 'Penutupan' : 'Pembukaan Kembali'} <strong style={{ color: '#8A1F1B' }}>*</strong>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isClosing
                  ? 'Contoh: Unit telah menyelesaikan pengisian anggaran dan dokumen dikunci.'
                  : 'Contoh: Perpanjangan pengisian revisi anggaran atas permintaan Manager.'
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
                ? 'Menyimpan...'
                : isClosing
                ? `Tutup Pengajuan${isBulk ? ` (${units.length})` : ''}`
                : `Buka Kembali${isBulk ? ` (${units.length})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

PeriodOverrideModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  units: PropTypes.array,
  targetState: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  errorMsg: PropTypes.string,
};
