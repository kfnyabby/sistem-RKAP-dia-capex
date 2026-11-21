import { useState } from 'react';
import PropTypes from 'prop-types';
import userApi from '../../api/user.api';

export default function ResetPasswordModal({ isOpen, onClose, user, onSuccess }) {
  const [mode, setMode] = useState('random'); // 'random' | 'manual'
  const [manualPassword, setManualPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resultPassword, setResultPassword] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'manual' && manualPassword.length < 8) {
      setErrorMsg('Kata sandi manual minimal terdiri dari 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      const payloadPassword = mode === 'manual' ? manualPassword : '';
      const res = await userApi.resetPassword(user.id, payloadPassword);
      const generatedPassword = res?.data?.new_password || manualPassword;
      setResultPassword(generatedPassword);
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal mengatur ulang kata sandi.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!resultPassword) return;
    try {
      await navigator.clipboard.writeText(resultPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback bila clipboard API diblokir
      const input = document.createElement('input');
      input.value = resultPassword;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setMode('random');
    setManualPassword('');
    setErrorMsg(null);
    setResultPassword(null);
    setCopied(false);
    onClose();
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
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Atur Ulang Kata Sandi</h2>
            <div style={{ fontSize: '12px', color: '#5E6070', marginTop: '2px' }}>
              Pengguna: <b>{user.name}</b> ({user.email})
            </div>
          </div>
          <button
            type="button"
            className="btn b2"
            onClick={handleClose}
            style={{ minHeight: '34px', padding: '0 10px', fontSize: '12px' }}
          >
            ✕ Tutup
          </button>
        </div>

        {errorMsg && (
          <div className="card" style={{ background: '#F8D9D6', borderColor: '#E59B96', color: '#8A1F1B', marginBottom: '14px', fontSize: '13px' }}>
            <b>Gagal:</b> {errorMsg}
          </div>
        )}

        {resultPassword ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card" style={{ background: '#FBE8C8', borderColor: '#ECC68C', color: '#7A3E00', fontSize: '13px' }}>
              <b>Perhatian:</b> Kata sandi ini <b>hanya ditampilkan satu kali</b>. Harap salin dan berikan kepada pengguna melalui saluran komunikasi yang aman.
            </div>

            <div>
              <div className="lb" style={{ marginBottom: '6px' }}>Kata Sandi Baru:</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FAF7F2',
                  border: '1px solid #B9B4C9',
                  borderRadius: '6px',
                  padding: '8px 12px',
                }}
              >
                <code
                  style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    color: '#1F2233',
                  }}
                >
                  {resultPassword}
                </code>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCopy}
                  style={{ minHeight: '36px', padding: '0 14px', fontSize: '13px' }}
                >
                  {copied ? '✓ Tersalin!' : 'Salin'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#5E6070' }}>
              * Seluruh sesi aktif pengguna ini di perangkat lain telah dicabut secara otomatis demi keamanan.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                className="btn"
                onClick={handleClose}
                style={{ minHeight: '38px', padding: '0 20px' }}
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div className="lb" style={{ marginBottom: '8px' }}>Metode Kata Sandi Baru:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1F2233' }}>
                    <input
                      type="radio"
                      name="resetMode"
                      value="random"
                      checked={mode === 'random'}
                      onChange={() => setMode('random')}
                      disabled={loading}
                      style={{ minHeight: 'auto', width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Buat acak oleh sistem (12 karakter aman alfanumerik)</span>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#1F2233' }}>
                    <input
                      type="radio"
                      name="resetMode"
                      value="manual"
                      checked={mode === 'manual'}
                      onChange={() => setMode('manual')}
                      disabled={loading}
                      style={{ minHeight: 'auto', width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Tentukan kata sandi baru secara manual</span>
                  </label>
                </div>
              </div>

              {mode === 'manual' && (
                <label>
                  Kata Sandi Baru (minimal 8 karakter)
                  <input
                    type="text"
                    required
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru..."
                    disabled={loading}
                    minLength={8}
                  />
                </label>
              )}

              <div style={{ fontSize: '12px', color: '#5E6070', background: '#FAF7F2', padding: '8px 10px', borderRadius: '4px' }}>
                * Tindakan ini akan langsung mencabut seluruh sesi login pengguna tersebut di database.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn b2"
                  onClick={handleClose}
                  disabled={loading}
                  style={{ minHeight: '38px', padding: '0 16px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={loading}
                  style={{ minHeight: '38px', padding: '0 16px' }}
                >
                  {loading ? 'Memproses...' : 'Atur Ulang Kata Sandi'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

ResetPasswordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  onSuccess: PropTypes.func,
};
