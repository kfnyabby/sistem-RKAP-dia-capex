import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('rina@ptcn.id');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Login gagal. Periksa email dan kata sandi Anda.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (quickEmail) => {
    setEmail(quickEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FAF7F2', padding: '24px' }}>
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderRadius: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', letterSpacing: '.08em', color: '#3D4E9C', fontWeight: 700, textAlign: 'center' }}>
            DIA CAPEX
          </div>
          <h1 style={{ marginTop: '4px', textAlign: 'center' }}>Sistem RKAP</h1>
          <p style={{ margin: '6px 0 0', color: '#5E6070', textAlign: 'center' }}>
            Masuk untuk mengisi dan memonitor anggaran biaya dan investasi.
          </p>
        </div>

        {error && (
          <div className="chip bd" style={{ display: 'flex', width: '100%', boxSizing: 'border-box', justifyContent: 'center', padding: '8px 12px', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label htmlFor="em">
            Email
            <input
              id="em"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label htmlFor="pw">
            Kata sandi
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn" disabled={isSubmitting}>
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Akses Cepat Akun Demo (PIC / Manager / Akuntansi) */}
        <div style={{ paddingTop: '8px', borderTop: '1px solid #F0EBE2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#5E6070', textAlign: 'center' }}>
            Pilih Cepat Pengguna Demo:
          </span>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => handleQuickSelect('rina@ptcn.id')}
              className="chip nt"
              style={{ border: '1px solid #E6E0D6', cursor: 'pointer' }}
            >
              PIC (Rina)
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('budi@ptcn.id')}
              className="chip nt"
              style={{ border: '1px solid #E6E0D6', cursor: 'pointer' }}
            >
              Manager (Budi)
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect('dya@ptcn.id')}
              className="chip nt"
              style={{ border: '1px solid #E6E0D6', cursor: 'pointer' }}
            >
              Akuntansi (Dya)
            </button>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: '#5E6070', textAlign: 'center', minHeight: '42px' }}>
          Lupa kata sandi? Hubungi Akuntansi. <br />
          Akun CN dan CNH memakai satu pintu masuk yang sama.
        </p>
      </div>
    </div>
  );
}
