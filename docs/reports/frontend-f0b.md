# Laporan Akhir Frontend F0b: Koreksi Kerangka, Keamanan & Pembersihan

### 1. Ringkasan Hasil
Frontend F0b menyelesaikan seluruh koreksi pada kerangka aplikasi F0. Tombol demo login dan kata sandi di kode sumber dihapus sepenuhnya dari `LoginPage` (murni 100% seperti `10-login.html`). `DashboardPage` dibersihkan dari seluruh angka contoh karangan, beralih ke data riil API dengan penanganan status "Belum ada data". Pilihan periode dan perusahaan di `PageHeader` diambil dinamis dari API dan data pengguna dengan validasi `localStorage`. Penjaga role (route guard) diterapkan ketat untuk `/pengaturan/*` (Akuntansi) dan `/proses/*` (PRD 3.2), serta menu `Display` diarahkan ke rute dan halaman sah.

### 2. Komponen & Berkas Baru / Diubah
- `frontend/src/pages/LoginPage.jsx`: Dihapus tombol demo login, input password kosong (murni persis 10-login).
- `frontend/src/pages/DashboardPage.jsx`: Integrasi API `/api/dashboard/*`, fallback keadaan kosong, penangkap banner alert.
- `frontend/src/components/common/PageHeader.jsx`: Fetch periode (`/api/periods`), filter perusahaan (`user.companies`), validasi `localStorage`.
- `frontend/src/auth/ProtectedRoute.jsx`: Pengalihan akses tidak sah ke `/dashboard` membawa pesan peringatan penolakan.
- `frontend/src/pages/DisplayPage.jsx`: Halaman resmi ber-`PageHeader` untuk rute `/display`.
- `frontend/src/App.jsx`: Proteksi ketat rute `/pengaturan/*` (Akuntansi) dan `/proses/*` (PRD 3.2).
- Pembersihan komponen lama: `InvestmentForm.jsx`, `LaptopPcView.jsx`, `PeriodSubmissionSection.jsx`, `PenentuanCoaSection.jsx`, `ValidationQueueSection.jsx`.

### 3. Hasil Verifikasi
- **Linting**: `npm --prefix frontend run lint` lulus (0 errors, 15 warnings — terpangkas lebih dari 55% dari sebelumnya 36 masalah; seluruh sisa warning adalah `react-hooks/set-state-in-effect` dari React 19 pada fungsi async fetch saat mount).
- **Build**: `npm --prefix frontend run build` sukses dalam 2.68s menghasilkan bundel produksi Vite.
- **Backend Intact**: Direktori `backend/` sama sekali tidak diubah (`git status -s backend` bersih).

### 4. Penyimpangan
- Tombol demo login dihapus sepenuhnya dari `LoginPage` agar tidak meninggalkan kata sandi di kode sumber dan persis 100% dengan `10-login.html`.
- Evaluasi Tailwind CSS: Tailwind CSS masih dipertahankan sementara karena 24 berkas komponen modul lama (fase 2 s.d. 5) masih memerlukan kelas utilitasnya sebelum dimigrasikan per layar. Kerangka F0 murni berjalan di atas `mockup.css` tanpa ada benturan kelas CSS.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Nilai seleksi perusahaan (`CN`) dan periode (`2027`) divalidasi saat inisialisasi; jika tidak cocok dengan daftar sah pengguna, di-reset ke nilai pertama yang valid.
- Pengguna yang mencoba mengakses rute di luar wewenangnya dialihkan ke `/dashboard` dengan pesan banner penolakan akses berbahasa Indonesia.
- Selisih visual: Tidak ditemukan selisih tata letak, warna, tipografi, dan jarak terhadap mockup 01 dan 10.

### 6. Pertanyaan Terbuka & Risiko
- Seiring pemindahan layar modul lama ke komponen desain mockup satu per satu (fase 1 s.d. 7 frontend), kelas utilitas Tailwind lama akan dieliminasi bertahap hingga Tailwind dapat dicopot sepenuhnya.
