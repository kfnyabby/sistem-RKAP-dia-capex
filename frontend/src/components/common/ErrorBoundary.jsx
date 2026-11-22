import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#FAF7F2', padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div style={{ maxWidth: 640, width: '100%', background: '#fff', border: '1px solid #F8D9D6', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#8A1F1B' }}>
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Terjadi Kesalahan Tampilan (UI Error)</h2>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#5E6070' }}>
              Aplikasi mendeteksi galat saat memuat komponen halaman ini:
            </p>

            <div style={{ background: '#FFF5F5', border: '1px solid #F8D9D6', borderRadius: 8, padding: 12, fontSize: 12, fontFamily: 'monospace', color: '#8A1F1B', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              <b>{this.state.error?.toString()}</b>
              {this.state.error?.stack && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#5E6070' }}>
                  {this.state.error.stack}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 38, fontSize: 12, padding: '0 16px' }}
              >
                <RefreshCw size={14} />
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

