import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import budgetApi from '../../api/budget.api';
import { masterApi } from '../../api/master.api';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

export default function AddMasterItemDialog({ isOpen, onClose, docId, onItemAdded }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [qty, setQty] = useState('1');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Ambil Kelompok COA untuk filter
  const { data: coaGroups = [] } = useQuery({
    queryKey: ['coaGroups'],
    queryFn: async () => {
      const res = await masterApi.getCoaGroups();
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: isOpen,
  });

  // 2. Ambil Barang Master yang tersedia untuk dokumen ini
  const {
    data: availableData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['availableItems', docId, search, selectedGroupId],
    queryFn: async () => {
      if (!docId) return { data: [], meta: {} };
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (selectedGroupId) params.group_id = selectedGroupId;
      return await budgetApi.getAvailableItems(docId, params);
    },
    enabled: isOpen && !!docId,
  });

  const items = useMemo(() => {
    return availableData?.data || [];
  }, [availableData]);

  // 3. Mutasi untuk menambah baris anggaran biaya
  const addLineMutation = useMutation({
    mutationFn: async ({ itemId, quantity }) => {
      return await budgetApi.saveExpenseLines(docId, [
        {
          item_id: itemId,
          qty: quantity,
        },
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseLines', docId] });
      queryClient.invalidateQueries({ queryKey: ['budgetDoc', docId] });
      queryClient.invalidateQueries({ queryKey: ['availableItems', docId] });
      if (onItemAdded) onItemAdded();
      handleClose();
    },
    onError: (err) => {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Gagal menambahkan barang ke anggaran.'
      );
    },
  });

  const handleClose = () => {
    setSearch('');
    setSelectedGroupId('');
    setSelectedItem(null);
    setQty('1');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem) {
      setErrorMsg('Pilih salah satu barang terlebih dahulu.');
      return;
    }
    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMsg('Kuantitas (Qty) harus berupa bilangan bulat positif.');
      return;
    }

    setErrorMsg('');
    addLineMutation.mutate({
      itemId: selectedItem.item_id || selectedItem.id,
      quantity: parsedQty,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(35, 43, 74, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '8px',
          backgroundColor: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E6E0D6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAF7F2',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#1F2233' }}>
              Tambah Barang dari Master
            </h2>
            <div style={{ fontSize: '12px', color: '#5E6070', marginTop: '2px' }}>
              Pilih barang logistik yang sudah terdaftar di master untuk dimasukkan ke anggaran biaya.
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn b2"
            style={{ minHeight: '32px', height: '32px', padding: '0 10px', fontSize: '13px' }}
          >
            ✕
          </button>
        </div>

        {/* Filter & Pencarian */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F0EBE2',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ flex: '2', minWidth: '200px' }}>
            Cari barang
            <input
              type="text"
              placeholder="Ketik nama atau kode barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label style={{ flex: '1', minWidth: '160px' }}>
            Jenis COA
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">Semua jenis</option>
              {coaGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Notifikasi Galat */}
        {errorMsg && (
          <div
            className="chip bd"
            style={{
              margin: '12px 20px 0',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'block',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Daftar Barang */}
        <div
          className="sc"
          style={{
            flex: 1,
            minHeight: '220px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '0 20px',
          }}
        >
          <table style={{ width: '100%', marginTop: '8px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Pilih</th>
                <th>Kode & Barang</th>
                <th>Satuan</th>
                <th className="r">Harga Master</th>
                <th>COA</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                    Memuat katalog barang master...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#8A1F1B' }}>
                    Gagal memuat katalog barang: {error?.message || 'Galat tidak diketahui'}
                    <div style={{ marginTop: '8px' }}>
                      <button type="button" className="btn b2" onClick={() => refetch()}>
                        Coba Lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                    Tidak ada barang master yang cocok atau semua barang sudah ada di dokumen ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isChecked = selectedItem?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isChecked ? '#FAF7F2' : 'transparent',
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="radio"
                          name="selectedMasterItem"
                          checked={isChecked}
                          onChange={() => setSelectedItem(item)}
                        />
                      </td>
                      <td>
                        <b>{item.item_name}</b>
                        <div className="lb">{item.item_code}</div>
                      </td>
                      <td>{item.uom}</td>
                      <td className="r">Rp {formatRupiah(item.price)}</td>
                      <td>
                        <b>{item.coa_code}</b> {item.coa_name}
                        <div className="lb">Jenis: {item.group_name}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Form Input Qty & Aksi Submisi */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #E6E0D6',
            backgroundColor: '#FAF7F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="qtyInput" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: '#1F2233' }}>Qty RKAP:</span>
              <input
                id="qtyInput"
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                style={{ width: '80px', minHeight: '38px', height: '38px' }}
                disabled={!selectedItem || addLineMutation.isPending}
                required
              />
            </label>
            {selectedItem && (
              <span className="lb">
                Subtotal: <b>Rp {formatRupiah((parseInt(qty, 10) || 0) * (selectedItem.price || 0))}</b>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClose}
              className="btn b2"
              disabled={addLineMutation.isPending}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn"
              disabled={!selectedItem || addLineMutation.isPending}
            >
              {addLineMutation.isPending ? 'Menambahkan...' : '+ Masukkan ke Dokumen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AddMasterItemDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  docId: PropTypes.number,
  onItemAdded: PropTypes.func,
};
