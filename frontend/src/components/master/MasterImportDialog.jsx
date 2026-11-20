import { useState } from 'react';
import PropTypes from 'prop-types';
import masterApi from '../../api/master.api';

export default function MasterImportDialog({ isOpen, onClose, type = 'items', onSuccess }) {
  const [file, setFile] = useState(null);
  const [companyCode, setCompanyCode] = useState('CN');
  const [updatePrices, setUpdatePrices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [dryRunResult, setDryRunResult] = useState(null);

  if (!isOpen) return null;

  const isItems = type === 'items';
  const isCoas = type === 'coas';
  const isUnits = type === 'units';

  let dialogTitle = 'Import Master Data';
  let fileInstruction = 'Pilih berkas spreadsheet (.xlsx)';
  if (isItems) {
    dialogTitle = 'Import Master Barang Logistik (.xlsx)';
    fileInstruction = 'Sheet MASTER_BARANG dengan kolom ID, Kode Produk, Nama, Golongan, UOM, HPP, dsb.';
  } else if (isCoas) {
    dialogTitle = 'Import Master COA & Kategori 3-Sheet (.xlsx)';
    fileInstruction = 'Memproses 3 sheet sekaligus: Master COA, Kategori Biaya, dan Kategori Investasi.';
  } else if (isUnits) {
    dialogTitle = 'Import Draf Master Unit (.xlsx)';
    fileInstruction = 'Sheet Master_Unit draf dengan ID Draf, Kode Final, Nama Final, dan Rekomendasi.';
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.xlsx')) {
        setErrorMsg('Format berkas harus berupa spreadsheet Excel (.xlsx)');
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMsg(null);
      setSuccessMsg(null);
      setDryRunResult(null);
    }
  };

  const handleDryRun = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Pilih berkas Excel (.xlsx) terlebih dahulu');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let res;
      if (isItems) {
        res = await masterApi.importItems(file, true, {
          company_code: companyCode,
          update_prices: updatePrices,
        });
      } else if (isCoas) {
        res = await masterApi.importCoas(file, true);
      } else if (isUnits) {
        res = await masterApi.importUnits(file, true);
      }
      setDryRunResult(res);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memproses simulasi import berkas');
    } finally {
      setLoading(false);
    }
  };

  const handleRealImport = async () => {
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      let res;
      if (isItems) {
        res = await masterApi.importItems(file, false, {
          company_code: companyCode,
          update_prices: updatePrices,
        });
      } else if (isCoas) {
        res = await masterApi.importCoas(file, false);
      } else if (isUnits) {
        res = await masterApi.importUnits(file, false);
      }

      setSuccessMsg(res.message || 'Import data master berhasil disimpan ke database.');
      setDryRunResult(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data import ke database');
    } finally {
      setLoading(false);
    }
  };

  const errorsList = dryRunResult?.row_errors || dryRunResult?.errors || [];
  const summary = dryRunResult?.summary || {};

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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>{dialogTitle}</h2>
            <div style={{ fontSize: '12px', color: '#5E6070', marginTop: '2px' }}>{fileInstruction}</div>
          </div>
          <button
            type="button"
            className="btn b2"
            onClick={onClose}
            style={{ minHeight: '36px', padding: '0 12px' }}
          >
            ✕ Tutup
          </button>
        </div>

        {errorMsg && (
          <div className="card" style={{ background: '#F8D9D6', borderColor: '#E59B96', color: '#8A1F1B', marginBottom: '16px' }}>
            <b>Terjadi Kesalahan:</b> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="card" style={{ background: '#DDF1E4', borderColor: '#A2D9B7', color: '#14532D', marginBottom: '16px' }}>
            <b>Berhasil:</b> {successMsg}
            <div style={{ marginTop: '8px' }}>
              <button type="button" className="btn" onClick={onClose} style={{ minHeight: '36px' }}>
                Selesai
              </button>
            </div>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleDryRun}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label>
                Pilih Berkas Excel (.xlsx)
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  disabled={loading}
                  style={{ paddingTop: '8px' }}
                />
              </label>

              {isItems && (
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <label style={{ flex: 1, minWidth: '160px' }}>
                    Entitas Perusahaan Target HPP
                    <select
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      disabled={loading}
                    >
                      <option value="CN">PT CN (Rumah Sakit)</option>
                      <option value="CNH">PT CNH (Klinik & Holding)</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingBottom: '10px' }}>
                    <input
                      type="checkbox"
                      checked={updatePrices}
                      onChange={(e) => setUpdatePrices(e.target.checked)}
                      disabled={loading}
                      style={{ minHeight: 'auto', width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Perbarui harga barang lama yang sudah terdaftar</span>
                  </label>
                </div>
              )}

              {/* Tombol Simulasi Dry-Run */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  className="btn b2"
                  disabled={loading || !file}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {loading && !dryRunResult ? 'Sedang Memproses...' : '1. Cek Simulasi (Dry Run)'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Hasil Simulasi Dry Run */}
        {dryRunResult && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #E6E0D6', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '15px', margin: 0 }}>Hasil Simulasi Berkas</h2>
              <span className="chip wn">Mode Simulasi (Dry Run)</span>
            </div>

            {/* Metrik Ringkasan */}
            <div className="card" style={{ background: '#FAF7F2', marginBottom: '12px' }}>
              <div className="g4">
                {isItems && (
                  <>
                    <div>
                      <div className="lb">Barang Dibaca</div>
                      <div className="vl">{summary.total_read ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Cocok Eksisting</div>
                      <div className="vl">{summary.matched_existing ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Barang Baru</div>
                      <div className="vl">{summary.new_items ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Tanpa COA</div>
                      <div className="vl">{summary.missing_coa ?? 0}</div>
                    </div>
                  </>
                )}

                {isCoas && (
                  <>
                    <div>
                      <div className="lb">COA Dibaca</div>
                      <div className="vl">{summary.coa_read ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Kelompok Dibaca</div>
                      <div className="vl">{summary.groups_read ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Kategori Investasi</div>
                      <div className="vl">{summary.investment_categories_read ?? 0}</div>
                    </div>
                  </>
                )}

                {isUnits && (
                  <>
                    <div>
                      <div className="lb">Unit Dibaca</div>
                      <div className="vl">{summary.total_read ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Cocok Eksisting</div>
                      <div className="vl">{summary.matched_existing ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Unit Baru</div>
                      <div className="vl">{summary.new_units ?? 0}</div>
                    </div>
                    <div>
                      <div className="lb">Perlu Dicek</div>
                      <div className="vl">{summary.needs_review_count ?? 0}</div>
                    </div>
                  </>
                )}
              </div>

              {isItems && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="chip wn">{summary.coa_changed ?? 0} barang COA-nya berubah</span>
                  <span className="chip wn">{summary.hpp_zero ?? 0} barang HPP 0</span>
                  <span className="chip nt">{summary.prices_to_update ?? 0} harga akan diperbarui</span>
                </div>
              )}
            </div>

            {/* Galat Baris */}
            {errorsList.length > 0 ? (
              <div className="card" style={{ background: '#F8D9D6', borderColor: '#E59B96', marginBottom: '16px' }}>
                <b style={{ color: '#8A1F1B' }}>Ditemukan {errorsList.length} Galat Baris:</b>
                <div style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '8px', fontSize: '13px' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#8A1F1B' }}>
                    {errorsList.slice(0, 50).map((err, idx) => (
                      <li key={idx}>
                        Baris {err.row || err.row_number || '?'}: {err.message || err.error || 'Galat validasi data'}
                      </li>
                    ))}
                  </ul>
                  {errorsList.length > 50 && (
                    <div style={{ fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>
                      ... dan {errorsList.length - 50} baris galat lainnya.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <span className="chip ok">✓ Validasi Berkas Sukses: Siap diimpor</span>
              </div>
            )}

            {/* Tombol Konfirmasi Import Riil */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={handleRealImport}
                disabled={loading}
              >
                {loading ? 'Menyimpan ke Database...' : '2. Konfirmasi Simpan ke Database'}
              </button>
              <button
                type="button"
                className="btn b2"
                onClick={onClose}
                disabled={loading}
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

MasterImportDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['items', 'coas', 'units']),
  onSuccess: PropTypes.func,
};
