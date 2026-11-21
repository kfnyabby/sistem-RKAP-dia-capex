import PropTypes from 'prop-types';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Hapus Data',
  entityType = 'Data',
  entityName = '',
  entityCode = '',
  loading = false,
  error = null,
  onDeactivate = null,
  deactivateLoading = false,
}) {
  if (!isOpen) return null;

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
          maxWidth: '460px',
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
              backgroundColor: '#F8D9D6',
              color: '#8A1F1B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
            }}
          >
            !
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1F2233' }}>{title}</h2>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#5E6070', lineHeight: 1.5 }}>
          Apakah Anda yakin ingin menghapus {entityType.toLowerCase()}{' '}
          <strong style={{ color: '#1F2233' }}>
            {entityCode ? `[${entityCode}] ` : ''}
            {entityName}
          </strong>
          ?
        </p>

        <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#8A1F1B', backgroundColor: '#FDF2F1', padding: '8px 12px', borderRadius: '6px' }}>
          Tindakan ini akan menghapus data secara permanen dari sistem. Jika data sudah pernah digunakan dalam transaksi atau anggaran, penghapusan akan ditolak demi menjaga keutuhan laporan.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: '#FBE8C8',
              border: '1px solid #E3C58A',
              color: '#7A3E00',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px',
              lineHeight: 1.4,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Tidak Dapat Menghapus:</div>
            <div>{error}</div>
            {onDeactivate && (
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onDeactivate}
                  className="btn b2"
                  disabled={deactivateLoading}
                  style={{ fontSize: '12px', minHeight: '32px', padding: '0 12px', borderColor: '#7A3E00', color: '#7A3E00' }}
                >
                  {deactivateLoading ? 'Memproses...' : 'Ubah Status Menjadi Nonaktif Saja'}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            className="btn b2"
            onClick={onClose}
            disabled={loading || deactivateLoading}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn b3"
            onClick={onConfirm}
            disabled={loading || deactivateLoading}
            style={{ fontWeight: 600 }}
          >
            {loading ? 'Menghapus...' : 'Hapus Permanen'}
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmDeleteModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  entityType: PropTypes.string,
  entityName: PropTypes.string,
  entityCode: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onDeactivate: PropTypes.func,
  deactivateLoading: PropTypes.bool,
};
