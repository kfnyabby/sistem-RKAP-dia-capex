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
        <div className="min-h-screen bg-[#FAF7F2] p-8 flex items-center justify-center font-sans">
          <div className="max-w-xl w-full bg-white border border-[#F8D9D6] rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#8A1F1B]">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Terjadi Kesalahan Tampilan (UI Error)</h2>
            </div>

            <p className="text-xs text-[#5E6070]">
              Aplikasi mendeteksi galat saat memuat komponen halaman ini:
            </p>

            <div className="bg-[#FFF5F5] border border-[#F8D9D6] rounded-lg p-3 text-xs font-mono text-[#8A1F1B] overflow-x-auto whitespace-pre-wrap">
              <b>{this.state.error?.toString()}</b>
              {this.state.error?.stack && (
                <div className="mt-2 text-[11px] text-slate-500">
                  {this.state.error.stack}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3D4E9C] text-white rounded-md text-xs font-semibold hover:bg-[#313f80] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
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

