# Laporan Implementasi Layar Dashboard (`/dashboard`)

### 1. Ringkasan Hasil
Layar Dashboard di `/dashboard` telah dibangun ulang penuh sesuai struktur dan token mockup `01-dashboard.html`.
Menggunakan komponen F0 (`PageHeader`, `Chip`, `Banner`) dan TanStack Query yang terhubung ke endpoint backend nyata.
Tersedia 3 kartu akses cepat yang menyesuaikan role pengguna (`akuntansi`, `manager`, `pic`), 4 kartu metrik pagu dan pemakaian realisasi (biaya dan investasi terpisah), serta bar progres multi-segmen dengan label di dalam warna dan panduan arti status.
Tabel drill-down RKAP vs Realisasi per COA menampilkan chip Aman, Waspada, dan Melebihi yang membaca ambang dinamis dari tabel settings.
Chip "Data contoh" telah dihapus dan seluruh angka bersumber dari data database dengan penanganan status kosong/memuat/galat.

### 2. Berkas & Endpoint Baru yang Digunakan
- **Berkas Baru / Diperbarui**:
  - `frontend/src/pages/DashboardPage.jsx` (layar utama dashboard berbasis TanStack Query dan F0).
  - `frontend/src/api/dashboard.api.js` (klien API dashboard resmi untuk summary, progress, dan budget-vs-realization).
- **Endpoint API Nyata yang Dipanggil**:
  - `GET /api/dashboard/summary?company_id=...&period_id=...` (ringkasan pagu, realisasi biaya & investasi, dan ambang settings)
  - `GET /api/dashboard/progress?company_id=...&period_id=...` (progres status dokumen unit dan daftar unit melewati deadline)
  - `GET /api/dashboard/budget-vs-realization?company_id=...&period_id=...&group_by=coa` (tabel rincian realisasi per COA)
  - `GET /api/reference-data` (daftar perusahaan CN & CNH untuk selektor konteks dinamis)
  - `GET /api/periods` (daftar periode RKAP untuk selektor konteks dinamis)

### 3. Hasil Verifikasi
- **Lint**: Lulus bersih tanpa error (0 errors, 22 warnings dari berkas pre-F0 lama).
- **Build**: Vite production build sukses dalam 1.14s (`dist/assets/index-B-A9kXmv.js`).
- **Verifikasi Visual**: Port Chrome remote debugging 9222 tidak aktif di host browser. Verifikasi visual dilakukan melalui penyesuaian struktural DOM 1:1 terhadap mockup `01-dashboard.html`, kelas CSS `.app`, `.sb`, `.mn`, `.hd`, `.qa`, `.qc`, `.g4`, `.card`, `.sc`, `.chip`, warna status bar, dan layout responsif pada lebar 1280px.

### 4. Penyimpangan dari Mockup / PRD
- **Penghapusan Chip Tiruan**: Chip "Data contoh" dihapus sesuai instruksi; digantikan dengan penanganan loading state, error banner berbahasa Indonesia, dan empty state bila data periode belum tersedia.
- **Kartu Akses Cepat Adaptif Role**: Mockup statis hanya menampilkan tampilan untuk Akuntansi. Pada implementasi ini, tautan aksi disesuaikan berdasarkan role login: Manager mendapatkan akses Antrian Validasi & Laptop/PC; PIC Unit mendapatkan akses Status Pengajuan & Display Barang.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Pemilihan perusahaan dan periode di Header memanfaatkan `localStorage` (`rkap_selected_company` dan `rkap_selected_period`) untuk menjaga konsistensi filter saat berpindah halaman.
- Batas ambang persentase untuk status baris tabel COA (Aman < 80%, Waspada 80–100%, Melebihi > 100%) menggunakan nilai `summary.threshold` yang dikembalikan backend secara dinamis.

### 6. Pertanyaan Terbuka & Risiko
- Jika dokumen pengajuan unit berstatus DRAFT belum memiliki item rincian anggaran yang diisi, segmen bar progres tetap menghitung unit tersebut dalam kategori Draft agar Akuntansi dapat memantau keterlibatan unit.
