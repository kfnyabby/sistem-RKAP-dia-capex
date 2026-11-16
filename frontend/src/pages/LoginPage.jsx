import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AlertCircle, LogIn, Sparkles } from 'lucide-react';

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
        err.response?.data?.message || err.message || 'Login gagal. Periksa koneksi Anda.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (quickEmail) => {
    setEmail(quickEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[400px] bg-white border border-card-border rounded-2xl shadow-sm p-8 space-y-4">
        {/* Header Mockup 10-login.html */}
        <div className="text-center">
          <div className="text-[12px] tracking-[.08em] text-primary font-bold uppercase">
            DIA CAPEX
          </div>
          <h1 className="text-xl font-bold text-text-main mt-1">Sistem RKAP</h1>
          <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
            Masuk untuk mengisi dan memonitor anggaran biaya dan investasi.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-chip-bd-bg border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-chip-bd-text">
            <AlertCircle className="w-4 h-4 text-chip-bd-text shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="em" className="block text-xs text-text-muted mb-1">
              Email
            </label>
            <input
              id="em"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@ptcn.id"
              className="w-full px-3 py-2 bg-white border border-input-border rounded-[6px] text-sm text-text-main min-h-[44px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          <div>
            <label htmlFor="pw" className="block text-xs text-text-muted mb-1">
              Kata sandi
            </label>
            <input
              id="pw"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-white border border-input-border rounded-[6px] text-sm text-text-main min-h-[44px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] bg-primary hover:bg-primary-hover active:opacity-95 text-white font-medium text-sm rounded-[6px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Memproses...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Dev Switcher */}
        <div className="pt-2 border-t border-card-border/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase mb-2">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Pilih Akun Cepat (Dev Seed)</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('rina@ptcn.id')}
              className="px-2 py-1.5 bg-canvas hover:bg-primary/10 hover:text-primary border border-card-border rounded-md text-[11px] font-medium text-text-main transition cursor-pointer text-center"
            >
              PIC (Rina)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('budi@ptcn.id')}
              className="px-2 py-1.5 bg-canvas hover:bg-primary/10 hover:text-primary border border-card-border rounded-md text-[11px] font-medium text-text-main transition cursor-pointer text-center"
            >
              Manager (Budi)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('dya@ptcn.id')}
              className="px-2 py-1.5 bg-canvas hover:bg-primary/10 hover:text-primary border border-card-border rounded-md text-[11px] font-medium text-text-main transition cursor-pointer text-center"
            >
              Akuntansi (Dya)
            </button>
          </div>
        </div>

        {/* Footer Mockup 10-login.html */}
        <p className="text-center text-xs text-text-muted leading-relaxed pt-1">
          Lupa kata sandi? Hubungi Akuntansi.
          <br />
          Akun CN dan CNH memakai satu pintu masuk yang sama.
        </p>
      </div>
    </div>
  );
}
