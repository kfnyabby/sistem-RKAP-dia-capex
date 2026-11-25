import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import PengaturanSubNav from '../components/pengaturan/PengaturanSubNav';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import masterApi from '../api/master.api';
import MasterImportDialog from '../components/master/MasterImportDialog';
import ItemPriceHistoryModal from '../components/master/ItemPriceHistoryModal';
import ItemFormModal from '../components/master/ItemFormModal';
import InvestmentCategoryModal from '../components/master/InvestmentCategoryModal';
import CoaFormModal from '../components/master/CoaFormModal';
import UnitFormModal from '../components/master/UnitFormModal';

export default function PengaturanMasterPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAkuntansi = user?.role === 'akuntansi';
  const [activeTab, setActiveTab] = useState('barang'); // 'barang' | 'coa' | 'kategori_biaya' | 'kategori_investasi' | 'unit' | 'referensi'

  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async (type) => {
    try {
      setDownloadingTemplate(true);
      const res = await masterApi.downloadTemplate(type);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName =
        type === 'items'
          ? 'Template_Import_Barang.xlsx'
          : type === 'coas'
          ? 'Template_Import_COA_dan_Kategori.xlsx'
          : 'Template_Import_Unit.xlsx';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengunduh template spreadsheet');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Items State (Pagination dari server: ±3.200 baris)
  const [itemPage, setItemPage] = useState(1);
  const [itemLimit, setItemLimit] = useState(20);
  const [itemSearch, setItemSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [itemCoaFilter, setItemCoaFilter] = useState('');
  const [itemGroupFilter, setItemGroupFilter] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('');

  // COA Filter State
  const [coaSearch, setCoaSearch] = useState('');
  const [coaCatFilter, setCoaCatFilter] = useState('');
  const [coaGroupFilter, setCoaGroupFilter] = useState('');

  // Unit Filter State
  const [unitSearch, setUnitSearch] = useState('');
  const [unitCompanyFilter, setUnitCompanyFilter] = useState('');
  const [unitReviewFilter, setUnitReviewFilter] = useState('');

  // Modal States
  const [importDialog, setImportDialog] = useState({ open: false, type: 'items' });
  const [priceModal, setPriceModal] = useState({ open: false, item: null });
  const [itemModal, setItemModal] = useState({ open: false, item: null });
  const [invModal, setInvModal] = useState({ open: false, category: null });
  const [coaModal, setCoaModal] = useState({ open: false, coa: null });
  const [unitModal, setUnitModal] = useState({ open: false, unit: null });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: 'item', // 'item' | 'coa' | 'unit'
    entity: null,
    loading: false,
    error: null,
    canDeactivate: false,
    deactivateLoading: false,
  });

  const handleOpenDelete = (type, entity) => {
    setDeleteModal({
      open: true,
      type,
      entity,
      loading: false,
      error: null,
      canDeactivate: false,
      deactivateLoading: false,
    });
  };

  const handleCloseDelete = () => {
    setDeleteModal({
      open: false,
      type: 'item',
      entity: null,
      loading: false,
      error: null,
      canDeactivate: false,
      deactivateLoading: false,
    });
  };

  const handleConfirmDelete = async () => {
    const { type, entity } = deleteModal;
    if (!entity?.id) return;

    try {
      setDeleteModal((prev) => ({ ...prev, loading: true, error: null }));
      if (type === 'item') {
        await masterApi.deleteItem(entity.id);
        queryClient.invalidateQueries({ queryKey: ['items'] });
        queryClient.invalidateQueries({ queryKey: ['qualityReport'] });
      } else if (type === 'coa') {
        await masterApi.deleteCoa(entity.id);
        queryClient.invalidateQueries({ queryKey: ['coas'] });
        queryClient.invalidateQueries({ queryKey: ['coaGroups'] });
        queryClient.invalidateQueries({ queryKey: ['qualityReport'] });
      } else if (type === 'unit') {
        await masterApi.deleteUnit(entity.id);
        queryClient.invalidateQueries({ queryKey: ['units'] });
      }
      handleCloseDelete();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menghapus data.';
      const canDeact = err.response?.status === 409 || err.response?.data?.can_deactivate;
      setDeleteModal((prev) => ({
        ...prev,
        loading: false,
        error: msg,
        canDeactivate: canDeact,
      }));
    }
  };

  const handleDeactivateInstead = async () => {
    const { type, entity } = deleteModal;
    if (!entity?.id) return;

    try {
      setDeleteModal((prev) => ({ ...prev, deactivateLoading: true }));
      if (type === 'item') {
        await masterApi.updateItemStatus(entity.id, false);
        queryClient.invalidateQueries({ queryKey: ['items'] });
      } else if (type === 'coa') {
        await masterApi.updateCoa(entity.id, { ...entity, is_active: false });
        queryClient.invalidateQueries({ queryKey: ['coas'] });
      } else if (type === 'unit') {
        await masterApi.updateUnit(entity.id, { ...entity, is_active: false });
        queryClient.invalidateQueries({ queryKey: ['units'] });
      }
      handleCloseDelete();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menonaktifkan data.';
      setDeleteModal((prev) => ({ ...prev, deactivateLoading: false, error: msg }));
    }
  };

  // Debounce input pencarian barang
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(itemSearch);
      setItemPage(1); // Reset ke halaman pertama saat kata kunci berubah
    }, 350);
    return () => clearTimeout(handler);
  }, [itemSearch]);

  // 1. Quality Report via TanStack Query (khusus Akuntansi)
  const { data: qualityReport } = useQuery({
    queryKey: ['qualityReport'],
    queryFn: masterApi.getQualityReport,
    enabled: isAkuntansi,
  });

  // 2. Reference Data via TanStack Query
  const { data: references } = useQuery({
    queryKey: ['references'],
    queryFn: masterApi.getReferenceData,
  });

  // 3. COA Groups via TanStack Query
  const { data: coaGroupsResponse } = useQuery({
    queryKey: ['coaGroups'],
    queryFn: masterApi.getCoaGroups,
  });
  const coaGroups = useMemo(() => coaGroupsResponse?.data || [], [coaGroupsResponse]);

  // 4. Investment Categories via TanStack Query
  const { data: invCategoriesResponse } = useQuery({
    queryKey: ['investmentCategories'],
    queryFn: masterApi.getInvestmentCategories,
  });
  const investmentCategories = useMemo(
    () => invCategoriesResponse?.data || [],
    [invCategoriesResponse]
  );

  // 5. Load All COAs via TanStack Query (untuk dropdown & Tab COA)
  const { data: coasResponse } = useQuery({
    queryKey: ['coas'],
    queryFn: () => masterApi.getCoas({ per_page: 500 }),
  });
  const coaList = useMemo(() => coasResponse?.data || [], [coasResponse]);

  // 6. Load Units via TanStack Query (untuk Tab Unit)
  const { data: unitsResponse } = useQuery({
    queryKey: ['units'],
    queryFn: () => masterApi.getUnits({}),
  });
  const unitList = useMemo(() => unitsResponse?.data || [], [unitsResponse]);

  // 7. Load Items via TanStack Query (Server Pagination ±3.200 baris)
  const { data: itemsResponse, isLoading: loadingItems } = useQuery({
    queryKey: [
      'items',
      itemPage,
      itemLimit,
      debouncedSearch,
      itemCoaFilter,
      itemGroupFilter,
      itemStatusFilter,
    ],
    queryFn: () =>
      masterApi.getItems({
        page: itemPage,
        per_page: itemLimit,
        q: debouncedSearch || undefined,
        coa_id: itemCoaFilter || undefined,
        group_name: itemGroupFilter || undefined,
        is_active: itemStatusFilter !== '' ? itemStatusFilter : undefined,
      }),
  });

  const items = useMemo(() => itemsResponse?.data || [], [itemsResponse]);
  const totalItems = itemsResponse?.total || 0;

  const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num || 0);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemLimit));

  // Filter COA lokal untuk Tab COA
  const filteredCoas = useMemo(() => {
    return coaList.filter((c) => {
      if (coaSearch.trim()) {
        const q = coaSearch.toLowerCase().trim();
        const matchesCode = (c.code || '').toLowerCase().includes(q);
        const matchesName = (c.name || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return false;
      }
      if (coaCatFilter && c.category !== coaCatFilter) return false;
      if (coaGroupFilter && String(c.group_id) !== String(coaGroupFilter)) return false;
      return true;
    });
  }, [coaList, coaSearch, coaCatFilter, coaGroupFilter]);

  // Filter Unit lokal untuk Tab Unit
  const filteredUnits = useMemo(() => {
    return unitList.filter((u) => {
      if (unitSearch.trim()) {
        const q = unitSearch.toLowerCase().trim();
        const matchesName = (u.name || '').toLowerCase().includes(q);
        const matchesCode = (u.code || '').toLowerCase().includes(q);
        const matchesKey = (u.source_key || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesKey) return false;
      }
      if (unitCompanyFilter && String(u.company_id) !== String(unitCompanyFilter)) return false;
      if (unitReviewFilter === 'needs_review' && !u.needs_review) return false;
      if (unitReviewFilter === 'clean' && u.needs_review) return false;
      return true;
    });
  }, [unitList, unitSearch, unitCompanyFilter, unitReviewFilter]);

  const lastImport = qualityReport?.last_import;
  const priceWarning = qualityReport?.price_warning?.message;

  return (
    <>
      <PageHeader
        title="Pengaturan · Master Data"
        chips={<Chip variant="nt">Akuntansi</Chip>}
      />

      <PengaturanSubNav />

      {/* Baris Tab Navigasi Mockup */}
      <div className="row" style={{ marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('barang')}
          className={`chip ${activeTab === 'barang' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px', border: 0, cursor: 'pointer', font: 'inherit' }}
        >
          Barang
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('coa')}
          className={`chip ${activeTab === 'coa' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px', border: 0, cursor: 'pointer', font: 'inherit' }}
        >
          COA
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kategori_biaya')}
          className={`chip ${activeTab === 'kategori_biaya' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px', border: 0, cursor: 'pointer', font: 'inherit' }}
        >
          Kategori Biaya
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kategori_investasi')}
          className={`chip ${activeTab === 'kategori_investasi' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px', border: 0, cursor: 'pointer', font: 'inherit' }}
        >
          Kategori Investasi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unit')}
          className={`chip ${activeTab === 'unit' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px', border: 0, cursor: 'pointer', font: 'inherit' }}
        >
          Unit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('referensi')}
          className={`chip ${activeTab === 'referensi' ? 'ok' : 'nt'}`}
          style={{ padding: '10px 16px', border: 0, cursor: 'pointer', font: 'inherit' }}
        >
          Referensi
        </button>
      </div>

      {/* ========================================================
          TAB 1: BARANG
          ======================================================== */}
      {activeTab === 'barang' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Kartu Hasil Pemeriksaan Import Terakhir (Khusus Akuntansi) */}
          {isAkuntansi && lastImport ? (
            <div className="card">
              <h2>Hasil pemeriksaan import terakhir · {lastImport.filename || 'Master_Barang_Logistik.xlsx'}</h2>
              <div className="g4">
                <div>
                  <div className="lb">Barang dibaca</div>
                  <div className="vl">{formatNumber(lastImport.total_read)}</div>
                </div>
                <div>
                  <div className="lb">Cocok dengan spreadsheet RKAP</div>
                  <div className="vl">{formatNumber(lastImport.matched_existing)}</div>
                </div>
                <div>
                  <div className="lb">Barang baru</div>
                  <div className="vl">{formatNumber(lastImport.new_items)}</div>
                </div>
                <div>
                  <div className="lb">Tanpa COA</div>
                  <div className="vl">{formatNumber(lastImport.missing_coa)}</div>
                </div>
              </div>
              <p style={{ margin: '12px 0 0', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="chip wn">{lastImport.coa_changed || 0} barang COA-nya berubah</span>
                <span className="chip wn">{lastImport.hpp_zero || 0} barang HPP 0</span>
                {lastImport.unknown_coa > 0 && (
                  <span className="chip wn">{lastImport.unknown_coa} barang COA tidak dikenal</span>
                )}
                <span style={{ fontSize: '12px', color: '#5E6070', marginLeft: 'auto' }}>
                  Diimpor pada {new Date(lastImport.created_at).toLocaleString('id-ID')} oleh {lastImport.user_name || 'Akuntansi'}
                </span>
              </p>
            </div>
          ) : isAkuntansi ? (
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Hasil pemeriksaan import terakhir</h2>
                <div style={{ fontSize: '14px', color: '#5E6070', marginTop: '4px' }}>
                  Belum ada import. Unggah berkas Excel Master Barang Logistik untuk memulai pengisian katalog.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn b2"
                  onClick={() => handleDownloadTemplate('items')}
                  disabled={downloadingTemplate}
                >
                  {downloadingTemplate ? 'Mengunduh...' : 'Unduh template (xlsx)'}
                </button>
                <button
                  type="button"
                  className="btn b2"
                  onClick={() => setImportDialog({ open: true, type: 'items' })}
                >
                  Import master (xlsx)
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Katalog Master Barang Logistik</h2>
                <div style={{ fontSize: '14px', color: '#5E6070', marginTop: '4px' }}>
                  Daftar katalog master barang logistik beserta kode produk, HPP CN/CNH, dan pemetaan COA biaya.
                </div>
              </div>
              <button
                type="button"
                className="btn b2"
                onClick={() => handleDownloadTemplate('items')}
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? 'Mengunduh...' : '📥 Unduh template barang (xlsx)'}
              </button>
            </div>
          )}

          {/* Kotak Peringatan Harga */}
          {isAkuntansi && priceWarning && (
            <div
              className="card"
              style={{
                background: '#FBE8C8',
                borderColor: '#E3C58A',
                color: '#5C3600',
              }}
            >
              <b>Harga:</b> {priceWarning}
            </div>
          )}

          {/* Baris Filter & Tombol Aksi */}
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label htmlFor="sb" style={{ flex: 1, minWidth: '180px' }}>
              Cari barang
              <input
                id="sb"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Nama atau kode produk"
              />
            </label>

            <label htmlFor="sc" style={{ minWidth: '180px' }}>
              COA biaya
              <select
                id="sc"
                value={itemCoaFilter}
                onChange={(e) => {
                  setItemCoaFilter(e.target.value);
                  setItemPage(1);
                }}
              >
                <option value="">Semua COA</option>
                {coaList
                  .filter((c) => c.category === 'biaya')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} {c.name}
                    </option>
                  ))}
              </select>
            </label>

            <label htmlFor="sg" style={{ minWidth: '160px' }}>
              Golongan
              <select
                id="sg"
                value={itemGroupFilter}
                onChange={(e) => {
                  setItemGroupFilter(e.target.value);
                  setItemPage(1);
                }}
              >
                <option value="">Semua golongan</option>
                {(references?.item_groups || []).map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="ss" style={{ minWidth: '130px' }}>
              Status
              <select
                id="ss"
                value={itemStatusFilter}
                onChange={(e) => {
                  setItemStatusFilter(e.target.value);
                  setItemPage(1);
                }}
              >
                <option value="">Semua status</option>
                <option value="true">Aktif</option>
                <option value="false">Tidak aktif</option>
              </select>
            </label>

            <button
              type="button"
              className="btn b2"
              onClick={() => handleDownloadTemplate('items')}
              disabled={downloadingTemplate}
            >
              {downloadingTemplate ? 'Mengunduh...' : 'Unduh template (xlsx)'}
            </button>

            {isAkuntansi && (
              <>
                <button
                  type="button"
                  className="btn b2"
                  onClick={() => setImportDialog({ open: true, type: 'items' })}
                >
                  Import master (xlsx)
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => setItemModal({ open: true, item: null })}
                >
                  Tambah barang
                </button>
              </>
            )}
          </div>

          {/* Tabel Barang Bernomor dengan Paginasi dari Server */}
          <div className="card sc" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No.</th>
                  <th>ID</th>
                  <th>Kode produk</th>
                  <th>Nama barang</th>
                  <th>Golongan</th>
                  <th>Satuan beli</th>
                  <th className="r">HPP (CN)</th>
                  <th className="r">HPP (CNH)</th>
                  <th>COA biaya</th>
                  <th>Status</th>
                  {isAkuntansi && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {loadingItems ? (
                  <tr>
                    <td colSpan={isAkuntansi ? 11 : 10} style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                      Memuat katalog data barang...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={isAkuntansi ? 11 : 10} style={{ textAlign: 'center', padding: '32px', color: '#5E6070' }}>
                      Tidak ada barang yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const rowNum = (itemPage - 1) * itemLimit + idx + 1;
                    return (
                      <tr key={item.id}>
                        <td>{rowNum}</td>
                        <td style={{ fontWeight: 600 }}>{item.code}</td>
                        <td>{item.product_code || '—'}</td>
                        <td>{item.name}</td>
                        <td>{item.group_name || '—'}</td>
                        <td>{item.uom}</td>
                        <td className="r">{formatNumber(item.price_cn)}</td>
                        <td className="r">{formatNumber(item.price_cnh)}</td>
                        <td>
                          {item.coa_code ? `${item.coa_code} ${item.coa_name}` : <span style={{ color: '#8A1F1B' }}>Tanpa COA</span>}
                        </td>
                        <td>
                          <span className={`chip ${item.is_active ? 'ok' : 'bd'}`}>
                            {item.is_active ? 'Aktif' : 'Tidak aktif'}
                          </span>
                        </td>
                        {isAkuntansi && (
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn b2"
                              onClick={() => setPriceModal({ open: true, item })}
                              style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px', marginRight: '6px' }}
                            >
                              Ubah harga
                            </button>
                            <button
                              type="button"
                              className="btn b2"
                              onClick={() => setItemModal({ open: true, item })}
                              style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px', marginRight: '6px' }}
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              className="btn b3"
                              onClick={() => handleOpenDelete('item', item)}
                              style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                              title="Hapus Barang"
                            >
                              Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Baris Navigasi Paginasi Server */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#5E6070' }}>
              Menampilkan {totalItems === 0 ? 0 : (itemPage - 1) * itemLimit + 1}–
              {Math.min(itemPage * itemLimit, totalItems)} dari {formatNumber(totalItems)} barang
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                Per halaman:
                <select
                  value={itemLimit}
                  onChange={(e) => {
                    setItemLimit(Number(e.target.value));
                    setItemPage(1);
                  }}
                  style={{ minHeight: '36px', padding: '4px 8px' }}
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>

              <button
                type="button"
                className="btn b2"
                disabled={itemPage <= 1 || loadingItems}
                onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                style={{ minHeight: '36px', padding: '0 12px' }}
              >
                &larr; Sebelumnya
              </button>

              <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 4px' }}>
                {itemPage} / {totalPages}
              </span>

              <button
                type="button"
                className="btn b2"
                disabled={itemPage >= totalPages || loadingItems}
                onClick={() => setItemPage((p) => Math.min(totalPages, p + 1))}
                style={{ minHeight: '36px', padding: '0 12px' }}
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '13px', color: '#5E6070' }}>
            Kolom lain di file (produsen, satuan jual, stok minimum dan maksimum, COA persediaan, kategori COA) tersimpan tetapi tidak ditampilkan di tabel ini.
          </p>
        </div>
      )}

      {/* ========================================================
          TAB 2: COA (BAGAN AKUN STANDAR)
          ======================================================== */}
      {activeTab === 'coa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label style={{ flex: 1, minWidth: '180px' }}>
              Cari akun COA
              <input
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder="Kode atau nama akun"
              />
            </label>

            <label style={{ minWidth: '150px' }}>
              Kategori
              <select value={coaCatFilter} onChange={(e) => setCoaCatFilter(e.target.value)}>
                <option value="">Semua Kategori</option>
                <option value="biaya">Biaya</option>
                <option value="investasi">Investasi</option>
              </select>
            </label>

            <label style={{ minWidth: '180px' }}>
              Kelompok Akun
              <select value={coaGroupFilter} onChange={(e) => setCoaGroupFilter(e.target.value)}>
                <option value="">Semua Kelompok</option>
                {coaGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} {g.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="btn b2"
              onClick={() => handleDownloadTemplate('coas')}
              disabled={downloadingTemplate}
            >
              {downloadingTemplate ? 'Mengunduh...' : 'Unduh template (xlsx)'}
            </button>

            {isAkuntansi && (
              <>
                <button
                  type="button"
                  className="btn b2"
                  onClick={() => setImportDialog({ open: true, type: 'coas' })}
                >
                  Import COA (xlsx)
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => setCoaModal({ open: true, coa: null })}
                >
                  Tambah COA
                </button>
              </>
            )}
          </div>

          <div className="card sc" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No.</th>
                  <th>Kode COA</th>
                  <th>Nama Akun</th>
                  <th>Kategori</th>
                  <th>Kelompok Akun</th>
                  <th>Status</th>
                  {isAkuntansi && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCoas.length === 0 ? (
                  <tr>
                    <td colSpan={isAkuntansi ? 7 : 6} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                      Tidak ada akun COA yang terdaftar sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredCoas.map((coa, idx) => (
                    <tr key={coa.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{coa.code}</td>
                      <td>{coa.name}</td>
                      <td>
                        <span className={`chip ${coa.category === 'investasi' ? 'ok' : 'nt'}`}>
                          {coa.category === 'investasi' ? 'Investasi' : 'Biaya'}
                        </span>
                      </td>
                      <td>{coa.group_name ? `${coa.group_code || ''} ${coa.group_name}` : '—'}</td>
                      <td>
                        <span className={`chip ${coa.is_active ? 'ok' : 'bd'}`}>
                          {coa.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAkuntansi && (
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn b2"
                            onClick={() => setCoaModal({ open: true, coa })}
                            style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px', marginRight: '6px' }}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="btn b3"
                            onClick={() => handleOpenDelete('coa', coa)}
                            style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                            title="Hapus COA"
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: KATEGORI BIAYA (KELOMPOK BIAYA / JENIS COA)
          ======================================================== */}
      {activeTab === 'kategori_biaya' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card sc" style={{ padding: 0 }}>
            <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ margin: 0 }}>Kelompok biaya (Jenis COA)</h2>
              <button
                type="button"
                className="btn b2"
                onClick={() => handleDownloadTemplate('coas')}
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? 'Mengunduh...' : '📥 Unduh template COA & Kategori (.xlsx)'}
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No.</th>
                  <th>Kode</th>
                  <th>Kelompok</th>
                  <th className="r">Jumlah COA</th>
                </tr>
              </thead>
              <tbody>
                {coaGroups.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                      Belum ada kelompok biaya yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  coaGroups.map((grp, idx) => (
                    <tr key={grp.id || idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{grp.code}</td>
                      <td>{grp.name}</td>
                      <td className="r" style={{ fontWeight: 600 }}>{grp.coa_count ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E6E0D6', fontSize: '13px', color: '#5E6070' }}>
              Kelompok 5.x berasal dari sheet Kategori Biaya. Kelompok 4.1 dan 4.2 ada di template ERP (sheet BIAYA CN) tetapi belum ada di sheet Kategori Biaya; jumlah COA-nya dihitung dari Master COA.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: KATEGORI INVESTASI
          ======================================================== */}
      {activeTab === 'kategori_investasi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card sc" style={{ padding: 0 }}>
            <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ margin: 0 }}>Kategori investasi, masa manfaat, dan COA penyusutan</h2>
              <button
                type="button"
                className="btn b2"
                onClick={() => handleDownloadTemplate('coas')}
                disabled={downloadingTemplate}
              >
                {downloadingTemplate ? 'Mengunduh...' : '📥 Unduh template COA & Kategori (.xlsx)'}
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No.</th>
                  <th>Kategori investasi</th>
                  <th className="r">Masa manfaat (bulan)</th>
                  <th>Kode COA</th>
                  <th>Nama COA</th>
                  {isAkuntansi && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {investmentCategories.length === 0 ? (
                  <tr>
                    <td colSpan={isAkuntansi ? 6 : 5} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                      Belum ada kategori investasi yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  investmentCategories.map((cat, idx) => (
                    <tr key={cat.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{cat.name}</td>
                      <td className="r" style={{ fontWeight: 600 }}>{cat.useful_life_months}</td>
                      <td>{cat.coa_code || '—'}</td>
                      <td>{cat.coa_name || <span style={{ color: '#8A1F1B' }}>Belum Ditentukan</span>}</td>
                      {isAkuntansi && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn b2"
                            onClick={() => setInvModal({ open: true, category: cat })}
                            style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                          >
                            Ubah
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #E6E0D6', fontSize: '13px', color: '#5E6070' }}>
              Dipakai di Entry Anggaran Investasi: kategori yang dipilih menentukan COA dan susut otomatis. Penyusutan = Jumlah ÷ Masa manfaat × (12 − bulan rencana, Januari = 1).
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: UNIT (MASTER UNIT KERJA)
          ======================================================== */}
      {activeTab === 'unit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label style={{ flex: 1, minWidth: '180px' }}>
              Cari unit kerja
              <input
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Nama unit, kode, atau ID Draf"
              />
            </label>

            <label style={{ minWidth: '160px' }}>
              Perusahaan
              <select
                value={unitCompanyFilter}
                onChange={(e) => setUnitCompanyFilter(e.target.value)}
              >
                <option value="">Semua Perusahaan</option>
                {(references?.companies || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ minWidth: '160px' }}>
              Status Review
              <select
                value={unitReviewFilter}
                onChange={(e) => setUnitReviewFilter(e.target.value)}
              >
                <option value="">Semua Unit</option>
                <option value="needs_review">Perlu Dicek Saja</option>
                <option value="clean">Sudah Terverifikasi</option>
              </select>
            </label>

            <button
              type="button"
              className="btn b2"
              onClick={() => handleDownloadTemplate('units')}
              disabled={downloadingTemplate}
            >
              {downloadingTemplate ? 'Mengunduh...' : 'Unduh template (xlsx)'}
            </button>

            {isAkuntansi && (
              <>
                <button
                  type="button"
                  className="btn b2"
                  onClick={() => setImportDialog({ open: true, type: 'units' })}
                >
                  Import draf unit (xlsx)
                </button>

                <button
                  type="button"
                  className="btn"
                  onClick={() => setUnitModal({ open: true, unit: null })}
                >
                  Tambah unit
                </button>
              </>
            )}
          </div>

          <div className="card sc" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>No.</th>
                  <th>Perusahaan</th>
                  <th>ID Draf</th>
                  <th>Kode unit</th>
                  <th>Nama unit</th>
                  <th>Kelompok unit</th>
                  <th>Klasifikasi</th>
                  <th>COA Pendapatan</th>
                  <th>Isu / Review</th>
                  <th>Status</th>
                  {isAkuntansi && <th style={{ textAlign: 'center' }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={isAkuntansi ? 11 : 10} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                      Tidak ada unit kerja yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((u, idx) => (
                    <tr key={u.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className={`chip ${u.company_code === 'CN' ? 'nt' : 'ok'}`}>
                          {u.company_code || 'CN'}
                        </span>
                      </td>
                      <td>{u.source_key || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{u.code || <span style={{ color: '#8A1F1B' }}>Belum ada</span>}</td>
                      <td>{u.name}</td>
                      <td>{u.group_name || '—'}</td>
                      <td>{u.classification || '—'}</td>
                      <td>
                        {u.revenue_coa_code
                          ? `${u.revenue_coa_code} ${u.revenue_coa_name || ''}`
                          : '—'}
                      </td>
                      <td>
                        {u.needs_review ? (
                          <div>
                            <span className="chip wn" style={{ fontWeight: 600 }}>perlu dicek</span>
                            {u.review_notes && (
                              <div style={{ fontSize: '11px', color: '#7A3E00', marginTop: '2px' }}>
                                {u.review_notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#5E6070', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`chip ${u.is_active ? 'ok' : 'bd'}`}>
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAkuntansi && (
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn b2"
                            onClick={() => setUnitModal({ open: true, unit: u })}
                            style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px', marginRight: '6px' }}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="btn b3"
                            onClick={() => handleOpenDelete('unit', u)}
                            style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                            title="Hapus Unit"
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: REFERENSI SISTEM
          ======================================================== */}
      {activeTab === 'referensi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h2>Data Referensi Sistem Terdaftar</h2>
            <p style={{ color: '#5E6070', fontSize: '13px', margin: '4px 0 16px' }}>
              Struktur master entitas perusahaan, kelompok organisasi, tingkatan prioritas, golongan barang, dan klasifikasi unit.
            </p>

            <div className="g4">
              <div className="card" style={{ background: '#FAF7F2' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>Perusahaan (Companies)</h3>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                  {(references?.companies || []).map((c) => (
                    <li key={c.id}>
                      <b>{c.code}</b> — {c.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ background: '#FAF7F2' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>Kelompok Organisasi</h3>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                  {(references?.org_groups || []).map((og) => (
                    <li key={og.id}>
                      {og.name} <span style={{ color: '#5E6070' }}>({og.type})</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ background: '#FAF7F2' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>Prioritas Anggaran</h3>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                  {(references?.priorities || []).map((p) => (
                    <li key={p.id}>
                      <b>{p.name}</b>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ background: '#FAF7F2' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>Klasifikasi Unit</h3>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                  {(references?.classifications || []).map((cls, idx) => (
                    <li key={idx}>{cls}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL & DIALOG DIALOG
          ======================================================== */}
      {/* Dialog Import Multi-Tipe */}
      <MasterImportDialog
        isOpen={importDialog.open}
        type={importDialog.type}
        onClose={() => setImportDialog({ open: false, type: 'items' })}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          queryClient.invalidateQueries({ queryKey: ['coas'] });
          queryClient.invalidateQueries({ queryKey: ['units'] });
          queryClient.invalidateQueries({ queryKey: ['qualityReport'] });
          queryClient.invalidateQueries({ queryKey: ['references'] });
        }}
      />

      {/* Dialog Ubah Harga Barang per Perusahaan dengan Riwayat */}
      <ItemPriceHistoryModal
        isOpen={priceModal.open}
        item={priceModal.item}
        onClose={() => setPriceModal({ open: false, item: null })}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          queryClient.invalidateQueries({ queryKey: ['qualityReport'] });
        }}
      />

      {/* Modal Tambah / Ubah Barang */}
      <ItemFormModal
        isOpen={itemModal.open}
        item={itemModal.item}
        coaList={coaList}
        groupList={references?.item_groups || []}
        onClose={() => setItemModal({ open: false, item: null })}
        onDelete={(item) => handleOpenDelete('item', item)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          queryClient.invalidateQueries({ queryKey: ['qualityReport'] });
        }}
      />

      {/* Modal Ubah Kategori Investasi */}
      <InvestmentCategoryModal
        isOpen={invModal.open}
        category={invModal.category}
        coaList={coaList.filter((c) => c.category === 'biaya' || c.code.startsWith('5.4'))}
        onClose={() => setInvModal({ open: false, category: null })}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['investmentCategories'] });
        }}
      />

      {/* Modal Tambah / Ubah COA */}
      <CoaFormModal
        isOpen={coaModal.open}
        coa={coaModal.coa}
        groupList={coaGroups}
        onClose={() => setCoaModal({ open: false, coa: null })}
        onDelete={(coa) => handleOpenDelete('coa', coa)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['coas'] });
          queryClient.invalidateQueries({ queryKey: ['qualityReport'] });
        }}
      />

      {/* Modal Tambah / Ubah Unit Kerja */}
      <UnitFormModal
        isOpen={unitModal.open}
        unit={unitModal.unit}
        coaList={coaList}
        companies={references?.companies || []}
        onClose={() => setUnitModal({ open: false, unit: null })}
        onDelete={(unit) => handleOpenDelete('unit', unit)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['units'] });
        }}
      />

      {/* Modal Konfirmasi Hapus Master Data */}
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
        title={`Konfirmasi Hapus ${
          deleteModal.type === 'item' ? 'Barang' : deleteModal.type === 'coa' ? 'COA' : 'Unit'
        }`}
        entityType={
          deleteModal.type === 'item' ? 'Barang' : deleteModal.type === 'coa' ? 'COA' : 'Unit'
        }
        entityName={deleteModal.entity?.name || ''}
        entityCode={deleteModal.entity?.code || ''}
        loading={deleteModal.loading}
        error={deleteModal.error}
        onDeactivate={deleteModal.canDeactivate ? handleDeactivateInstead : null}
        deactivateLoading={deleteModal.deactivateLoading}
      />
    </>
  );
}
