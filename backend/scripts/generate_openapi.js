const fs = require('fs');
const path = require('path');

/**
 * Generator OpenAPI 3.0 Otomatis dari Struktur Rute dan Kode Backend RKAP DIA CAPEX
 */

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'API Sistem RKAP (DIA CAPEX) CN dan CNH',
    version: '1.0.0',
    description: `Spesifikasi resmi Kontrak API Sistem Rencana Kerja dan Anggaran Perusahaan (RKAP)
berbasis DIA CAPEX untuk PT Cipta Nirmala (CN) dan PT Cipta Nirmala Husada (CNH).
Dokumen ini dihasilkan langsung dari kode sumber backend dan menjadi sumber kebenaran resmi kontrak API.`
  },
  servers: [
    { url: 'http://localhost:5000/api', description: 'Lingkungan Pengembangan Lokal' },
    { url: 'https://rkap.ciptanirmala.com/api', description: 'Lingkungan Produksi' }
  ],
  tags: [
    { name: 'Auth & Profil', description: 'Autentikasi sesi cookie, token CSRF, dan manajemen kata sandi' },
    { name: 'Manajemen Pengguna', description: 'Pengelolaan akun pengguna, peran, dan wewenang akses unit' },
    { name: 'Master Barang & Harga', description: 'Master barang logistik, penetapan harga per perusahaan, dan impor Excel' },
    { name: 'Master COA & Kelompok', description: 'Bagan akun standar (COA), kategori biaya, dan kelompok akun' },
    { name: 'Master Unit & Organisasi', description: 'Unit kerja, kelompok organisasi, alias unit, dan data referensi' },
    { name: 'Kategori & Prioritas Investasi', description: 'Master kategori belanja modal, masa manfaat, akun susut, dan skala prioritas' },
    { name: 'Periode & Akses Pengajuan', description: 'Pengaturan siklus anggaran tahunan dan pembukaan/penutupan akses unit' },
    { name: 'Dokumen & Entry Biaya', description: 'Penyusunan anggaran biaya operasional (OPEX) dan rincian kuantitas bulanan' },
    { name: 'Permintaan Barang Baru', description: 'Pengajuan barang non-master oleh PIC dan penetapan COA oleh Akuntansi' },
    { name: 'Entry Anggaran Investasi', description: 'Penyusunan belanja modal (CAPEX), kalkulasi penyusutan, dan justifikasi strategis' },
    { name: 'Alur Persetujuan (Workflow)', description: 'Pengajuan (submit), persetujuan berjenjang, pengembalian, dan finalisasi anggaran' },
    { name: 'Realisasi Jurnal Buku Besar', description: 'Unggah buku besar ERP (xlsx), pemetaan unit [9xxx], dan agregasi realisasi' },
    { name: 'Dashboard Monitoring', description: 'Ringkasan capaian realisasi, progres pengisian, dan status ambang pemakaian' },
    { name: 'Laporan & Ekspor', description: 'Rekapitulasi anggaran, matriks unit x COA format ERP, dan ekspor lembar sebar' },
    { name: 'Notifikasi', description: 'Notifikasi in-app dan pelacak batas waktu siklus anggaran' },
    { name: 'Pengaturan Sistem', description: 'Parameter ambang investasi, toleransi peringatan, dan konfigurasi global' },
    { name: 'Jejak Audit', description: 'Log riwayat seluruh mutasi data untuk audit kepatuhan dan tata kelola' },
    { name: 'Health & Dokumentasi', description: 'Pemeriksaan status server, koneksi database, dan spesifikasi OpenAPI' }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Cookie sesi httpOnly yang diterbitkan saat login berhasil'
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'Token CSRF yang wajib disertakan pada seluruh request mutasi (POST, PUT, PATCH, DELETE)'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Pesan galat berbahasa Indonesia' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          errors: { type: 'array', items: { type: 'object' } }
        }
      },
      MetaPagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          per_page: { type: 'integer', example: 25 },
          total: { type: 'integer', example: 100 },
          total_pages: { type: 'integer', example: 4 }
        }
      }
    }
  },
  paths: {}
};

// Helper untuk mendaftarkan endpoint
function addEndpoint(pathStr, method, op) {
  if (!spec.paths[pathStr]) spec.paths[pathStr] = {};
  spec.paths[pathStr][method.toLowerCase()] = op;
}

// ==================== 1. AUTH & PROFIL ====================
addEndpoint('/auth/csrf', 'GET', {
  tags: ['Auth & Profil'],
  summary: 'Dapatkan Token CSRF',
  description: 'Menghasilkan token CSRF untuk header X-CSRF-Token pada seluruh request mutasi data.',
  responses: {
    200: {
      description: 'Berhasil mendapatkan token CSRF',
      content: { 'application/json': { schema: { type: 'object', properties: { csrf_token: { type: 'string' } } } } }
    }
  }
});

addEndpoint('/auth/login', 'POST', {
  tags: ['Auth & Profil'],
  summary: 'Login Pengguna',
  description: 'Autentikasi pengguna menggunakan email dan kata sandi dengan sesi cookie httpOnly.',
  security: [{ csrfToken: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'rina@ptcn.id' },
            password: { type: 'string', example: 'password123' }
          }
        }
      }
    }
  },
  responses: {
    200: { description: 'Login berhasil, cookie sesi diterbitkan' },
    401: { description: 'Email atau kata sandi tidak valid' },
    429: { description: 'Terlalu banyak percobaan login, coba lagi nanti' }
  }
});

addEndpoint('/auth/logout', 'POST', {
  tags: ['Auth & Profil'],
  summary: 'Logout Pengguna',
  description: 'Mengakhiri sesi pengguna aktif dan menghapus cookie sesi.',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: {
    200: { description: 'Logout berhasil' },
    401: { description: 'Sesi tidak valid' }
  }
});

addEndpoint('/auth/me', 'GET', {
  tags: ['Auth & Profil'],
  summary: 'Profil Pengguna Aktif',
  description: 'Mendapatkan data pengguna yang sedang login beserta peran dan daftar unit yang ditugaskan.',
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: 'Profil pengguna terautentikasi' },
    401: { description: 'Belum login' }
  }
});

addEndpoint('/auth/password', 'PUT', {
  tags: ['Auth & Profil'],
  summary: 'Ubah Kata Sandi Mandiri',
  description: 'Mengubah kata sandi pengguna sendiri dan mencabut sesi di perangkat lain.',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['current_password', 'new_password'],
          properties: {
            current_password: { type: 'string' },
            new_password: { type: 'string', minLength: 6 }
          }
        }
      }
    }
  },
  responses: {
    200: { description: 'Kata sandi berhasil diubah' },
    400: { description: 'Kata sandi lama tidak cocok' },
    422: { description: 'Validasi kata sandi baru gagal' }
  }
});

// ==================== 2. MANAJEMEN PENGGUNA ====================
addEndpoint('/users', 'GET', {
  tags: ['Manajemen Pengguna'],
  summary: 'Daftar Pengguna',
  description: 'Mendapatkan daftar seluruh akun pengguna dengan filter peran, pencarian, dan paginasi.',
  security: [{ cookieAuth: [] }],
  parameters: [
    { name: 'role', in: 'query', schema: { type: 'string', enum: ['pic', 'manager', 'akuntansi'] } },
    { name: 'search', in: 'query', schema: { type: 'string' } },
    { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
    { name: 'per_page', in: 'query', schema: { type: 'integer', default: 25 } }
  ],
  responses: {
    200: { description: 'Daftar pengguna terpaginasi format { data, meta }' }
  }
});

addEndpoint('/users', 'POST', {
  tags: ['Manajemen Pengguna'],
  summary: 'Tambah Pengguna Baru',
  description: 'Membuat akun pengguna baru dan menetapkan unit awal (khusus Akuntansi).',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            role: { type: 'string', enum: ['pic', 'manager', 'akuntansi'] },
            unit_ids: { type: 'array', items: { type: 'integer' } }
          }
        }
      }
    }
  },
  responses: {
    201: { description: 'Pengguna berhasil dibuat' },
    422: { description: 'Email sudah terdaftar atau input tidak valid' }
  }
});

addEndpoint('/users/{id}', 'GET', {
  tags: ['Manajemen Pengguna'],
  summary: 'Detail Pengguna',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Detail profil pengguna beserta unit' },
    404: { description: 'Pengguna tidak ditemukan' }
  }
});

addEndpoint('/users/{id}', 'PUT', {
  tags: ['Manajemen Pengguna'],
  summary: 'Perbarui Informasi Pengguna',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Pengguna berhasil diperbarui' },
    403: { description: 'Dilarang menurunkan role akun Akuntansi aktif terakhir' }
  }
});

addEndpoint('/users/{id}/status', 'PATCH', {
  tags: ['Manajemen Pengguna'],
  summary: 'Aktif/Nonaktifkan Pengguna',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Status pengguna berhasil diperbarui' },
    403: { description: 'Dilarang menonaktifkan diri sendiri atau Akuntansi terakhir' }
  }
});

addEndpoint('/users/{id}/units', 'PUT', {
  tags: ['Manajemen Pengguna'],
  summary: 'Atur Penugasan Unit Kerja',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Daftar penugasan unit berhasil diperbarui' }
  }
});

addEndpoint('/users/{id}/reset-password', 'POST', {
  tags: ['Manajemen Pengguna'],
  summary: 'Reset Kata Sandi Pengguna (Admin)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Kata sandi berhasil direset dan sesi lama dicabut' }
  }
});

// ==================== 3. MASTER DATA ====================
addEndpoint('/items', 'GET', {
  tags: ['Master Barang & Harga'],
  summary: 'Daftar Barang Logistik',
  security: [{ cookieAuth: [] }],
  parameters: [
    { name: 'q', in: 'query', schema: { type: 'string' } },
    { name: 'coa_id', in: 'query', schema: { type: 'integer' } },
    { name: 'is_active', in: 'query', schema: { type: 'boolean' } },
    { name: 'available_for_doc', in: 'query', schema: { type: 'integer' }, description: 'Kecualikan barang yang sudah masuk dokumen ini' },
    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
    { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } }
  ],
  responses: { 200: { description: 'Daftar barang terpaginasi format { data, meta }' } }
});

addEndpoint('/items', 'POST', {
  tags: ['Master Barang & Harga'],
  summary: 'Tambah Barang Baru',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 201: { description: 'Barang berhasil ditambahkan' } }
});

addEndpoint('/items/{id}', 'GET', {
  tags: ['Master Barang & Harga'],
  summary: 'Detail Barang',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Detail barang beserta harga' } }
});

addEndpoint('/items/{id}', 'PUT', {
  tags: ['Master Barang & Harga'],
  summary: 'Perbarui Barang',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Barang berhasil diperbarui' } }
});

addEndpoint('/items/{id}', 'DELETE', {
  tags: ['Master Barang & Harga'],
  summary: 'Hapus Barang Permanen',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Barang berhasil dihapus' },
    409: { description: 'Barang tidak dapat dihapus karena sudah digunakan di dokumen' }
  }
});

addEndpoint('/items/{id}/prices', 'PATCH', {
  tags: ['Master Barang & Harga'],
  summary: 'Perbarui Harga Master Barang',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Harga barang diperbarui dan dicatat ke riwayat' } }
});

addEndpoint('/items/{id}/status', 'PATCH', {
  tags: ['Master Barang & Harga'],
  summary: 'Ubah Status Aktif Barang',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Status berhasil diperbarui' } }
});

addEndpoint('/items/import', 'POST', {
  tags: ['Master Barang & Harga'],
  summary: 'Impor Master Barang Excel',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [
    { name: 'dry_run', in: 'query', schema: { type: 'boolean', default: false } },
    { name: 'company_code', in: 'query', schema: { type: 'string', default: 'CN' } },
    { name: 'update_prices', in: 'query', schema: { type: 'boolean', default: false } }
  ],
  responses: { 200: { description: 'Hasil impor barang atau ringkasan simulasi dry-run' } }
});

addEndpoint('/items/quality-report', 'GET', {
  tags: ['Master Barang & Harga'],
  summary: 'Laporan Kualitas Data Master Barang',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Metrik barang tanpa harga, tanpa COA, dan ringkasan impor' } }
});

addEndpoint('/items/{id}/price-history', 'GET', {
  tags: ['Master Barang & Harga'],
  summary: 'Riwayat Perubahan Harga Barang',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Jejak riwayat perubahan harga per perusahaan' } }
});

// COA
addEndpoint('/coas', 'GET', {
  tags: ['Master COA & Kelompok'],
  summary: 'Daftar Bagan Akun (COA)',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar COA terpaginasi format { data, meta }' } }
});

addEndpoint('/coas', 'POST', {
  tags: ['Master COA & Kelompok'],
  summary: 'Tambah Akun COA Baru',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 201: { description: 'COA berhasil ditambahkan' } }
});

addEndpoint('/coas/{id}', 'GET', {
  tags: ['Master COA & Kelompok'],
  summary: 'Detail Akun COA',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Detail COA' } }
});

addEndpoint('/coas/{id}', 'PUT', {
  tags: ['Master COA & Kelompok'],
  summary: 'Perbarui Akun COA',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'COA berhasil diperbarui' } }
});

addEndpoint('/coas/{id}', 'DELETE', {
  tags: ['Master COA & Kelompok'],
  summary: 'Hapus Akun COA',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'COA berhasil dihapus' }, 409: { description: 'COA masih digunakan' } }
});

addEndpoint('/coa-groups', 'GET', {
  tags: ['Master COA & Kelompok'],
  summary: 'Daftar Kelompok Akun COA',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar kelompok akun format { data, meta }' } }
});

addEndpoint('/coas/import', 'POST', {
  tags: ['Master COA & Kelompok'],
  summary: 'Impor Master COA Multi-Sheet Excel',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 200: { description: 'Hasil impor 3 sheet master COA' } }
});

// UNITS & REFERENCE
addEndpoint('/units', 'GET', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Daftar Unit Kerja',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar unit kerja format { data, meta }' } }
});

addEndpoint('/units', 'POST', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Tambah Unit Kerja Baru',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 201: { description: 'Unit berhasil ditambahkan' } }
});

addEndpoint('/units/{id}', 'PUT', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Perbarui Unit Kerja',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Unit berhasil diperbarui' } }
});

addEndpoint('/units/{id}', 'DELETE', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Hapus Unit Kerja',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Unit berhasil dihapus' }, 409: { description: 'Unit masih digunakan' } }
});

addEndpoint('/units/import', 'POST', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Impor Draf Master Unit Excel',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 200: { description: 'Hasil impor unit kerja dengan opsi dry-run' } }
});

addEndpoint('/reference-data', 'GET', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Data Referensi Master Global',
  description: 'Mengambil data master statis perusahaan dan kelompok organisasi secara terpadu.',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Data referensi perusahaan dan org_groups' } }
});

addEndpoint('/unit-aliases', 'GET', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Daftar Alias Unit [9xxx]',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Pemetaan alias kode unit buku besar ke unit resmi' } }
});

addEndpoint('/unit-aliases', 'PUT', {
  tags: ['Master Unit & Organisasi'],
  summary: 'Petakan Alias Unit Kerja',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 200: { description: 'Alias unit berhasil diperbarui' } }
});

// INVESTMENT CATEGORIES & PRIORITIES
addEndpoint('/investment-categories', 'GET', {
  tags: ['Kategori & Prioritas Investasi'],
  summary: 'Daftar Kategori Belanja Modal (Investasi)',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar kategori belanja modal format { data, meta }' } }
});

addEndpoint('/investment-categories/{id}', 'PUT', {
  tags: ['Kategori & Prioritas Investasi'],
  summary: 'Perbarui Masa Manfaat & COA Penyusutan Kategori Investasi',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Kategori belanja modal berhasil diperbarui' } }
});

addEndpoint('/priorities', 'GET', {
  tags: ['Kategori & Prioritas Investasi'],
  summary: 'Daftar Skala Prioritas Investasi',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Skala prioritas format { success, data, meta }' } }
});

// ==================== 4. PERIODE & SUBMISSION ACCESS ====================
addEndpoint('/periods', 'GET', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Daftar Periode Anggaran RKAP',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar periode anggaran (Array)' } }
});

addEndpoint('/periods', 'POST', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Buat Periode Anggaran Baru',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 201: { description: 'Periode berhasil dibuat' }, 409: { description: 'Periode tahun tersebut sudah ada' } }
});

addEndpoint('/periods/{id}', 'PUT', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Perbarui Jadwal & Batas Waktu Periode',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Batas waktu berhasil diperbarui' } }
});

addEndpoint('/periods/{id}/submission', 'PATCH', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Buka / Tutup Pengajuan Level Periode',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Status pengajuan level periode berhasil diubah' } }
});

addEndpoint('/periods/{id}/submission/bulk', 'POST', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Buka / Tutup Akses Pengajuan Massal',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Akses pengajuan massal berhasil diperbarui' } }
});

addEndpoint('/budget-docs/{id}/access', 'GET', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Status Akses Efektif Dokumen Anggaran',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Evaluasi hierarkis status akses pengisian (isOpen, reason, source)' } }
});

addEndpoint('/submission-access', 'GET', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Daftar Pengecualian Akses Unit',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar override akses per unit dan jenis anggaran' } }
});

addEndpoint('/submission-access', 'POST', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Buat Pengecualian Akses Unit Manual',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 201: { description: 'Pengecualian berhasil disimpan' } }
});

addEndpoint('/submission-access/{id}', 'PUT', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Perbarui Status Pengecualian Akses Unit',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Pengecualian akses diperbarui' } }
});

addEndpoint('/submission-access/{id}', 'DELETE', {
  tags: ['Periode & Akses Pengajuan'],
  summary: 'Hapus Pengecualian Akses Unit',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Pengecualian akses dihapus, kembali ke default periode' } }
});

// ==================== 5. ANGGARAN BIAYA & DOKUMEN ====================
addEndpoint('/budget-docs', 'GET', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Daftar Dokumen Anggaran Unit',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar dokumen anggaran unit format { data, meta }' } }
});

addEndpoint('/budget-docs', 'POST', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Buat Lembar Kerja Dokumen Anggaran',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 201: { description: 'Dokumen anggaran berhasil dibuat' } }
});

addEndpoint('/budget-docs/{id}', 'GET', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Detail Dokumen Anggaran',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Detail dokumen beserta total' } }
});

addEndpoint('/budget-docs/{id}/refresh-prices', 'POST', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Sinkronkan Ulang Harga Snapshot Barang',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Harga snapshot diperbarui ke harga master aktif' } }
});

addEndpoint('/budget-docs/{id}/expense-lines', 'GET', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Daftar Baris Anggaran Biaya',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Daftar baris biaya format { data, meta }' } }
});

addEndpoint('/budget-docs/{id}/expense-lines', 'PUT', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Simpan Otomatis Baris Anggaran Biaya',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Baris biaya berhasil disimpan dan total direkalkulasi' },
    409: { description: 'Bentrok versi dokumen (optimistic concurrency conflict)' }
  }
});

addEndpoint('/expense-lines/{id}', 'DELETE', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Hapus Satu Baris Anggaran Biaya',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Baris berhasil dihapus' } }
});

addEndpoint('/budget-docs/{id}/expense-lines/available-items', 'GET', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Daftar Barang Tersedia untuk Ditambahkan',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Barang master yang belum masuk ke lembar kerja dokumen ini' } }
});

addEndpoint('/budget-docs/{id}/expense-lines/summary', 'GET', {
  tags: ['Dokumen & Entry Biaya'],
  summary: 'Ringkasan Subtotal Biaya per Kelompok COA',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Subtotal per COA dan total dokumen' } }
});

// ==================== 6. PERMINTAAN BARANG BARU ====================
addEndpoint('/budget-docs/{id}/new-item-requests', 'GET', {
  tags: ['Permintaan Barang Baru'],
  summary: 'Daftar Permintaan Barang Baru Dokumen',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Daftar usulan barang baru pada dokumen' } }
});

addEndpoint('/budget-docs/{id}/new-item-requests', 'POST', {
  tags: ['Permintaan Barang Baru'],
  summary: 'Ajukan Permintaan Barang Baru',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 201: { description: 'Permintaan berhasil disimpan' } }
});

addEndpoint('/new-item-requests/{id}', 'PUT', {
  tags: ['Permintaan Barang Baru'],
  summary: 'Perbarui Permintaan Barang Baru',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Permintaan diperbarui' } }
});

addEndpoint('/new-item-requests/{id}', 'DELETE', {
  tags: ['Permintaan Barang Baru'],
  summary: 'Hapus Permintaan Barang Baru',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Permintaan dihapus' } }
});

addEndpoint('/budget-docs/{id}/new-item-requests/send', 'POST', {
  tags: ['Permintaan Barang Baru'],
  summary: 'Kirim Permintaan Barang Baru ke Akuntansi',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Status berubah menjadi MENUNGGU_COA' } }
});

addEndpoint('/new-item-requests/queue', 'GET', {
  tags: ['Permintaan Barang Baru'],
  summary: 'Antrean Penentuan COA Barang Baru (Khusus Akuntansi)',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Antrean barang yang memerlukan penetapan akun COA format { success, data, meta }' } }
});

addEndpoint('/new-item-requests/{id}/assign-coa', 'POST', {
  tags: ['Permintaan Barang Baru'],
  summary: 'Tetapkan COA & Masukkan ke Master Barang',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'COA ditetapkan, barang baru dibuat di master, dan masuk ke dokumen' },
    409: { description: 'Kode barang bentrok dengan master yang sudah ada' }
  }
});

// ==================== 7. ANGGARAN INVESTASI (CAPEX) ====================
addEndpoint('/budget-docs/{id}/investment-lines', 'GET', {
  tags: ['Entry Anggaran Investasi'],
  summary: 'Daftar Baris Anggaran Investasi Dokumen',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Daftar belanja modal format { success, data, meta, summary, doc }' } }
});

addEndpoint('/budget-docs/{id}/investment-lines', 'POST', {
  tags: ['Entry Anggaran Investasi'],
  summary: 'Tambah Item Belanja Modal (Investasi)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    201: { description: 'Baris investasi ditambahkan dan beban susut dihitung otomatis' },
    422: { description: 'Nilai di bawah ambang kapitalisasi atau melebihi batas karakter teks' }
  }
});

addEndpoint('/investment-lines/{id}', 'PUT', {
  tags: ['Entry Anggaran Investasi'],
  summary: 'Perbarui Baris Anggaran Investasi',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Baris investasi berhasil diperbarui' } }
});

addEndpoint('/investment-lines/{id}', 'DELETE', {
  tags: ['Entry Anggaran Investasi'],
  summary: 'Hapus Baris Anggaran Investasi',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Baris investasi berhasil dihapus' } }
});

addEndpoint('/investment-lines', 'GET', {
  tags: ['Entry Anggaran Investasi'],
  summary: 'Konsolidasi Belanja Laptop / PC Lintas Unit',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'is_laptop_pc', in: 'query', schema: { type: 'boolean', default: true } }],
  responses: { 200: { description: 'Daftar konsolidasi belanja IT untuk pengadaan terpusat' } }
});

addEndpoint('/budget-docs/{id}/investment-lines/suggestions', 'GET', {
  tags: ['Entry Anggaran Investasi'],
  summary: 'Autocomplete Sugesti Justifikasi Investasi',
  security: [{ cookieAuth: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
    { name: 'field', in: 'query', required: true, schema: { type: 'string', enum: ['strategic_objective', 'counter_measure_kpi', 'work_program', 'strategic_action'] } }
  ],
  responses: { 200: { description: 'Daftar frasa yang pernah digunakan oleh unit pemilik dokumen' } }
});

addEndpoint('/budget-docs/{id}/investment-lines/last-text', 'GET', {
  tags: ['Entry Anggaran Investasi'],
  summary: 'Salin Teks Justifikasi Baris Terakhir',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Teks dari baris investasi terakhir pada dokumen' } }
});

// ==================== 8. WORKFLOW APPROVAL ====================
addEndpoint('/budget-docs/{id}/submit', 'POST', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Ajukan Dokumen Anggaran (Submit)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Dokumen berstatus DIAJUKAN' } }
});

addEndpoint('/budget-docs/{id}/approve', 'POST', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Setujui Dokumen Anggaran (Approve)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Dokumen berstatus DISETUJUI' },
    403: { description: 'Pelanggaran Maker-Checker: pengaju dilarang menyetujui dokumennya sendiri' }
  }
});

addEndpoint('/budget-docs/{id}/return', 'POST', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Kembalikan Dokumen Anggaran untuk Revisi',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Dokumen berstatus DIKEMBALIKAN dan akses unit otomatis dibuka jika belum lewat deadline' }
  }
});

addEndpoint('/budget-docs/{id}/finalize', 'POST', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Finalisasi Dokumen Tunggal (Akuntansi)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Dokumen dikunci permanen berstatus FINAL' } }
});

addEndpoint('/budget-docs/finalize-bulk', 'POST', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Finalisasi Dokumen Massal (Akuntansi)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 200: { description: 'Dokumen yang terpilih difinalisasi' } }
});

addEndpoint('/budget-docs/{id}/reopen', 'POST', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Buka Kembali Dokumen FINAL (Akuntansi)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Dokumen FINAL dibuka kembali menjadi DRAFT dengan alasan tercatat' } }
});

addEndpoint('/budget-docs/{id}/history', 'GET', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Riwayat Status Dokumen',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Jejak mutasi status dokumen anggaran' } }
});

addEndpoint('/review-queue', 'GET', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Antrian Telaah Validasi',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar dokumen menunggu telaah sesuai cakupan wewenang' } }
});

addEndpoint('/budget-docs/{id}/lines/{lineType}/{lineId}/comments', 'GET', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Daftar Komentar pada Baris Anggaran',
  security: [{ cookieAuth: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
    { name: 'lineType', in: 'path', required: true, schema: { type: 'string', enum: ['expense', 'investment'] } },
    { name: 'lineId', in: 'path', required: true, schema: { type: 'integer' } }
  ],
  responses: { 200: { description: 'Daftar komentar diskusi reviewer' } }
});

addEndpoint('/budget-docs/{id}/lines/{lineType}/{lineId}/comments', 'POST', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Beri Komentar Catatan pada Baris Anggaran',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
    { name: 'lineType', in: 'path', required: true, schema: { type: 'string', enum: ['expense', 'investment'] } },
    { name: 'lineId', in: 'path', required: true, schema: { type: 'integer' } }
  ],
  responses: { 201: { description: 'Komentar berhasil ditambahkan' } }
});

addEndpoint('/line-comments/{id}', 'DELETE', {
  tags: ['Alur Persetujuan (Workflow)'],
  summary: 'Hapus Komentar Catatan',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Komentar berhasil dihapus' } }
});

// ==================== 9. REALISASI BUKU BESAR ====================
addEndpoint('/realization-imports', 'POST', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Unggah Berkas Jurnal Buku Besar (.xlsx)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 202: { description: 'Berkas diterima dan diproses streaming di latar belakang' } }
});

addEndpoint('/realization-imports', 'GET', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Daftar Batch Impor Realisasi',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar riwayat batch impor format { data, meta }' } }
});

addEndpoint('/realization-imports/{id}', 'GET', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Detail Status & Progres Batch Impor',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Metrik baris dibaca, valid, skipped, dan persentase proses' } }
});

addEndpoint('/realization-imports/{id}/confirm', 'POST', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Konfirmasi Batch Menjadi CONFIRMED',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: {
    200: { description: 'Batch dikonfirmasi dan masuk ke angka realisasi resmi' },
    409: { description: 'Ditolak: masih terdapat baris jurnal dengan unit yang belum terpetakan' }
  }
});

addEndpoint('/realization-imports/{id}', 'DELETE', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Batalkan (Rollback) Batch Impor Realisasi',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Batch ditandai ROLLED_BACK dan baris dibersihkan' } }
});

addEndpoint('/realization-imports/{id}/errors', 'GET', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Daftar Galat Pemetaan Unit / Transaksi Batch',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Daftar baris bermasalah format { data, meta }' } }
});

addEndpoint('/realization-imports/{id}/unmapped-units', 'GET', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Daftar Unit Belum Terpetakan pada Batch',
  security: [{ cookieAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Daftar kode raw_unit yang memerlukan alias sebelum konfirmasi' } }
});

addEndpoint('/realizations', 'GET', {
  tags: ['Realisasi Jurnal Buku Besar'],
  summary: 'Agregasi Angka Realisasi Sesuai BR-05',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Total realisasi DEBET-KREDIT (biaya) dan DEBET (investasi)' } }
});

// ==================== 10. DASHBOARD ====================
addEndpoint('/dashboard/summary', 'GET', {
  tags: ['Dashboard Monitoring'],
  summary: 'Ringkasan Capaian Anggaran & Realisasi',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Empat kartu ringkasan dan persentase penggunaan terpisah biaya & capex' } }
});

addEndpoint('/dashboard/progress', 'GET', {
  tags: ['Dashboard Monitoring'],
  summary: 'Progres Pengisian Anggaran Unit',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Distribusi status dokumen (DRAFT, DIAJUKAN, DISETUJUI, FINAL)' } }
});

addEndpoint('/dashboard/budget-vs-realization', 'GET', {
  tags: ['Dashboard Monitoring'],
  summary: 'Tabel Komparasi RKAP vs Realisasi per COA',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Tabel komparasi dengan status chip Aman, Waspada, atau Melebihi' } }
});

// ==================== 11. LAPORAN & EKSPOR ====================
addEndpoint('/reports/expense-by-coa', 'GET', {
  tags: ['Laporan & Ekspor'],
  summary: 'Laporan Rekapitulasi Anggaran Biaya per COA',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Rekapitulasi total anggaran operasional per akun COA' } }
});

addEndpoint('/reports/investment-summary', 'GET', {
  tags: ['Laporan & Ekspor'],
  summary: 'Laporan Ringkasan Anggaran Investasi',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Ringkasan belanja modal per kategori atau bulan rencana' } }
});

addEndpoint('/reports/consolidated', 'GET', {
  tags: ['Laporan & Ekspor'],
  summary: 'Laporan Rekap Gabungan CN dan CNH',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Laporan hierarkis Perusahaan -> Unit -> Lines dengan subtotal SQL' } }
});

addEndpoint('/reports/matrix', 'GET', {
  tags: ['Laporan & Ekspor'],
  summary: 'Matriks Unit x COA (Format ERP)',
  security: [{ cookieAuth: [] }],
  parameters: [
    { name: 'period_year', in: 'query', schema: { type: 'integer', default: 2027 } },
    { name: 'hide_empty', in: 'query', schema: { type: 'boolean', default: true } },
    { name: 'company_ids', in: 'query', schema: { type: 'string' } },
    { name: 'group_ids', in: 'query', schema: { type: 'string' } }
  ],
  responses: { 200: { description: 'Struktur matriks dua dimensi unit x akun COA' } }
});

addEndpoint('/reports/export', 'GET', {
  tags: ['Laporan & Ekspor'],
  summary: 'Ekspor Laporan Resmi ke Excel (.xlsx)',
  security: [{ cookieAuth: [] }],
  parameters: [
    { name: 'report', in: 'query', required: true, schema: { type: 'string', enum: ['expense-by-coa', 'investment-summary', 'consolidated', 'matrix', 'budget-vs-realization'] } },
    { name: 'format', in: 'query', schema: { type: 'string', default: 'xlsx' } }
  ],
  responses: {
    200: { description: 'Berkas lembar sebar format application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    422: { description: 'Format PDF ditunda (PDF_EXPORT_DEFERRED)' }
  }
});

// ==================== 12. NOTIFIKASI ====================
addEndpoint('/notifications', 'GET', {
  tags: ['Notifikasi'],
  summary: 'Daftar Notifikasi Pengguna',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Daftar notifikasi in-app dan jumlah pesan belum dibaca' } }
});

addEndpoint('/notifications/{id}/read', 'PATCH', {
  tags: ['Notifikasi'],
  summary: 'Tandai Notifikasi Sudah Dibaca',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { 200: { description: 'Notifikasi ditandai dibaca' } }
});

addEndpoint('/notifications/read-all', 'POST', {
  tags: ['Notifikasi'],
  summary: 'Tandai Seluruh Notifikasi Dibaca',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: { 200: { description: 'Seluruh notifikasi ditandai dibaca' } }
});

// ==================== 13. PENGATURAN SISTEM ====================
addEndpoint('/settings', 'GET', {
  tags: ['Pengaturan Sistem'],
  summary: 'Baca Pengaturan Sistem Global',
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: 'Konfigurasi ambang investasi, persentase peringatan, dan kontak' } }
});

addEndpoint('/settings', 'PUT', {
  tags: ['Pengaturan Sistem'],
  summary: 'Perbarui Pengaturan Sistem (Khusus Akuntansi)',
  security: [{ cookieAuth: [] }, { csrfToken: [] }],
  responses: {
    200: { description: 'Pengaturan berhasil diperbarui dan dicatat ke audit log' },
    422: { description: 'Validasi Zod gagal: nilai ambang, persentase, atau kontak tidak valid' }
  }
});

// ==================== 14. JEJAK AUDIT ====================
addEndpoint('/audit-logs', 'GET', {
  tags: ['Jejak Audit'],
  summary: 'Daftar Jejak Audit (Audit Logs)',
  description: 'Melihat seluruh riwayat perubahan data. Akuntansi melihat semua, Manager dibatasi unitnya, PIC ditolak 403.',
  security: [{ cookieAuth: [] }],
  parameters: [
    { name: 'entity', in: 'query', schema: { type: 'string' } },
    { name: 'action', in: 'query', schema: { type: 'string' } },
    { name: 'actor_id', in: 'query', schema: { type: 'integer' } },
    { name: 'unit_id', in: 'query', schema: { type: 'integer' } },
    { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
    { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
    { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
  ],
  responses: {
    200: { description: 'Daftar audit log terpaginasi format { success, data, meta, pagination }' },
    403: { description: 'Wewenang tidak cukup atau unit di luar wewenang' }
  }
});

// ==================== 15. HEALTH & DOKUMENTASI ====================
addEndpoint('/health', 'GET', {
  tags: ['Health & Dokumentasi'],
  summary: 'Pemeriksaan Kesehatan Server',
  responses: { 200: { description: 'Server aktif dan waktu aktif sistem' } }
});

addEndpoint('/test-db', 'GET', {
  tags: ['Health & Dokumentasi'],
  summary: 'Pemeriksaan Koneksi Database PostgreSQL',
  responses: {
    200: { description: 'Database terhubung' },
    500: { description: 'Koneksi database gagal' }
  }
});

addEndpoint('/docs/openapi.yaml', 'GET', {
  tags: ['Health & Dokumentasi'],
  summary: 'Spesifikasi OpenAPI Format YAML',
  responses: { 200: { description: 'File openapi.yaml' } }
});

addEndpoint('/docs/openapi.json', 'GET', {
  tags: ['Health & Dokumentasi'],
  summary: 'Spesifikasi OpenAPI Format JSON',
  responses: { 200: { description: 'File openapi.json' } }
});

// ==================== SERIALISASI KE YAML & JSON ====================
function dumpYaml(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  let res = '';
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        const itemYaml = dumpYaml(item, indent + 2).trimStart();
        res += `${pad}- ${itemYaml}`;
      } else {
        res += `${pad}- ${JSON.stringify(item)}\n`;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      if (typeof v === 'object' && v !== null) {
        if (Array.isArray(v) && v.length === 0) {
          res += `${pad}${k}: []\n`;
        } else if (Object.keys(v).length === 0) {
          res += `${pad}${k}: {}\n`;
        } else {
          res += `${pad}${k}:\n${dumpYaml(v, indent + 2)}`;
        }
      } else if (typeof v === 'string') {
        if (v.includes('\n')) {
          res += `${pad}${k}: |\n`;
          for (const line of v.split('\n')) {
            res += `${pad}  ${line}\n`;
          }
        } else if (v.includes(':') || v.includes('#') || v.includes('{') || v.includes('}') || v.includes('[') || v.includes(']')) {
          res += `${pad}${k}: "${v.replace(/"/g, '\\"')}"\n`;
        } else {
          res += `${pad}${k}: ${v}\n`;
        }
      } else {
        res += `${pad}${k}: ${v}\n`;
      }
    }
  }
  return res;
}

// Pastikan folder docs ada
const docsDir = path.resolve(__dirname, '../../docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Tulis berkas docs/openapi.json
const jsonOutput = JSON.stringify(spec, null, 2);
fs.writeFileSync(path.join(docsDir, 'openapi.json'), jsonOutput, 'utf8');

// Tulis berkas docs/openapi.yaml
const yamlOutput = dumpYaml(spec);
fs.writeFileSync(path.join(docsDir, 'openapi.yaml'), yamlOutput, 'utf8');

console.log(`OpenAPI berhasil dihasilkan:`);
console.log(`- Total Paths: ${Object.keys(spec.paths).length}`);
let totalOps = 0;
for (const p of Object.values(spec.paths)) {
  totalOps += Object.keys(p).length;
}
console.log(`- Total Operations: ${totalOps}`);
console.log(`- Berkas ditulis: docs/openapi.json & docs/openapi.yaml`);
