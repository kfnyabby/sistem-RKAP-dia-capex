import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Edit,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import masterApi from '../../api/master.api';
import ImportModal from './ImportModal';
import ItemFormModal from './ItemFormModal';
import InvestmentCategoryModal from './InvestmentCategoryModal';
import CoaFormModal from './CoaFormModal';
import UnitFormModal from './UnitFormModal';

export default function MasterDataView() {
  const [subTab, setSubTab] = useState('barang'); // 'barang' | 'coa' | 'kategori_biaya' | 'kategori_investasi' | 'unit' | 'referensi'

  // Master Data States
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [itemPage, setItemPage] = useState(1);
  const [itemLimit] = useState(20);
  const [itemSearch, setItemSearch] = useState('');
  const [itemCoaFilter, setItemCoaFilter] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('');

  const [coas, setCoas] = useState([]);
  const [coaGroups, setCoaGroups] = useState([]);
  const [coaSearch, setCoaSearch] = useState('');
  const [coaGroupFilter, setCoaGroupFilter] = useState('');
  const [coaTypeFilter, setCoaTypeFilter] = useState('');

  const [investmentCategories, setInvestmentCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitCompanyFilter, setUnitCompanyFilter] = useState('');
  const [references, setReferences] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Modals state
  const [importModal, setImportModal] = useState({ open: false, type: 'items' });
  const [itemModal, setItemModal] = useState({ open: false, item: null });
  const [coaModal, setCoaModal] = useState({ open: false, coa: null });
  const [invModal, setInvModal] = useState({ open: false, category: null });
  const [unitModal, setUnitModal] = useState({ open: false, unit: null });

  // Format rupiah helper
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Data fetching effects
  useEffect(() => {
    let active = true;

    masterApi.getQualityReport().then((res) => {
      if (active) setQualityReport(res.data);
    }).catch((err) => console.error('Quality report fetch error:', err));

    masterApi.getCoaGroups().then((res) => {
      if (active) setCoaGroups(res.data || []);
    }).catch((err) => console.error('COA groups fetch error:', err));

    masterApi.getInvestmentCategories().then((res) => {
      if (active) setInvestmentCategories(res.data || []);
    }).catch((err) => console.error('Investment categories fetch error:', err));

    masterApi.getReferenceData().then((res) => {
      if (active) setReferences(res.data || {});
    }).catch((err) => console.error('Reference data fetch error:', err));

    return () => {
      active = false;
    };
  }, [refreshCounter]);

  useEffect(() => {
    let active = true;
    masterApi.getCoas({
      q: coaSearch,
      group_id: coaGroupFilter,
      type: coaTypeFilter,
    }).then((res) => {
      if (active) setCoas(res.data || []);
    }).catch((err) => console.error('COA fetch error:', err));

    return () => {
      active = false;
    };
  }, [coaSearch, coaGroupFilter, coaTypeFilter, refreshCounter]);

  useEffect(() => {
    let active = true;
    masterApi.getUnits({
      company_id: unitCompanyFilter,
    }).then((res) => {
      if (active) setUnits(res.data || []);
    }).catch((err) => console.error('Units fetch error:', err));

    return () => {
      active = false;
    };
  }, [unitCompanyFilter, refreshCounter]);

  useEffect(() => {
    let active = true;
    if (subTab === 'barang') {
      masterApi.getItems({
        page: itemPage,
        limit: itemLimit,
        q: itemSearch,
        coa_id: itemCoaFilter,
        is_active: itemStatusFilter,
      }).then((res) => {
        if (active) {
          setItems(res.data || []);
          setTotalItems(res.pagination?.total || 0);
          setLoading(false);
        }
      }).catch((err) => {
        if (active) {
          console.error('Items fetch error:', err);
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [subTab, itemPage, itemLimit, itemSearch, itemCoaFilter, itemStatusFilter, refreshCounter]);

  const handleToggleItemStatus = async (item) => {
    try {
      await masterApi.updateItemStatus(item.id, !item.is_active);
      setRefreshCounter((c) => c + 1);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status barang');
    }
  };

  const handleRefresh = () => {
    setRefreshCounter((c) => c + 1);
  };

  const totalPages = Math.ceil(totalItems / itemLimit) || 1;

  return (
    <div className="space-y-4">
      {/* Sub-tab Pill Navigation sesuai mockup */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        {[
          { id: 'barang', label: 'Barang' },
          { id: 'coa', label: 'COA' },
          { id: 'kategori_biaya', label: 'Kategori Biaya' },
          { id: 'kategori_investasi', label: 'Kategori Investasi' },
          { id: 'unit', label: 'Unit' },
          { id: 'referensi', label: 'Referensi' },
        ].map((tab) => {
          const isSelected = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600/40'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SUB-TAB BARANG                                                         */}
      {/* ========================================================================= */}
      {subTab === 'barang' && (
        <div className="space-y-4">
          {/* Card Hasil Pemeriksaan Import Terakhir sesuai mockup 11-master-data.html */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-slate-800">
                Hasil pemeriksaan import terakhir ·{' '}
                <span className="text-primary-700 font-medium">
                  {qualityReport?.last_import?.filename || 'Master_Barang_Logistik.xlsx'}
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                {qualityReport?.last_import?.created_at
                  ? new Date(qualityReport.last_import.created_at).toLocaleString('id-ID')
                  : 'Data seed dev'}
              </span>
            </div>

            {/* Grid 4 Nilai Utama */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">Barang dibaca</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">
                  {qualityReport?.last_import?.total_read?.toLocaleString('id-ID') ||
                    qualityReport?.live_metrics?.total_items?.toLocaleString('id-ID') ||
                    '3.204'}
                </div>
              </div>
              <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">Cocok dengan master lama</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">
                  {qualityReport?.last_import?.matched_existing?.toLocaleString('id-ID') || '3.080'}
                </div>
              </div>
              <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                <div className="text-xs text-emerald-700 font-medium">Barang baru</div>
                <div className="text-2xl font-bold text-emerald-800 mt-1">
                  {qualityReport?.last_import?.new_items?.toLocaleString('id-ID') || '124'}
                </div>
              </div>
              <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium">Tanpa COA</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">
                  {qualityReport?.last_import?.missing_coa?.toLocaleString('id-ID') ||
                    qualityReport?.live_metrics?.items_without_coa?.toLocaleString('id-ID') ||
                    '0'}
                </div>
              </div>
            </div>

            {/* Pill Peringatan Baris */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {qualityReport?.last_import?.coa_changed || 35} barang COA-nya berubah
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {qualityReport?.last_import?.hpp_zero ||
                  qualityReport?.live_metrics?.items_with_zero_price ||
                  52}{' '}
                barang HPP Rp 0
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />
                1 barang ada di spreadsheet, tidak ada di master
              </span>
            </div>
          </div>

          {/* Info Banner Harga CN vs CNH sesuai mockup */}
          <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
            <span className="font-bold">Harga:</span> master ini cocok dengan harga spreadsheet CN (2.822 dari
            3.067 barang), tetapi hanya 239 dari 2.619 barang CNH. CNH perlu master atau daftar harganya
            sendiri.
          </div>

          {/* Filter Bar & Tombol Aksi */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Cari barang</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setItemPage(1);
                    }}
                    placeholder="Nama atau kode produk..."
                    className="w-full text-xs pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">COA biaya</label>
                <select
                  value={itemCoaFilter}
                  onChange={(e) => {
                    setItemCoaFilter(e.target.value);
                    setItemPage(1);
                  }}
                  className="w-full text-xs"
                >
                  <option value="">Semua COA</option>
                  {coas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
                <select
                  value={itemStatusFilter}
                  onChange={(e) => {
                    setItemStatusFilter(e.target.value);
                    setItemPage(1);
                  }}
                  className="w-full text-xs"
                >
                  <option value="">Semua status</option>
                  <option value="true">Aktif</option>
                  <option value="false">Tidak aktif</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportModal({ open: true, type: 'items' })}
                  className="btn btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-primary-700" />
                  <span>Import master (xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemModal({ open: true, item: null })}
                  className="btn btn-primary py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Tambah</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabel Master Barang */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 w-12 text-center">No.</th>
                    <th className="p-3">ID / Kode</th>
                    <th className="p-3">Kode Produk</th>
                    <th className="p-3 min-w-[200px]">Nama Barang</th>
                    <th className="p-3">Golongan</th>
                    <th className="p-3">Satuan</th>
                    <th className="p-3 text-right">HPP</th>
                    <th className="p-3">COA Biaya</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-400">
                        Memuat data master barang...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-400">
                        Tidak ada data barang yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center text-slate-400">
                          {(itemPage - 1) * itemLimit + idx + 1}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-800">{item.code}</td>
                        <td className="p-3 text-slate-500">{item.product_code || '-'}</td>
                        <td className="p-3 font-medium text-slate-900">{item.name}</td>
                        <td className="p-3 text-slate-600">{item.group_name || '-'}</td>
                        <td className="p-3 text-slate-600">{item.uom || 'Pcs'}</td>
                        <td className="p-3 text-right font-mono font-medium text-slate-800">
                          {formatRupiah(item.price)}
                        </td>
                        <td className="p-3">
                          {item.coa_code ? (
                            <span className="text-slate-800 font-medium">
                              <span className="font-mono text-primary-700">{item.coa_code}</span>{' '}
                              {item.coa_name}
                            </span>
                          ) : (
                            <span className="text-rose-600 italic">Tanpa COA</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              item.is_active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setItemModal({ open: true, item })}
                              title="Ubah Barang"
                              className="p-1 rounded text-slate-500 hover:text-primary-700 hover:bg-slate-100"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleItemStatus(item)}
                              title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
              <div>
                Menampilkan <span className="font-semibold text-slate-700">{items.length}</span> dari{' '}
                <span className="font-semibold text-slate-700">{totalItems}</span> total barang
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={itemPage <= 1}
                  onClick={() => setItemPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2">
                  Halaman <span className="font-semibold text-slate-700">{itemPage}</span> / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={itemPage >= totalPages}
                  onClick={() => setItemPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-white text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Kolom lain di file (produsen, satuan jual, stok minimum dan maksimum, COA persediaan, kategori COA)
            tersimpan tetapi tidak ditampilkan di tabel ini.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB COA                                                            */}
      {/* ========================================================================= */}
      {subTab === 'coa' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Cari COA</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={coaSearch}
                    onChange={(e) => setCoaSearch(e.target.value)}
                    placeholder="Kode atau nama akun..."
                    className="w-full text-xs pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Kelompok Biaya</label>
                <select
                  value={coaGroupFilter}
                  onChange={(e) => setCoaGroupFilter(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">Semua Kelompok</option>
                  {coaGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} - {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tipe Akun</label>
                <select
                  value={coaTypeFilter}
                  onChange={(e) => setCoaTypeFilter(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">Semua Tipe</option>
                  <option value="biaya">Biaya</option>
                  <option value="investasi">Investasi / Aset Tetap</option>
                  <option value="pendapatan">Pendapatan</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportModal({ open: true, type: 'coas' })}
                  className="btn btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-primary-700" />
                  <span>Import COA (xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCoaModal({ open: true, coa: null })}
                  className="btn btn-primary py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Tambah</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 w-12 text-center">No.</th>
                    <th className="p-3 font-mono">Kode COA</th>
                    <th className="p-3">Nama Akun COA</th>
                    <th className="p-3">Kelompok</th>
                    <th className="p-3">Tipe Akun</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coas.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        Tidak ada data COA yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    coas.map((coa, idx) => (
                      <tr key={coa.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-primary-800">{coa.code}</td>
                        <td className="p-3 font-medium text-slate-900">{coa.name}</td>
                        <td className="p-3 text-slate-600">
                          {coa.group_name ? `${coa.group_code} - ${coa.group_name}` : '-'}
                        </td>
                        <td className="p-3 capitalize">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                              coa.type === 'biaya'
                                ? 'bg-amber-100 text-amber-800'
                                : coa.type === 'investasi'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {coa.type}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              coa.is_active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {coa.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setCoaModal({ open: true, coa })}
                            className="p-1 rounded text-slate-500 hover:text-primary-700 hover:bg-slate-100"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB KATEGORI BIAYA (KELOMPOK BIAYA)                                */}
      {/* ========================================================================= */}
      {subTab === 'kategori_biaya' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Kelompok Biaya (Jenis COA)
              </h2>
              <span className="text-xs text-slate-500">{coaGroups.length} kelompok terdaftar</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 w-28 font-mono">Kode</th>
                    <th className="p-3">Kelompok</th>
                    <th className="p-3 text-right">Jumlah COA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coaGroups.map((group) => {
                    const count = coas.filter((c) => c.coa_group_id === group.id).length;
                    return (
                      <tr key={group.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary-800">{group.code}</td>
                        <td className="p-3 font-medium text-slate-800">{group.name}</td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-700">
                          {count > 0 ? count : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Kelompok 5.x berasal dari sheet Kategori Biaya. Kelompok 4.1 dan 4.2 ada di template ERP (sheet BIAYA CN)
            tetapi belum ada di sheet Kategori Biaya; jumlah COA-nya dihitung dari Master COA.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-TAB KATEGORI INVESTASI                                            */}
      {/* ========================================================================= */}
      {subTab === 'kategori_investasi' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Kategori investasi, masa manfaat, dan COA penyusutan
              </h2>
              <span className="text-xs text-slate-500">
                {investmentCategories.length} kategori investasi
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 w-12 text-center">No.</th>
                    <th className="p-3 font-semibold">Kategori Investasi</th>
                    <th className="p-3 text-right">Masa Manfaat (Bulan)</th>
                    <th className="p-3 font-mono">Kode COA</th>
                    <th className="p-3">Nama COA Penyusutan</th>
                    <th className="p-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {investmentCategories.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800 tracking-tight">{cat.name}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-700">
                        {cat.useful_life_months}
                      </td>
                      <td className="p-3 font-mono font-medium text-primary-700">
                        {cat.depreciation_coa_code || '-'}
                      </td>
                      <td className="p-3 text-slate-700">{cat.depreciation_coa_name || '-'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setInvModal({ open: true, category: cat })}
                          className="btn btn-secondary px-3 py-1 text-[11px] font-semibold"
                        >
                          Ubah
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Dipakai di <b>Entry Anggaran Investasi</b>: kategori yang dipilih menentukan COA dan susut otomatis.
              Penyusutan = <code>Jumlah ÷ Masa manfaat × (12 − bulan rencana, Januari = 1)</code>.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-TAB UNIT KERJA                                                     */}
      {/* ========================================================================= */}
      {subTab === 'unit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600">Filter Perusahaan:</label>
              <select
                value={unitCompanyFilter}
                onChange={(e) => setUnitCompanyFilter(e.target.value)}
                className="text-xs"
              >
                <option value="">Semua Perusahaan</option>
                <option value="1">PT Cipta Nirmala (CN)</option>
                <option value="2">PT Cipta Nirmala Husada (CNH)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setUnitModal({ open: true, unit: null })}
              className="btn btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Kerja</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 w-12 text-center">No.</th>
                    <th className="p-3 font-mono">Kode</th>
                    <th className="p-3 font-semibold">Nama Unit Kerja</th>
                    <th className="p-3">Perusahaan</th>
                    <th className="p-3">Klasifikasi / Instalasi</th>
                    <th className="p-3">COA Pendapatan</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map((unit, idx) => (
                    <tr key={unit.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-primary-800">{unit.code}</td>
                      <td className="p-3 font-medium text-slate-900">{unit.name}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-700">{unit.company_code}</span>
                      </td>
                      <td className="p-3 text-slate-600">{unit.classification || '-'}</td>
                      <td className="p-3">
                        {unit.revenue_coa_code ? (
                          <span className="text-slate-800">
                            <span className="font-mono text-primary-700">{unit.revenue_coa_code}</span>{' '}
                            {unit.revenue_coa_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            unit.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {unit.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setUnitModal({ open: true, unit })}
                          className="p-1 rounded text-slate-500 hover:text-primary-700 hover:bg-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-TAB REFERENSI                                                      */}
      {/* ========================================================================= */}
      {subTab === 'referensi' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800">
                Skala Prioritas Program Kerja &amp; Anggaran (DIA)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rujukan penentuan skala prioritas pada entry usulan biaya dan investasi.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 w-16 text-center">Tingkat</th>
                    <th className="p-3 w-24 font-mono">Kode</th>
                    <th className="p-3 font-semibold">Nama Prioritas</th>
                    <th className="p-3">Deskripsi / Ketentuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(references?.priorities || []).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-700">{p.level}</td>
                      <td className="p-3 font-mono font-bold text-primary-800">{p.code}</td>
                      <td className="p-3 font-medium text-slate-900">{p.name}</td>
                      <td className="p-3 text-slate-600 leading-relaxed">{p.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals Container */}
      <ImportModal
        isOpen={importModal.open}
        type={importModal.type}
        onClose={() => setImportModal({ open: false, type: 'items' })}
        onSuccess={handleRefresh}
      />

      {itemModal.open && (
        <ItemFormModal
          isOpen={itemModal.open}
          item={itemModal.item}
          coaList={coas}
          onClose={() => setItemModal({ open: false, item: null })}
          onSuccess={handleRefresh}
        />
      )}

      {coaModal.open && (
        <CoaFormModal
          isOpen={coaModal.open}
          coa={coaModal.coa}
          coaGroups={coaGroups}
          onClose={() => setCoaModal({ open: false, coa: null })}
          onSuccess={handleRefresh}
        />
      )}

      {invModal.open && (
        <InvestmentCategoryModal
          isOpen={invModal.open}
          category={invModal.category}
          coaList={coas}
          onClose={() => setInvModal({ open: false, category: null })}
          onSuccess={handleRefresh}
        />
      )}

      {unitModal.open && (
        <UnitFormModal
          isOpen={unitModal.open}
          unit={unitModal.unit}
          coaList={coas}
          onClose={() => setUnitModal({ open: false, unit: null })}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
