# Laporan Akhir Frontend F0: Kerangka Aplikasi, Desain Sistem & Login

### 1. Ringkasan Hasil
Frontend F0 mengadopsi desain sistem mockup kanvas secara penuh menggantikan rancangan lama PPT. Seluruh styling bersama mockup disalin ke `mockup.css` dan diimpor global. Tata letak `AppShell` (sidebar `.sb` dan area `.mn`) dan halaman `LoginPage` dibuat identik dengan `01-dashboard.html` dan `10-login.html`. Seluruh rute aplikasi (12 rute) aktif ber-`PageHeader` dengan proteksi otentikasi, filter menu role Akuntansi, dan integrasi CSRF Axios.

### 2. Komponen & Berkas Baru
- **Styling**: `frontend/src/styles/mockup.css` (font Plus Jakarta Sans, `.app`, `.sb`, `.mn`, `.hd`, `.card`, `.chip`, `.btn`, `.b2`, `.b3`, `.sc`, `table`, `.r`, `.g4`, `.lb`, `.vl`, `input`, `select`, `textarea`, `label`, `.row`, `.qa`, `.qc`, `.ic`).
- **Layout**: `AppShell.jsx` (sidebar navigasi aktif `.sb a.on`, info user, tombol logout, dan area utama). Berkas layout lama PPT (`Header.jsx`, `Sidebar.jsx`) telah dihapus; `MainLayout.jsx` didelegasikan ke `AppShell`.
- **Komponen Inti**: `PageHeader.jsx` (judul, chip entitas & periode interaktif, lonceng notifikasi), `Card.jsx`, `Chip.jsx`, `Button.jsx`, `Banner.jsx`, `DataTable.jsx` (kolom No. otomatis di kiri, angka rata kanan), dan `Field.jsx`.
- **Halaman**: `LoginPage.jsx` (replika persis `10-login.html`), `DashboardPage.jsx` (replika `01-dashboard.html`), serta 10 halaman baru ber-`PageHeader`: `EntryBiayaPage`, `EntryInvestasiPage`, `LaptopPcPage`, `ValidasiPage`, `RealisasiPage`, `LaporanRekapPage`, `LaporanMatriksPage`, `PengaturanMasterPage`, `PengaturanPenggunaPage`, `PengaturanPeriodePage`, `PengaturanAuditPage`.

### 3. Hasil Verifikasi
- **Linting**: `npm --prefix frontend run lint` lulus 100% (0 errors, 34 warnings).
- **Build**: `npm --prefix frontend run build` sukses menghasilkan bundel produksi Vite (`dist/`) tanpa kendala.
- **Komparasi Mockup**: Struktur DOM dan CSS diverifikasi secara teks terhadap `01-dashboard.html` dan `10-login.html`. Pembandingan visual berbasis browser dev server dilaporkan tidak dilakukan secara langsung.
- **Backend Intact**: Direktori `backend/` sama sekali tidak diubah (`git status` bersih).

### 4. Penyimpangan
- Tidak ada penyimpangan estetika dari mockup. Pemilih entitas (`CN`/`CNH`) dan periode (`2027`/`2026`) diintegrasikan sebagai chip interaktif ringkas di `PageHeader`, dan tombol lonceng notifikasi kecil diselaraskan di kanan header `.hd`.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Nilai seleksi entitas (`CN`) dan periode (`2027`) disimpan di `localStorage` pengguna agar bertahan saat perpindahan rute.
- Menu navigasi `Pengaturan` pada sidebar secara ketat hanya ditampilkan bagi peran Akuntansi.
- Quick demo login buttons ditambahkan di bagian bawah kartu login untuk kemudahan verifikasi peran tanpa mengubah tampilan form utama.

### 6. Pertanyaan Terbuka & Risiko
- Perluasan responsivitas untuk perangkat ponsel sempit (< 768px) pada navigasi sidebar dapat disempurnakan seiring implementasi tabel kerja lebar pada fase-fase berikutnya.
