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
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white border border-[#E6E0D6] rounded-2xl shadow-sm p-8 space-y-6">
        {/* Header Mockup */}
        <div className="text-center">
          <div className="text-xs font-bold tracking-wider text-[#3D4E9C] uppercase">DIA CAPEX</div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Sistem RKAP</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Masuk untuk mengisi dan memonitor anggaran biaya dan investasi.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="em" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Email
            </label>
            <input
              id="em"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@ptcn.id"
              className="w-full px-3.5 py-2.5 bg-white border border-[#B9B4C9] rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3D4E9C] focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="pw" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Kata sandi
            </label>
            <input
              id="pw"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-white border border-[#B9B4C9] rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3D4E9C] focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] bg-[#3D4E9C] hover:bg-[#2f3d7c] active:bg-[#253063] text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-70 disabled:cursor-not-allowed"
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
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase mb-2">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Pilih Akun Cepat (Dev Seed)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('rina@ptcn.id')}
              className="px-2 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 transition cursor-pointer text-center"
            >
              PIC (Rina)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('budi@ptcn.id')}
              className="px-2 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 transition cursor-pointer text-center"
            >
              Manager (Budi)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('dya@ptcn.id')}
              className="px-2 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 transition cursor-pointer text-center"
            >
              Akuntansi (Dya)
            </button>
          </div>
        </div>

        {/* Footer Mockup */}
        <p className="text-center text-xs text-slate-500 leading-relaxed pt-1">
          Lupa kata sandi? Hubungi Akuntansi.
          <br />
          Akun CN dan CNH memakai satu pintu masuk yang sama.
        </p>
      </div>
    </div>
  );
}
