import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import PengaturanSubNav from '../components/pengaturan/PengaturanSubNav';
import auditApi from '../api/audit.api';
import userApi from '../api/user.api';

// Helper format tanggal Indonesia (contoh: 26 Okt 2026 08:20)
function formatAuditTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${mins}`;
}

// Helper pemetaan chip aksi sesuai warna mockup
function renderActionChip(action) {
  const act = String(action || '').toUpperCase();
  switch (act) {
    case 'UPDATE':
      return <Chip variant="nt">Ubah</Chip>;
    case 'SUBMIT':
      return <Chip variant="nt">Ajukan</Chip>;
    case 'RETURN':
      return <Chip variant="wn">Kembalikan</Chip>;
    case 'APPROVE':
      return <Chip variant="ok">Setujui</Chip>;
    case 'FINALIZE':
      return <Chip variant="ok">Finalisasi</Chip>;
    case 'AUTO_REOPEN':
      return <Chip variant="ok">Buka otomatis</Chip>;
    case 'AUTO_CLOSE':
      return <Chip variant="bd">Tutup otomatis</Chip>;
    case 'MANUAL_OPEN':
    case 'REOPEN':
      return <Chip variant="ok">Buka manual</Chip>;
    case 'INSERT':
    case 'CREATE':
      return <Chip variant="ok">Tambah</Chip>;
    case 'DELETE':
      return <Chip variant="bd">Hapus</Chip>;
    case 'IMPORT':
      return <Chip variant="nt">Import</Chip>;
    default:
      return <Chip variant="nt">{action}</Chip>;
  }
}

// Helper perenderan nama entitas yang manusiawi
function formatEntityName(log) {
  const { entity, entity_id, new_value, old_value } = log;
  const val = new_value || old_value || {};

  switch (entity) {
    case 'expense_lines': {
      const item = val.item_name || val.name || '';
      const unit = val.unit_code ? `(${val.unit_code})` : val.unit_name ? `(${val.unit_name})` : '';
      return item ? `Baris biaya ${item} ${unit}`.trim() : `Baris biaya #${entity_id}`;
    }
    case 'investment_lines': {
      const item = val.name || val.item_name || '';
      const unit = val.unit_code ? `(${val.unit_code})` : '';
      return item ? `Baris investasi ${item} ${unit}`.trim() : `Baris investasi #${entity_id}`;
    }
    case 'budget_docs': {
      const docType = val.type || val.doc_type || 'Biaya';
      const unitCode = val.unit_code ? `[${val.unit_code}]` : '';
      const unitName = val.unit_name ? `${val.unit_name}` : '';
      return `Dokumen ${docType} ${unitCode} ${unitName}`.trim() || `Dokumen Anggaran #${entity_id}`;
    }
    case 'periods': {
      const year = val.year || '';
      const company = val.company_code || '';
      return `Periode RKAP ${year} ${company}`.trim() || `Periode #${entity_id}`;
    }
    case 'units': {
      const code = val.code ? `[${val.code}]` : '';
      const name = val.name || '';
      return `Akses unit ${code} ${name}`.trim() || `Unit #${entity_id}`;
    }
    case 'items': {
      const code = val.code ? `[${val.code}]` : '';
      const name = val.name || '';
      return `Master barang ${code} ${name}`.trim() || `Barang #${entity_id}`;
    }
    case 'settings':
      return 'Pengaturan Sistem';
    default:
      return `${entity} #${entity_id}`;
  }
}

// Helper perenderan deskripsi perubahan dari old_value dan new_value
function formatDiff(log) {
  const { old_value, new_value, action } = log;
  const act = String(action || '').toUpperCase();

  // 1. Kasus Catatan Pengembalian
  if (new_value?.return_note) {
    return `Catatan: ${new_value.return_note}`;
  }

  // 2. Kasus Alasan Pembukaan Manual
  if (new_value?.reason) {
    const deadlinePart = new_value.reopen_deadline ? `, deadline ${new_value.reopen_deadline}` : '';
    return `Alasan: ${new_value.reason}${deadlinePart}`;
  }

  // 3. Kasus Perubahan Status Dokumen / Periode
  if (old_value?.status !== undefined && new_value?.status !== undefined) {
    return `${old_value.status} → ${new_value.status}`;
  }

  // 4. Kasus Kunci / Tutup Akses
  if (old_value?.is_closed !== undefined && new_value?.is_closed !== undefined) {
    const from = old_value.is_closed ? 'TUTUP' : 'BUKA';
    const to = new_value.is_closed ? 'TUTUP' : 'BUKA';
    const note = act === 'AUTO_CLOSE' ? ' (deadline lewat)' : '';
    return `${from} → ${to}${note}`;
  }

  // 5. Kasus Perubahan Qty Baris
  if (old_value?.qty !== undefined && new_value?.qty !== undefined) {
    return `Qty ${old_value.qty} → ${new_value.qty}`;
  }

  // 6. Kasus Perubahan Harga
  if (old_value?.price !== undefined && new_value?.price !== undefined) {
    return `Harga Rp ${Number(old_value.price).toLocaleString('id-ID')} → Rp ${Number(new_value.price).toLocaleString('id-ID')}`;
  }

  // 7. Kasus Tambah / Hapus Data Baru
  if (act === 'INSERT' || act === 'CREATE') {
    return 'Data baru ditambahkan';
  }
  if (act === 'DELETE') {
    return 'Data dihapus';
  }

  // 8. General Diff Checker untuk Key yang Berubah
  if (old_value && new_value && typeof old_value === 'object' && typeof new_value === 'object') {
    const diffs = [];
    const keys = Array.from(new Set([...Object.keys(old_value), ...Object.keys(new_value)]));
    for (const k of keys) {
      if (['updated_at', 'created_at', 'id'].includes(k)) continue;
      if (JSON.stringify(old_value[k]) !== JSON.stringify(new_value[k])) {
        diffs.push(`${k}: ${old_value[k] ?? '—'} → ${new_value[k] ?? '—'}`);
      }
    }
    if (diffs.length > 0) {
      return diffs.slice(0, 3).join(', ');
    }
  }

  return 'Perubahan data sistem';
}

export default function PengaturanAuditPage() {
  const { user } = useAuth();
  const role = (user?.role || 'akuntansi').toLowerCase();

  // Filter State
  const [entityFilter, setEntityFilter] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Paginasi State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // 1. Ambil Data Pengguna untuk Datalist Autocomplete
  const usersQuery = useQuery({
    queryKey: ['users-list-for-audit'],
    queryFn: async () => {
      const res = await userApi.getUsers();
      return Array.isArray(res) ? res : (res?.data || []);
    },
  });
  const userList = useMemo(() => usersQuery.data || [], [usersQuery.data]);

  // Sinkronisasi input teks pengguna dengan ID pengguna
  const handleUserInputChange = (e) => {
    const text = e.target.value;
    setUserSearchText(text);
    setPage(1);

    if (!text.trim()) {
      setSelectedUserId('');
      return;
    }

    const matched = userList.find(
      (u) =>
        u.name?.toLowerCase() === text.trim().toLowerCase() ||
        u.email?.toLowerCase() === text.trim().toLowerCase()
    );
    setSelectedUserId(matched ? String(matched.id) : '');
  };

  // 2. Query Data Audit Logs (Server-side Pagination & Filter)
  const auditLogsQuery = useQuery({
    queryKey: ['audit-logs', page, limit, entityFilter, selectedUserId, startDate, endDate],
    queryFn: async () => {
      const params = {
        page,
        limit,
      };
      if (entityFilter) params.entity = entityFilter;
      if (selectedUserId) params.user_id = selectedUserId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await auditApi.getAuditLogs(params);
      return data;
    },
    keepPreviousData: true,
  });

  const logs = useMemo(() => auditLogsQuery.data?.data || [], [auditLogsQuery.data]);
  const pagination = auditLogsQuery.data?.pagination || {
    page: 1,
    limit: 20,
    total_count: 0,
    total_pages: 1,
  };

  // Role Chip Label
  const roleLabel = role === 'akuntansi' ? 'Akuntansi' : role === 'manager' ? 'Manager' : 'User';

  return (
    <>
      <PageHeader
        title="Pengaturan · Audit Log"
        chips={<Chip variant="nt">{roleLabel}</Chip>}
      />

      {/* Sub-navigasi Pengaturan */}
      <PengaturanSubNav />

      {/* Baris Filter Mockup (.row) */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div className="row">
          <label htmlFor="ae" style={{ minWidth: 160 }}>
            Entitas
            <select
              id="ae"
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua entitas</option>
              <option value="budget_docs">Dokumen anggaran</option>
              <option value="expense_lines">Baris biaya</option>
              <option value="investment_lines">Baris investasi</option>
              <option value="periods">Periode</option>
              <option value="units">Unit</option>
              <option value="items">Master barang</option>
              <option value="settings">Pengaturan sistem</option>
            </select>
          </label>

          <label htmlFor="ap" style={{ flex: 1, minWidth: 180 }}>
            Pengguna
            <input
              id="ap"
              list="user-options"
              placeholder="Ketik nama atau pilih pengguna"
              value={userSearchText}
              onChange={handleUserInputChange}
            />
            <datalist id="user-options">
              {userList.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.email} ({u.role})
                </option>
              ))}
            </datalist>
          </label>

          <label htmlFor="a1" style={{ minWidth: 140 }}>
            Dari
            <input
              id="a1"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </label>

          <label htmlFor="a2" style={{ minWidth: 140 }}>
            Sampai
            <input
              id="a2"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </label>

          {(entityFilter || userSearchText || startDate || endDate) && (
            <button
              type="button"
              className="btn b3"
              onClick={() => {
                setEntityFilter('');
                setUserSearchText('');
                setSelectedUserId('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              style={{ minHeight: '44px' }}
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Tabel Bernomor Audit Log (.card .sc) */}
      <div className="card sc" style={{ padding: 0, marginBottom: 12 }}>
        {auditLogsQuery.isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Memuat jejak audit sistem...
          </div>
        ) : auditLogsQuery.isError ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#8A1F1B', fontSize: 13 }}>
            Gagal memuat jejak audit: {auditLogsQuery.error?.response?.data?.message || auditLogsQuery.error?.message}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#5E6070', fontSize: 13 }}>
            Tidak ada catatan log aktivitas yang sesuai dengan filter pencarian.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Waktu</th>
                <th style={{ width: 180 }}>Pengguna</th>
                <th style={{ width: 110 }}>Aksi</th>
                <th style={{ width: 260 }}>Entitas</th>
                <th>Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actorDisplay = log.actor_name || (log.actor_id ? `Pengguna #${log.actor_id}` : 'Sistem');
                return (
                  <tr key={log.id}>
                    <td style={{ color: '#5E6070', whiteSpace: 'nowrap' }}>
                      {formatAuditTime(log.created_at)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{actorDisplay}</div>
                      {log.actor_email && (
                        <div style={{ color: '#5E6070', fontSize: 11 }}>{log.actor_email}</div>
                      )}
                    </td>
                    <td>{renderActionChip(log.action)}</td>
                    <td style={{ fontWeight: 500 }}>{formatEntityName(log)}</td>
                    <td style={{ fontSize: 13 }}>{formatDiff(log)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Kontrol Paginasi Server */}
      {pagination.total_count > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ color: '#5E6070', fontSize: 13 }}>
            Menampilkan baris {(pagination.page - 1) * pagination.limit + 1} s.d.{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total_count)} dari total{' '}
            <b>{pagination.total_count}</b> aktivitas
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label htmlFor="limit-sel" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, margin: 0 }}>
              <span>Baris:</span>
              <select
                id="limit-sel"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{ minHeight: '34px', padding: '4px 8px' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <button
              type="button"
              className="btn b2"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || auditLogsQuery.isLoading}
              style={{ minHeight: '36px', padding: '0 12px', fontSize: 12 }}
            >
              ← Sebelumnya
            </button>
            <span style={{ fontSize: 13, color: '#1F2233', margin: '0 4px' }}>
              Halaman <b>{page}</b> dari {pagination.total_pages || 1}
            </span>
            <button
              type="button"
              className="btn b2"
              onClick={() => setPage((p) => Math.min(pagination.total_pages || 1, p + 1))}
              disabled={page >= pagination.total_pages || auditLogsQuery.isLoading}
              style={{ minHeight: '36px', padding: '0 12px', fontSize: 12 }}
            >
              Berikutnya →
            </button>
          </div>
        </div>
      )}

      {/* Catatan Footer Mockup (Read-Only) */}
      <p style={{ margin: 0, fontSize: '13px', color: '#5E6070' }}>
        Log hanya dapat dibaca. Tidak ada tombol ubah atau hapus.
      </p>
    </>
  );
}
