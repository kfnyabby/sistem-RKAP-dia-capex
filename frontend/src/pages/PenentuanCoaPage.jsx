import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import Banner from '../components/common/Banner';
import { newItemRequestApi } from '../api/newItemRequest.api';
import masterApi from '../api/master.api';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Number(value).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    return `${day} ${month}`;
  } catch {
    return '—';
  }
}

export default function PenentuanCoaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = (user?.role || 'akuntansi').toLowerCase();

  // Konteks Perusahaan Aktif
  const [companyCode, setCompanyCode] = useState(() => {
    return localStorage.getItem('rkap_selected_company') || 'CN';
  });

  // Filter State Sesuai Mockup
  const [statusFilter, setStatusFilter] = useState('MENUNGGU_COA'); // 'MENUNGGU_COA' | 'COA_DITENTUKAN' | 'ALL'
  const [unitFilter, setUnitFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Notifikasi & Pesan Galat
  const [feedback, setFeedback] = useState(null); // { type: 'ok' | 'bd', message: string }

  // Item Terpilih untuk Form Panel Kanan
  const [selectedReq, setSelectedReq] = useState(null);

  // Form State Panel Kanan
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [coaId, setCoaId] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [price, setPrice] = useState('');
  const [manualNote, setManualNote] = useState('');

  // 1. Ambil Master Unit untuk Filter
  const unitsQuery = useQuery({
    queryKey: ['units', companyCode],
    queryFn: async () => {
      const res = await masterApi.getUnits({ is_active: true, company_code: companyCode });
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });
  const units = useMemo(() => {
    const raw = unitsQuery.data;
    return Array.isArray(raw) ? raw : (raw?.data || []);
  }, [unitsQuery.data]);

  // 2. Ambil Master Kelompok COA & Daftar COA Biaya
  const coaGroupsQuery = useQuery({
    queryKey: ['coa-groups'],
    queryFn: async () => {
      const res = await masterApi.getCoaGroups();
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });
  const coaGroups = useMemo(() => {
    const raw = coaGroupsQuery.data;
    return Array.isArray(raw) ? raw : (raw?.data || []);
  }, [coaGroupsQuery.data]);

  const coasQuery = useQuery({
    queryKey: ['coas-expense'],
    queryFn: async () => {
      const res = await masterApi.getCoas({ category: 'biaya', is_active: true, per_page: 500 });
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });
  const coasList = useMemo(() => {
    const raw = coasQuery.data;
    return Array.isArray(raw) ? raw : (raw?.data || []);
  }, [coasQuery.data]);

  // Filter COA berdasarkan Jenis COA terpilih
  const filteredCoasList = useMemo(() => {
    if (!selectedGroupId) return coasList;
    return coasList.filter((c) => String(c.group_id) === String(selectedGroupId));
  }, [coasList, selectedGroupId]);

  // 3. Query Antrean Penentuan COA (Backend Queue API)
  const queueQuery = useQuery({
    queryKey: ['coa-queue', statusFilter, unitFilter, searchTerm, companyCode],
    queryFn: async () => {
      const params = {
        per_page: 100,
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (unitFilter) params.unit_id = unitFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (companyCode) params.company_code = companyCode;

      const res = await newItemRequestApi.getAccountingQueue(params);
      return res?.data || [];
    },
  });

  const queue = useMemo(() => {
    const raw = queueQuery.data;
    return Array.isArray(raw) ? raw : [];
  }, [queueQuery.data]);

  const handleSelectReq = (req) => {
    setSelectedReq(req);
    setFeedback(null);
    if (!req) return;

    // Isi otomatis kode barang default (BRG-XXXXX) dan estimasi harga
    setItemCode(req.item_code || `BRG-${req.id.toString().padStart(5, '0')}`);
    setPrice(req.price !== null && req.price !== undefined ? String(req.price) : String(req.est_price || '0'));
    setManualNote(req.manual_handling_note || '');

    if (req.assigned_coa_id) {
      setCoaId(String(req.assigned_coa_id));
      const foundCoa = coasList.find((c) => c.id === req.assigned_coa_id);
      if (foundCoa?.group_id) {
        setSelectedGroupId(String(foundCoa.group_id));
      }
    } else {
      setCoaId('');
      setSelectedGroupId('');
    }
  };

  // Sinkronisasi item terpilih otomatis ke item pertama jika belum ada yang dipilih
  useEffect(() => {
    if (queue.length > 0) {
      if (!selectedReq || !queue.find((q) => q.id === selectedReq.id)) {
        handleSelectReq(queue[0]);
      }
    } else {
      setSelectedReq(null);
    }
  }, [queue, selectedReq]);

  // 4. Mutasi Penentuan COA (Assign COA)
  const assignMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return await newItemRequestApi.assignCoa(id, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['coa-queue'] });
      setFeedback({
        type: 'ok',
        message: data.message || 'COA berhasil ditentukan dan barang baru ditambahkan ke katalog master.',
      });
    },
    onError: (err) => {
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message;

      let msg = apiMsg || 'Gagal menentukan COA barang baru.';
      if (status === 409) {
        msg = `Bentrok data (409): ${apiMsg || 'Kode barang sudah digunakan oleh master barang lain. Silakan ubah kode barang.'}`;
      } else if (status === 422) {
        msg = `Data tidak valid (422): ${apiMsg || 'Pastikan akun COA dan harga satuan terisi dengan benar.'}`;
      } else if (status === 403) {
        msg = 'Akses ditolak (403): Hanya Akuntansi yang berwenang menentukan COA.';
      }
      setFeedback({ type: 'bd', message: msg });
    },
  });

  const handleSubmitAssign = (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    if (!coaId) {
      setFeedback({ type: 'bd', message: 'Silakan pilih Akun COA yang sesuai untuk barang baru ini.' });
      return;
    }
    const numPrice = parseInt(price, 10);
    if (isNaN(numPrice) || numPrice < 0) {
      setFeedback({ type: 'bd', message: 'Harga satuan harus berupa angka nominal yang valid.' });
      return;
    }

    const payload = {
      coa_id: parseInt(coaId, 10),
      item_code: itemCode.trim() || undefined,
      price: numPrice,
      manual_handling_note: manualNote.trim() || undefined,
    };

    assignMutation.mutate({ id: selectedReq.id, payload });
  };

  // Pengecekan Hak Akses
  if (role !== 'akuntansi') {
    return (
      <>
        <PageHeader title="Proses · Penentuan COA" />
        <Banner variant="bd">
          Akses ditolak: Layar Penentuan COA khusus diperuntukkan bagi Bagian Akuntansi (BR-18).
        </Banner>
      </>
    );
  }

  const isAssigned = selectedReq?.status === 'COA_DITENTUKAN';
  const docStatus = selectedReq?.doc_status || 'DRAFT';
  const isDocDraft = docStatus === 'DRAFT';

  return (
    <>
      <PageHeader
        title="Proses · Penentuan COA"
        chips={<Chip variant="nt">Akuntansi · {companyCode}</Chip>}
        onCompanyChange={(c) => {
          setCompanyCode(c);
          localStorage.setItem('rkap_selected_company', c);
        }}
      />

      {/* Banner Pesan Sukses / Galat */}
      {feedback && (
        <Banner variant={feedback.type}>
          {feedback.message}
        </Banner>
      )}

      {/* Baris Filter Mockup (.row) */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div className="row">
          <label htmlFor="fs" style={{ minWidth: 160 }}>
            Status
            <select
              id="fs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="MENUNGGU_COA">Menunggu COA</option>
              <option value="COA_DITENTUKAN">COA ditentukan</option>
              <option value="ALL">Semua</option>
            </select>
          </label>

          <label htmlFor="fu" style={{ minWidth: 200 }}>
            Unit
            <select
              id="fu"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="">Semua unit</option>
              {units.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  [{u.code}] {u.name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="fc" style={{ flex: 1, minWidth: 200 }}>
            Cari barang
            <input
              id="fc"
              placeholder="Nama barang atau spesifikasi"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Layout 2 Kolom Berdampingan Sesuai Mockup 18-penentuan-coa.html */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Kolom Kiri: Tabel Antrean (.card .sc flex:2 min-width:560px) */}
        <div className="card sc" style={{ flex: 2, minWidth: 560, padding: 0 }}>
          {queueQuery.isLoading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
              Memuat antrean permintaan barang baru...
            </div>
          ) : queueQuery.isError ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#8A1F1B', fontSize: 13 }}>
              Gagal memuat antrean: {queueQuery.error?.response?.data?.message || queueQuery.error?.message}
            </div>
          ) : queue.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
              Tidak ada permintaan barang baru dalam antrean ini.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>No.</th>
                  <th style={{ width: 140 }}>Unit</th>
                  <th>Nama barang</th>
                  <th style={{ width: 80 }}>Satuan</th>
                  <th className="r" style={{ width: 60 }}>Qty</th>
                  <th className="r" style={{ width: 110 }}>Estimasi harga</th>
                  <th className="r" style={{ width: 110 }}>Jumlah</th>
                  <th style={{ width: 90 }}>Dikirim</th>
                  <th style={{ width: 140 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((req, idx) => {
                  const isSelected = selectedReq?.id === req.id;
                  const reqStatus = req.status;
                  const reqCoaDisplay = req.coa_code ? `${req.coa_code} ditentukan` : 'COA ditentukan';

                  return (
                    <tr
                      key={req.id}
                      onClick={() => handleSelectReq(req)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#ECE8F5' : undefined,
                        transition: 'background-color 0.1s ease',
                      }}
                      title="Klik untuk memilih dan memproses penetapan COA"
                    >
                      <td style={{ textAlign: 'center', color: '#5E6070' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          [{req.unit_code || '—'}] {req.unit_name}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{req.name}</td>
                      <td>{req.uom || '—'}</td>
                      <td className="r" style={{ fontWeight: 600 }}>{req.qty}</td>
                      <td className="r">{formatRupiah(req.est_price)}</td>
                      <td className="r" style={{ fontWeight: 600, color: '#1F2233' }}>
                        {formatRupiah(req.amount ?? (Number(req.qty) * Number(req.est_price)))}
                      </td>
                      <td style={{ color: '#5E6070', fontSize: 13 }}>{formatDate(req.created_at)}</td>
                      <td>
                        {reqStatus === 'MENUNGGU_COA' ? (
                          <Chip variant="wn">Menunggu COA</Chip>
                        ) : reqStatus === 'COA_DITENTUKAN' ? (
                          <Chip variant="ok">{reqCoaDisplay}</Chip>
                        ) : (
                          <Chip variant="nt">{reqStatus}</Chip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Kolom Kanan: Panel Form Penetapan COA (.card flex:1 min-width:320px) */}
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          {!selectedReq ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#5E6070', fontSize: 13 }}>
              Pilih salah satu baris permintaan di sebelah kiri untuk melihat rincian dan menentukan akun COA.
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: 16 }}>{selectedReq.name}</h2>
              <p style={{ margin: '0 0 4px', color: '#5E6070', fontSize: 13 }}>
                [{selectedReq.unit_code}] {selectedReq.unit_name} · Anggaran Biaya RKAP {selectedReq.period_year || '2027'} · status dokumen{' '}
                <b style={{ color: isDocDraft ? '#14532D' : '#7A3E00' }}>{docStatus}</b>
              </p>
              <p style={{ margin: '0 0 4px', fontSize: 13 }}>
                <b>Spesifikasi:</b> {selectedReq.spec || '—'}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 13 }}>
                <b>Alasan:</b> {selectedReq.reason || '—'}
              </p>

              {isAssigned ? (
                <div style={{ background: '#F3F1EA', padding: '14px', borderRadius: '8px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, color: '#14532D', marginBottom: 6 }}>
                    ✓ COA Telah Ditetapkan
                  </div>
                  <div style={{ fontSize: 13, color: '#1F2233', lineHeight: 1.6 }}>
                    <div><b>Akun COA:</b> {selectedReq.coa_code} - {selectedReq.coa_name}</div>
                    <div><b>Kode Barang:</b> {selectedReq.item_code || '—'}</div>
                    <div><b>Harga Satuan:</b> Rp {formatRupiah(selectedReq.price || selectedReq.est_price)}</div>
                    {selectedReq.manual_handling_note && (
                      <div style={{ marginTop: 8, padding: 8, background: '#FBE8C8', borderRadius: 6, color: '#7A3E00', fontSize: 12 }}>
                        <b>Catatan:</b> {selectedReq.manual_handling_note}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitAssign} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label htmlFor="jc">
                    Jenis COA
                    <select
                      id="jc"
                      value={selectedGroupId}
                      onChange={(e) => {
                        setSelectedGroupId(e.target.value);
                        setCoaId(''); // Reset COA saat grup berubah
                      }}
                    >
                      <option value="">Semua jenis COA biaya</option>
                      {coaGroups.map((g) => (
                        <option key={g.id} value={String(g.id)}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="cx">
                    COA <span style={{ color: '#8A1F1B' }}>*</span>
                    <select
                      id="cx"
                      value={coaId}
                      onChange={(e) => setCoaId(e.target.value)}
                      required
                    >
                      <option value="">Pilih nomor akun COA biaya</option>
                      {filteredCoasList.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.code} {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label htmlFor="kb">
                    Kode barang
                    <input
                      id="kb"
                      value={itemCode}
                      onChange={(e) => setItemCode(e.target.value)}
                      placeholder="Contoh: BRG-00001"
                      required
                    />
                  </label>

                  <label htmlFor="sb">
                    Satuan
                    <input
                      id="sb"
                      value={selectedReq.uom || 'Pcs'}
                      readOnly
                      style={{ background: '#FAF7F2', color: '#5E6070' }}
                    />
                  </label>

                  <label htmlFor="hs">
                    Harga satuan {selectedReq.company_code || companyCode} (Rp) <span style={{ color: '#8A1F1B' }}>*</span>
                    <input
                      id="hs"
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </label>

                  <label htmlFor="cn">
                    Catatan penanganan (opsional)
                    <textarea
                      id="cn"
                      rows={2}
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      placeholder={!isDocDraft ? 'Dokumen sudah bukan DRAFT, berikan catatan revisi' : ''}
                    />
                  </label>

                  <p style={{ margin: '8px 0', fontSize: 13, color: '#5E6070', lineHeight: 1.4 }}>
                    Setelah disimpan, barang masuk master dan baris ditambahkan ke dokumen yang masih DRAFT (BR-17). Bila dokumen sudah diajukan, baris tidak ditambahkan dan dicatat untuk ditangani saat revisi. Harga CNH tidak diisi di sini.
                  </p>

                  <button
                    type="submit"
                    className="btn"
                    disabled={assignMutation.isPending}
                    style={{ width: '100%', minHeight: 44 }}
                  >
                    {assignMutation.isPending ? 'Menyimpan ke Master...' : 'Tentukan COA dan tambahkan ke master'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
