import { useState } from 'react';
import PropTypes from 'prop-types';
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileSpreadsheet, Loader2, X } from 'lucide-react';
import masterApi from '../../api/master.api';

export default function ImportModal({ isOpen, onClose, type = 'items', onSuccess }) {
  const [file, setFile] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [companyCode, setCompanyCode] = useState('CN');
  const [updatePrices, setUpdatePrices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const isItems = type === 'items';
  const isCoas = type === 'coas';
  const isUnits = type === 'units';

  let title = 'Import Master Data';
  if (isItems) title = 'Import Master Barang Logistik';
  else if (isCoas) title = 'Import Master COA & Kategori (3-Sheet)';
  else if (isUnits) title = 'Import Draf Master Unit (Master_Unit)';

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.endsWith('.xlsx')) {
        setErrorMsg('Harap pilih berkas berekstensi .xlsx');
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMsg(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Pilih berkas Excel (.xlsx) terlebih dahulu');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      let res;
      if (isItems) {
        res = await masterApi.importItems(file, dryRun, {
          company_code: companyCode,
          update_prices: updatePrices,
        });
      } else if (isCoas) {
        res = await masterApi.importCoas(file, dryRun);
      } else if (isUnits) {
        res = await masterApi.importUnits(file, dryRun);
      }
      setResult(res);
      if (!dryRun && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses import berkas Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{title}</h2>
              <p className="text-xs text-slate-500">Format Excel (.xlsx) sesuai modul Master Data</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Panduan Format */}
          <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 space-y-1">
            <span className="font-semibold text-amber-900 block">Panduan Format Lembar Kerja:</span>
            {isItems && (
              <p>
                Sheet: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">MASTER_BARANG</code>.
                Kolom wajib: <code>NAMA_BARANG</code>, <code>COA_BIAYA</code>, <code>HPP</code>. Opsional: <code>ID_BARANG</code>, <code>KODE_PRODUK</code>, <code>GOLONGAN</code>, <code>SATUAN_BELI</code>, <code>STATUS</code>.
              </p>
            )}
            {isCoas && (
              <p>
                Wajib memiliki 3 Sheet: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Master COA</code>,{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Kategori Biaya</code>, dan{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Kategori Investasi</code>.
              </p>
            )}
            {isUnits && (
              <p>
                Sheet: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Master_Unit</code>.
                Kolom kunci baris: <code>ID Draf (jangan diubah)</code> (source_key). Resolusi nilai: kolom final (Q, R, S, T) dengan fallback ke nilai awal. Keputusan &quot;Hapus&quot; menonaktifkan unit, &quot;Pakai/Ubah&quot; mengaktifkan unit.
              </p>
            )}
          </div>

          {/* Opsi Target Perusahaan & Periode untuk Import Barang */}
          {isItems && (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Perusahaan</label>
                <select
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  className="w-full text-xs rounded border-slate-300 bg-white py-1.5 px-2"
                >
                  <option value="CN">PT Cipta Nirmala (CN)</option>
                  <option value="CNH">PT Cipta Nirmala Husada (CNH)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">HPP hanya akan disimpan untuk perusahaan terpilih.</p>
              </div>
              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={updatePrices}
                    onChange={(e) => setUpdatePrices(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                  />
                  <span>Perbarui harga barang lama</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1">
                  Bila dicentang, harga barang lama yang berubah akan diperbarui di database.
                </p>
              </div>
            </div>
          )}

          {/* Area File Input */}
          <div className="border-2 border-dashed border-slate-200 hover:border-primary-400 rounded-xl p-6 text-center transition-colors bg-slate-50/40">
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer block space-y-2">
              <Upload className="w-8 h-8 mx-auto text-slate-400" />
              <div className="text-sm font-medium text-slate-700">
                {file ? file.name : 'Klik untuk memilih berkas .xlsx atau seret ke sini'}
              </div>
              <div className="text-xs text-slate-400">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Maksimum ukuran 15 MB'}
              </div>
            </label>
          </div>

          {/* Opsi Dry Run */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="dry-run-checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <label htmlFor="dry-run-checkbox" className="text-sm text-slate-700 font-medium cursor-pointer">
              Simulasi terlebih dahulu (dry run) — periksa validitas tanpa mengubah database
            </label>
          </div>

          {/* Hasil Ringkasan Import */}
          {result && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  {result.dry_run ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  {result.dry_run ? 'Hasil Simulasi (Data Belum Disimpan)' : 'Hasil Import Tersimpan'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                  {result.summary?.total_read || 0} baris dibaca
                </span>
              </div>

              {/* Grid Metrik Ringkasan */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {isItems && (
                  <>
                    <div className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200">
                      <div className="text-slate-500">Cocok Master Lama</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {result.summary?.matched_existing || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-700">Barang Baru</div>
                      <div className="text-base font-bold text-emerald-800 mt-0.5">
                        {result.summary?.new_items || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-blue-700">Harga Berubah</div>
                      <div className="text-base font-bold text-blue-800 mt-0.5">
                        {result.summary?.prices_to_update || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="text-amber-700">COA Berubah</div>
                      <div className="text-base font-bold text-amber-800 mt-0.5">
                        {result.summary?.coa_changed || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="text-amber-700">HPP Rp 0</div>
                      <div className="text-base font-bold text-amber-800 mt-0.5">
                        {result.summary?.hpp_zero || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                      <div className="text-rose-700">Tanpa COA</div>
                      <div className="text-base font-bold text-rose-800 mt-0.5">
                        {result.summary?.missing_coa || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                      <div className="text-rose-700">COA Tidak Dikenal</div>
                      <div className="text-base font-bold text-rose-800 mt-0.5">
                        {result.summary?.unknown_coa || 0}
                      </div>
                    </div>
                  </>
                )}

                {isCoas && (
                  <>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-700">Master COA</div>
                      <div className="text-base font-bold text-emerald-800 mt-0.5">
                        {result.summary?.master_coa_read || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200">
                      <div className="text-slate-500">Kategori Biaya</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {result.summary?.kategori_biaya_read || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="text-purple-700">Kategori Investasi</div>
                      <div className="text-base font-bold text-purple-800 mt-0.5">
                        {result.summary?.kategori_investasi_read || 0}
                      </div>
                    </div>
                  </>
                )}

                {isUnits && (
                  <>
                    <div className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200">
                      <div className="text-slate-500">Cocok Unit Lama</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {result.summary?.matched_existing || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-700">Unit Baru</div>
                      <div className="text-base font-bold text-emerald-800 mt-0.5">
                        {result.summary?.new_units || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-700">Unit Aktif</div>
                      <div className="text-base font-bold text-emerald-800 mt-0.5">
                        {result.summary?.active_units || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-100/70 border border-slate-200">
                      <div className="text-slate-500">Dinonaktifkan (&apos;Hapus&apos;)</div>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {result.summary?.inactive_units || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="text-amber-700">Perlu Review / Isu</div>
                      <div className="text-base font-bold text-amber-800 mt-0.5">
                        {result.summary?.needs_review_count || 0}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                      <div className="text-rose-700">Tanpa Kode Resmi</div>
                      <div className="text-base font-bold text-rose-800 mt-0.5">
                        {result.summary?.missing_code || 0}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Rincian Galat / Catatan Per Baris jika ada */}
              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Peringatan / Isu Validasi ({result.errors.length} baris):
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50/50 p-2 text-xs space-y-1">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="text-amber-950 border-b border-amber-100 pb-1 last:border-0">
                        <span className="font-semibold">Baris {err.row}:</span>{' '}
                        {err.source_key && <span className="font-mono text-purple-700">[{err.source_key}] </span>}
                        {err.code && <span className="text-slate-600">[{err.code}] </span>}
                        {err.name && <span className="text-slate-800 font-medium">&quot;{err.name}&quot; - </span>}
                        <span>{err.warning || err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {result && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Pilih Berkas Lain
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="btn btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : dryRun ? (
                'Jalankan Simulasi'
              ) : (
                'Proses Simpan Import'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ImportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['items', 'coas', 'units']),
  onSuccess: PropTypes.func,
};
