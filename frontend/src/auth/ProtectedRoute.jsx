import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({
  children,
  allowedRoles,
  deniedMessage = 'Akses ditolak: Anda tidak memiliki wewenang untuk membuka halaman tersebut.',
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#FAF7F2',
          display: 'grid',
          placeItems: 'center',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #3D4E9C',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ margin: 0, fontSize: '13px', color: '#5E6070', fontWeight: 500 }}>
            Memuat data sesi...
          </p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Jika belum login, alihkan ke halaman login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Jika peran pengguna tidak diizinkan untuk rute ini
  if (allowedRoles && Array.isArray(allowedRoles)) {
    const userRole = (user.role || '').toLowerCase();
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole);
    if (!isAllowed) {
      return (
        <Navigate
          to="/dashboard"
          state={{ alert: { message: deniedMessage, variant: 'bd' } }}
          replace
        />
      );
    }
  }

  return children;
}
