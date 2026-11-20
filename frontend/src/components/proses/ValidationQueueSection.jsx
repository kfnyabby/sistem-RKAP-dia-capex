import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Lock,
} from 'lucide-react';
import { workflowApi } from '../../api/workflow.api';
import { budgetApi } from '../../api/budget.api';
import { useAuth } from '../../auth/AuthContext';
import DocReviewModal from './DocReviewModal';

function formatRupiah(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ValidationQueueSection() {
  const { user } = useAuth();

  const [queueDocs, setQueueDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState([]);

  // Filter state
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [statusFilter, setStatusFilter] = useState('DIAJUKAN');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dokumen terpilih untuk Review Modal
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Bulk Selection (Khusus Akuntansi)
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // 1. Load referensi periode
  useEffect(() => {
    budgetApi
      .getPeriods()
      .then((data) => {
        setPeriods(data || []);
        if (data && data.length > 0) {
          setSelectedPeriodId(String(data[0].id || data[0].period_id));
        }
      })
      .catch((err) => console.error('Gagal memuat periode:', err.message));
  }, []);

  // 2. Load daftar dokumen review queue
  const fetchQueue = useCallback(async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    try {
      const res = await workflowApi.getReviewQueue({
        period_id: selectedPeriodId,
        status: statusFilter,
        type: typeFilter || undefined,
        per_page: 100,
      });
      setQueueDocs(res.data || []);
      setSelectedDocIds([]);
    } catch (err) {
      console.error('Gagal memuat antrean validasi:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, statusFilter, typeFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle finalisasi massal
  const handleBulkFinalize = async () => {
    if (selectedDocIds.length === 0) return;
    if (
      !window.confirm(
        `Finalisasi ${selectedDocIds.length} dokumen yang dipilih? Seluruh dokumen akan berstatus FINAL dan terkunci.`
      )
    ) {
      return;
    }

    setBulkLoading(true);
    try {
      const res = await workflowApi.finalizeBulk(selectedDocIds);
      alert(`Berhasil memfinalisasi ${res.finalized_count} dokumen`);
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal melakukan finalisasi massal');
    } finally {
      setBulkLoading(false);
    }
  };

  // Toggle selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const selectable = queueDocs.filter((d) => d.status === 'DISETUJUI').map((d) => d.id);
      setSelectedDocIds(selectable);
    } else {
      setSelectedDocIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter teks pencarian lokal
  const filteredDocs = queueDocs.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.unit_name && d.unit_name.toLowerCase().includes(q)) ||
      (d.unit_code && d.unit_code.toLowerCase().includes(q)) ||
      (d.submitted_by_name && d.submitted_by_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* 1. Filter & Aksi Bar */}
      <div className="bg-white rounded-lg border border-[#E6E0D6] p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Filter Periode */}
          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">Periode RKAP</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
            >
              {periods.map((p) => (
                <option key={p.id || p.period_id} value={p.id || p.period_id}>
                  RKAP {p.year} ({p.company_code || 'CN'})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Dokumen */}
          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">Status Dokumen</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
            >
              <option value="DIAJUKAN">Menunggu Validasi (DIAJUKAN)</option>
              <option value="DISETUJUI">Telah Disetujui (DISETUJUI)</option>
              <option value="DIKEMBALIKAN">Dikembalikan (DIKEMBALIKAN)</option>
              <option value="FINAL">Final (FINAL)</option>
              <option value="ALL">Semua Status</option>
            </select>
          </div>

          {/* Filter Jenis Anggaran */}
          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">Jenis Anggaran</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md px-3 py-2 outline-none focus:border-[#3D4E9C]"
            >
              <option value="">Semua Jenis (Biaya & Investasi)</option>
              <option value="BIAYA">Anggaran Biaya (Opex)</option>
              <option value="INVESTASI">Anggaran Investasi (Capex)</option>
            </select>
          </div>

          {/* Pencarian Unit / PIC */}
          <div>
            <label className="block text-xs font-medium text-[#5E6070] mb-1">Cari Unit / Pengaju</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5E6070] absolute left-2.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode unit, nama, atau PIC..."
                className="w-full text-xs text-[#1F2233] bg-white border border-[#B9B4C9] rounded-md pl-8 pr-3 py-2 outline-none focus:border-[#3D4E9C]"
              />
            </div>
          </div>
        </div>

        {/* Bulk Action Bar khusus Akuntansi saat status DISETUJUI */}
        {user?.role === 'akuntansi' && statusFilter === 'DISETUJUI' && selectedDocIds.length > 0 && (
          <div className="p-2.5 bg-[#FAF7F2] rounded-md border border-[#E6E0D6] flex items-center justify-between">
            <span className="text-xs text-[#1F2233]">
              Terpilih <b>{selectedDocIds.length}</b> dokumen berstatus DISETUJUI
            </span>
            <button
              type="button"
              onClick={handleBulkFinalize}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#232B4A] text-white rounded text-xs font-semibold hover:bg-[#3A4577] transition cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalisasi Dokumen Terpilih
            </button>
          </div>
        )}
      </div>

      {/* 2. Tabel Antrean Dokumen */}
      <div className="bg-white rounded-lg border border-[#E6E0D6] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] text-[#1F2233] font-bold border-b border-[#E6E0D6]">
              <tr>
                {user?.role === 'akuntansi' && statusFilter === 'DISETUJUI' && (
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        selectedDocIds.length > 0 &&
                        selectedDocIds.length ===
                          queueDocs.filter((d) => d.status === 'DISETUJUI').length
                      }
                      className="rounded text-[#3D4E9C]"
                    />
                  </th>
                )}
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3">Unit Kerja</th>
                <th className="py-2.5 px-3">Entitas</th>
                <th className="py-2.5 px-3">Jenis Anggaran</th>
                <th className="py-2.5 px-3 text-right">Total Anggaran (Rp)</th>
                <th className="py-2.5 px-3">Diajukan Oleh</th>
                <th className="py-2.5 px-3">Tanggal Pengajuan</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Komentar</th>
                <th className="py-2.5 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE2]">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#5E6070]">
                    Memuat antrean validasi dokumen...
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#5E6070]">
                    Tidak ada dokumen anggaran yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((d, idx) => (
                  <tr key={d.id} className="hover:bg-[#FAF7F2]/60">
                    {user?.role === 'akuntansi' && statusFilter === 'DISETUJUI' && (
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(d.id)}
                          onChange={() => handleSelectOne(d.id)}
                          className="rounded text-[#3D4E9C]"
                        />
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-center text-[#5E6070]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#1F2233]">
                      [{d.unit_code}] {d.unit_name}
                    </td>
                    <td className="py-2.5 px-3 text-[#5E6070]">{d.company_code}</td>
                    <td className="py-2.5 px-3 font-medium">
                      <span
                        className={`chip ${
                          d.type === 'INVESTASI' ? 'bg-amber-100 text-amber-800' : 'nt'
                        }`}
                      >
                        {d.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1F2233]">
                      Rp {formatRupiah(d.total_amount)}
                    </td>
                    <td className="py-2.5 px-3 text-[#5E6070]">
                      {d.submitted_by_name || 'PIC Unit'}
                    </td>
                    <td className="py-2.5 px-3 text-[#5E6070]">{formatDate(d.submitted_at)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`chip ${
                          d.status === 'FINAL'
                            ? 'ok'
                            : d.status === 'DISETUJUI'
                              ? 'ok'
                              : d.status === 'DIKEMBALIKAN'
                                ? 'bd'
                                : 'wn'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#3D4E9C]">
                      {d.comment_count > 0 ? `${d.comment_count}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(d)}
                        className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#B9B4C9] hover:bg-[#F0EBE2] text-[#1F2233] rounded text-xs font-semibold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#3D4E9C]" />
                        Telaah
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Modal Telaah Dokumen */}
      {selectedDoc && (
        <DocReviewModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onSuccess={() => {
            setSelectedDoc(null);
            fetchQueue();
          }}
        />
      )}
    </div>
  );
}
