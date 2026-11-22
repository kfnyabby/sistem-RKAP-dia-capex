import PropTypes from 'prop-types';

export default function RefreshPriceConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(35, 43, 74, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          borderRadius: '8px',
          backgroundColor: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '17px', color: '#1F2233' }}>
          Perbarui Harga Master?
        </h2>
        <p style={{ margin: '0 0 16px', color: '#5E6070', fontSize: '13px', lineHeight: '1.5' }}>
          Tindakan ini akan menyinkronkan seluruh harga snapshot pada baris anggaran dokumen ini dengan data harga master logistik terkini untuk periode berjalan. Kuantitas (Qty) yang telah diisi tidak akan berubah.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn b2"
            disabled={isPending}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn"
            disabled={isPending}
          >
            {isPending ? 'Memproses...' : 'Ya, Perbarui Harga'}
          </button>
        </div>
      </div>
    </div>
  );
}

RefreshPriceConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isPending: PropTypes.bool,
};
