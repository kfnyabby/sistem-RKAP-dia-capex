import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/common/PageHeader';
import Chip from '../components/common/Chip';
import Banner from '../components/common/Banner';
import userApi from '../api/user.api';
import { masterApi } from '../api/master.api';
import { useAuth } from '../auth/AuthContext';
import ResetPasswordModal from '../components/pengaturan/ResetPasswordModal';

export default function PengaturanPenggunaPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // 1. Ambil daftar master unit untuk pilihan penugasan via TanStack Query
  const { data: unitsResponse, isLoading: loadingUnits } = useQuery({
    queryKey: ['units', 'active'],
    queryFn: () => masterApi.getUnits({ is_active: true }),
  });
  const allUnits = useMemo(() => {
    return Array.isArray(unitsResponse) ? unitsResponse : (unitsResponse?.data || []);
  }, [unitsResponse]);

  // 2. Ambil daftar pengguna via TanStack Query (bebas N+1)
  const { data: usersResponse, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers({ per_page: 100 }),
  });
  const users = useMemo(() => {
    return Array.isArray(usersResponse) ? usersResponse : (usersResponse?.data || []);
  }, [usersResponse]);

  // State notifikasi banner
  const [feedback, setFeedback] = useState(null); // { type: 'ok' | 'bd', message: '' }

  // State modal reset kata sandi
  const [resetModalUser, setResetModalUser] = useState(null);

  // State mode form panel samping
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'pic',
  });
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);

  // State filter pemilihan unit di panel samping
  const [unitSearch, setUnitSearch] = useState('');
  const [unitCompanyFilter, setUnitCompanyFilter] = useState('ALL'); // 'ALL' | 'CN' | 'CNH'

  // Helper reset formulir kembali ke mode tambah baru
  const resetForm = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'pic',
    });
    setSelectedUnitIds([]);
    setUnitSearch('');
    setUnitCompanyFilter('ALL');
  };

  // Handler klik tombol Ubah pada baris pengguna
  const handleStartEdit = (user) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFeedback(null);

    const currentUnits = user.units || [];
    const unitIds = currentUnits.map((u) => u.id || u.unit_id);

    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Password tidak diubah di sini
      role: (user.role || 'pic').toLowerCase(),
    });
    setSelectedUnitIds(unitIds);
  };

  // Handler simpan pengguna (Tambah atau Ubah)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    // Validasi form
    if (!formData.name.trim()) {
      setFeedback({ type: 'bd', message: 'Nama pengguna wajib diisi.' });
      return;
    }
    if (!formData.email.trim()) {
      setFeedback({ type: 'bd', message: 'Email pengguna wajib diisi.' });
      return;
    }
    if (!isEditing && (!formData.password || formData.password.length < 8)) {
      setFeedback({ type: 'bd', message: 'Kata sandi minimal 8 karakter untuk pengguna baru.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const isRoleAkuntansi = formData.role === 'akuntansi';
      const unitsToSave = isRoleAkuntansi ? [] : selectedUnitIds;

      if (isEditing) {
        // Mode Ubah: Update profil sekaligus penugasan unit dalam 1 transaksi atomis
        await userApi.updateUser(editingUserId, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          unit_ids: unitsToSave,
        });

        setFeedback({
          type: 'ok',
          message: `Data pengguna "${formData.name}" berhasil diperbarui.`,
        });
        resetForm();
      } else {
        // Mode Tambah: Buat user baru dengan password
        await userApi.createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          unit_ids: unitsToSave,
        });

        setFeedback({
          type: 'ok',
          message: `Pengguna baru "${formData.name}" berhasil ditambahkan.`,
        });
        resetForm();
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      const status = err.response?.status;
      let msg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan data.';
      if (status === 409 || (status === 422 && msg.toLowerCase().includes('email'))) {
        msg = `Email "${formData.email}" sudah terdaftar. Gunakan alamat email lain.`;
      } else if (status === 403) {
        msg = 'Akses ditolak: Hanya peran Akuntansi yang memiliki wewenang mengelola pengguna.';
      }
      setFeedback({ type: 'bd', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Ubah Status (Aktifkan / Nonaktifkan)
  const handleToggleStatus = async (user, targetStatus) => {
    setFeedback(null);
    try {
      await userApi.updateStatus(user.id, targetStatus);
      setFeedback({
        type: 'ok',
        message: `Pengguna "${user.name}" berhasil ${targetStatus ? 'diaktifkan kembali' : 'dinonaktifkan'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal memperbarui status pengguna.';
      setFeedback({ type: 'bd', message: msg });
    }
  };

  // Helper tampilan kolom Perusahaan
  const formatCompanyDisplay = (user) => {
    const role = (user.role || '').toLowerCase();
    if (role === 'akuntansi') {
      return 'CN dan CNH';
    }
    const companies = user.companies || [];
    if (companies.length === 0) return '-';
    const codes = [
      ...new Set(
        companies.map((c) => (typeof c === 'string' ? c : c.code || c.company_code))
      ),
    ].filter(Boolean);
    if (codes.includes('CN') && codes.includes('CNH')) {
      return 'CN dan CNH';
    }
    return codes.length > 0 ? codes.join(', ') : '-';
  };

  // Helper tampilan kolom Unit Ditugaskan
  const formatUnitsDisplay = (user) => {
    const role = (user.role || '').toLowerCase();
    if (role === 'akuntansi') {
      return 'Semua unit';
    }
    const units = user.units || [];
    if (units.length === 0) return '- (Belum ada unit)';
    if (units.length === 1) return `[${units[0].code}] ${units[0].name}`;

    return `${units.length} unit ditugaskan`;
  };

  // Filter master unit untuk multi-select berkelompok di panel samping
  const filteredGroupedUnits = useMemo(() => {
    const searchLower = unitSearch.toLowerCase().trim();
    const grouped = {};

    allUnits.forEach((u) => {
      // Filter Perusahaan
      if (unitCompanyFilter !== 'ALL' && u.company_code !== unitCompanyFilter) {
        return;
      }
      // Filter Pencarian Teks
      if (
        searchLower &&
        !u.name.toLowerCase().includes(searchLower) &&
        !u.code.toLowerCase().includes(searchLower)
      ) {
        return;
      }

      const groupKey = u.group_name || 'Lainnya';
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(u);
    });

    return grouped;
  }, [allUnits, unitSearch, unitCompanyFilter]);

  // Toggle satu unit checkbox
  const toggleUnit = (unitId) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  // Toggle semua unit dalam satu kelompok
  const toggleAllInGroup = (groupUnits) => {
    const groupUnitIds = groupUnits.map((u) => u.id);
    const allSelected = groupUnitIds.every((id) => selectedUnitIds.includes(id));

    if (allSelected) {
      setSelectedUnitIds((prev) => prev.filter((id) => !groupUnitIds.includes(id)));
    } else {
      setSelectedUnitIds((prev) => [...new Set([...prev, ...groupUnitIds])]);
    }
  };

  return (
    <>
      <PageHeader
        title="Pengaturan · Pengguna dan Penugasan Unit"
        chips={<Chip variant="nt">Akuntansi</Chip>}
      />

      {/* Banner Feedback / Notifikasi */}
      {feedback && (
        <Banner variant={feedback.type}>
          <span>{feedback.message}</span>
        </Banner>
      )}

      {/* Tata letak dua kolom: Tabel Pengguna di kiri, Panel Samping Formulir di kanan */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Kolom Kiri: Tabel Pengguna */}
        <div className="card sc" style={{ flex: 2, minWidth: '520px' }}>
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Role</th>
                <th>Perusahaan</th>
                <th>Unit ditugaskan</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#5E6070' }}>
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleLower = (u.role || '').toLowerCase();
                  let roleVariant = 'nt';
                  let roleLabel = 'PIC';
                  if (roleLower === 'manager') {
                    roleVariant = 'wn';
                    roleLabel = 'Manager';
                  } else if (roleLower === 'akuntansi') {
                    roleVariant = 'ok';
                    roleLabel = 'Akuntansi';
                  }

                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500, color: '#1F2233' }}>
                        <div>{u.name}</div>
                        <div style={{ fontSize: '12px', color: '#5E6070' }}>{u.email}</div>
                      </td>
                      <td>
                        <Chip variant={roleVariant}>{roleLabel}</Chip>
                      </td>
                      <td>{formatCompanyDisplay(u)}</td>
                      <td>{formatUnitsDisplay(u)}</td>
                      <td>
                        {u.is_active ? (
                          <Chip variant="ok">Aktif</Chip>
                        ) : (
                          <Chip variant="bd">Nonaktif</Chip>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(u)}
                            className="btn b2"
                            style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
                            title="Ubah data pengguna dan penugasan unit"
                          >
                            Ubah
                          </button>
                          {Number(u.id) !== Number(currentUser?.id || currentUser?.user_id) && (
                            <button
                              type="button"
                              onClick={() => setResetModalUser(u)}
                              className="btn b2"
                              style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                              title="Atur ulang kata sandi pengguna ini"
                            >
                              Reset Sandi
                            </button>
                          )}
                          {u.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u, false)}
                              className="btn b3"
                              style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                              title="Nonaktifkan pengguna"
                            >
                              Nonaktifkan
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u, true)}
                              className="btn"
                              style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
                              title="Aktifkan kembali pengguna"
                            >
                              Aktifkan
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Kolom Kanan: Panel Samping Formulir (Tambah / Ubah) */}
        <div className="card" style={{ flex: 1, minWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: 0 }}>
              {isEditing ? 'Ubah pengguna' : 'Tambah pengguna'}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="chip-select"
                style={{ fontSize: '11px', padding: '2px 8px' }}
                title="Batal edit dan kembali ke Tambah Pengguna Baru"
              >
                + Tambah Baru
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Nama */}
            <label htmlFor="un">
              Nama
              <input
                id="un"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nama lengkap pengguna"
                required
              />
            </label>

            {/* Email */}
            <label htmlFor="ue">
              Email
              <input
                id="ue"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nama@ptcn.id"
                required
              />
            </label>

            {/* Kata Sandi (Hanya saat Tambah Baru) */}
            {!isEditing && (
              <label htmlFor="up">
                Kata sandi
                <input
                  id="up"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  required
                />
              </label>
            )}

            {/* Role */}
            <label htmlFor="ur">
              Role
              <select
                id="ur"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="pic">PIC Unit</option>
                <option value="manager">Manager</option>
                <option value="akuntansi">Akuntansi</option>
              </select>
            </label>

            {/* Fieldset Unit Ditugaskan */}
            <fieldset style={{ border: '1px solid #B9B4C9', borderRadius: '6px', padding: '10px 12px' }}>
              <legend style={{ fontSize: '12px', color: '#5E6070', padding: '0 4px' }}>
                Unit ditugaskan
              </legend>

              {formData.role === 'akuntansi' ? (
                <div style={{ fontSize: '12px', color: '#5E6070', lineHeight: '1.4', padding: '4px 0' }}>
                  Role <b>Akuntansi</b> otomatis memiliki wewenang penuh ke seluruh unit kerja di PT Cipta Nirmala (CN) dan Cipta Nirmala Husada (CNH).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Filter Pencarian & Entitas */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Cari kode atau nama unit..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      style={{ minHeight: '34px', padding: '4px 8px', fontSize: '12px', flex: 1 }}
                    />
                    <select
                      value={unitCompanyFilter}
                      onChange={(e) => setUnitCompanyFilter(e.target.value)}
                      className="chip-select"
                      style={{ minHeight: '34px', fontSize: '11px' }}
                      title="Filter Perusahaan Unit"
                    >
                      <option value="ALL">Semua</option>
                      <option value="CN">CN</option>
                      <option value="CNH">CNH</option>
                    </select>
                  </div>

                  {/* Ringkasan Jumlah Unit Terpilih */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#5E6070' }}>
                      {selectedUnitIds.length} unit terpilih
                    </span>
                    {selectedUnitIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedUnitIds([])}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#8A1F1B',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  {/* Daftar Unit Berkelompok (Scrollable) */}
                  <div
                    style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid #E6E0D6',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      background: '#FAF7F2',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {loadingUnits ? (
                      <div style={{ fontSize: '12px', color: '#5E6070', textAlign: 'center', padding: '12px' }}>
                        Memuat master unit...
                      </div>
                    ) : Object.keys(filteredGroupedUnits).length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#5E6070', textAlign: 'center', padding: '12px' }}>
                        Tidak ada unit yang cocok dengan pencarian.
                      </div>
                    ) : (
                      Object.entries(filteredGroupedUnits).map(([groupName, groupUnits]) => {
                        const allGroupSelected = groupUnits.every((u) => selectedUnitIds.includes(u.id));
                        return (
                          <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {/* Header Kelompok Unit */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '2px 4px',
                                background: '#ECE8F5',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#3A3F63',
                              }}
                            >
                              <span>{groupName}</span>
                              <button
                                type="button"
                                onClick={() => toggleAllInGroup(groupUnits)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  fontSize: '10px',
                                  color: '#3D4E9C',
                                  cursor: 'pointer',
                                  padding: '0 2px',
                                }}
                              >
                                {allGroupSelected ? 'Batal' : 'Pilih Semua'}
                              </button>
                            </div>

                            {/* Daftar Checkbox Unit */}
                            {groupUnits.map((u) => (
                              <label
                                key={u.id}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '13px',
                                  color: '#1F2233',
                                  minHeight: '26px',
                                  cursor: 'pointer',
                                  paddingLeft: '4px',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUnitIds.includes(u.id)}
                                  onChange={() => toggleUnit(u.id)}
                                  style={{ minHeight: '16px', width: '16px', cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  [{u.code}] {u.name}
                                  <span style={{ fontSize: '11px', color: '#5E6070', marginLeft: '4px' }}>
                                    ({u.company_code})
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </fieldset>

            {/* Tombol Simpan & Batal */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button type="submit" className="btn" disabled={isSubmitting} style={{ flex: 1 }}>
                {isSubmitting
                  ? 'Menyimpan...'
                  : isEditing
                    ? 'Simpan perubahan'
                    : 'Simpan pengguna'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn b2"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Modal Dialog Atur Ulang Kata Sandi */}
      <ResetPasswordModal
        isOpen={Boolean(resetModalUser)}
        onClose={() => setResetModalUser(null)}
        user={resetModalUser}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }}
      />
    </>
  );
}
