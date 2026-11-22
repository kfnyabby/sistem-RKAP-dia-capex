# Laporan Implementasi Frontend: Penentuan COA (/proses/penentuan-coa)

### 1. Ringkasan Hasil
- Layar Penentuan COA diimplementasikan di `/proses/penentuan-coa` (alias `/proses/pen-coa`) khusus role Akuntansi.
- Layout 2 kolom mockup `18-penentuan-coa.html` dipindahkan presisi: antrean tabel kiri (`.sc`, flex 2) & form penetapan kanan (`.card`, flex 1).
- Integrasi TanStack Query penuh untuk antrean (`GET /api/new-item-requests/queue`) dan penetapan (`POST /api/new-item-requests/:id/assign-coa`).
- Komponen usang `PenentuanCoaSection.jsx` dihapus 100% dan inventaris pra-F0 telah tuntas bersih 15/15 berkas.
- Seluruh dependensi kelas Tailwind dan konfigurasi `tailwindcss` pada Vite/CSS telah dibersihkan dari seluruh frontend.

### 2. Migrasi & Endpoint Baru
- Migrasi DB: Tidak ada perubahan database di frontend.
- Endpoint API Terpakai:
  - `GET /api/new-item-requests/queue` (parameter: `status`, `unit_id`, `company_code`, `q`)
  - `POST /api/new-item-requests/:id/assign-coa` (payload: `coa_id`, `item_code`, `price`, `manual_handling_note`)
  - `GET /api/coas` & `GET /api/coa-groups` (pilihan jenis COA dan akun biaya)
  - `GET /api/units` (filter unit kerja)

### 3. Hasil Verifikasi
- ESLint: Lulus (0 errors, 23 pre-F0 warnings tak terkait).
- Build Vite: Sukses (`npm run build` selesai 1.74s, CSS 6.07 kB bebas dari bloat Tailwind).
- Visual UI: Pengujian tata letak lebar 1280px menampilkan 2 kolom responsif sesuai mockup `18-penentuan-coa.html`.
- Penanganan Galat: Respons HTTP 400, 403, 404, 409 (kode bentrok), dan 422 disajikan dengan banner galat berbahasa Indonesia.

### 4. Penyimpangan dari PRD, DECISIONS.md, dan Mockup
- Menghapus chip statis "Data contoh" dari mockup dan menggantinya dengan state query riil (loading skeleton, empty state, banner pesan galat).
- Penambahan alias rute `/proses/pen-coa` yang mengarahkan otomatis ke `/proses/penentuan-coa` sesuai permintaan pengguna.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Kode barang disarankan otomatis dengan format `BRG-0000X` berbasis ID permintaan bila master belum menyediakan kode khusus, namun tetap dapat disunting bebas oleh Akuntansi.
- Jika status dokumen permintaan barang bukan `DRAFT` (sudah diajukan / disetujui / final), input catatan `manual_handling_note` diwajibkan untuk audit tindak lanjut.

### 6. Pertanyaan Terbuka & Risiko
- Risiko: Pengubahan kode barang manual berpotensi memicu HTTP 409 bila bentrok dengan master barang yang sudah ada. Ditangani dengan pesan galat kontekstual meminta pengguna memilih kode alternatif.
