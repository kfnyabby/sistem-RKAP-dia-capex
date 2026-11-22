# Laporan Implementasi Layar Entry Investasi & Laptop-PC (`/entry/investasi`, `/entry/laptop-pc`)

### 1. Ringkasan Hasil
Layar Entry Investasi (`/entry/investasi`) dan Laptop & PC (`/entry/laptop-pc`) telah dibangun penuh sesuai mockup `03-entry-investasi.html` dan `15-laptop-pc.html`.
Semua data terhubung ke TanStack Query dengan data riil dari backend tanpa data karangan.
Fitur investasi mencakup otomasi COA (BR-15), perhitungan penyusutan otomatis (BR-16), validasi ambang Rp 5.000.000 (BR-01), 4 kotak teks dengan penghitung karakter, chip saran, salin teks baris sebelumnya, simpan otomatis, dan ajukan ke Manager.
Fitur Laptop & PC menyediakan konsolidasi lintas unit khusus Akuntansi & Manager, filter unit/prioritas, ekspor Excel (CSV BOM), dan ringkasan total.
Komponen usang (`InvestmentForm.jsx`, `InvestmentTable.jsx`, `LaptopPcView.jsx`, `EntryPage.jsx`) telah dihapus dan diinventarisasi.

### 2. Berkas & Endpoint Baru yang Digunakan
- **Berkas Baru/Diperbarui**:
  - `frontend/src/pages/EntryInvestasiPage.jsx` (halaman utama Entry Investasi).
  - `frontend/src/pages/LaptopPcPage.jsx` (halaman konsolidasi Laptop & PC).
  - `frontend/src/api/investment.api.js` (klien API modul investasi).
  - `docs/reports/frontend-inventaris.md` (pencatatan berkas yang dihapus).
- **Endpoint API Nyata yang Dipanggil**:
  - `GET /api/units`, `GET /api/periods`, `GET /api/investment-categories`, `GET /api/settings`
  - `GET /api/budget-docs`, `POST /api/budget-docs`, `GET /api/budget-docs/:id/access`, `POST /api/budget-docs/:id/submit`
  - `GET /api/budget-docs/:id/investment-lines`, `POST /api/budget-docs/:id/investment-lines`
  - `PUT /api/budget-docs/:id/investment-lines/:lineId`, `DELETE /api/budget-docs/:id/investment-lines/:lineId`
  - `GET /api/budget-docs/:id/investment-lines/suggestions`, `GET /api/budget-docs/:id/investment-lines/last-text`
  - `GET /api/investment-lines?is_laptop_pc=true` (lintas unit untuk konsolidasi Laptop & PC)

### 3. Hasil Verifikasi
- **Lint**: 0 errors, 26 warnings (seluruh berkas baru lulus bersih 0 error & 0 warning; warning tersisa berasal dari komponen pre-F0).
- **Build**: Vite production build sukses (`built in 2.34s`, `dist/assets/index-DBc_ChYB.js`).
- **Verifikasi Visual**: Chrome DevTools port remote debugging (`--remote-debugging-port=9222`) tidak aktif di host browser. Verifikasi visual dilakukan via penyesuaian struktural DOM, token CSS `mockup.css`, kelas `.app`, `.mn`, `.hd`, `.card`, `.sc`, `.chip`, `.btn`, accordion baris, dan form grid pada resolusi 1280px.

### 4. Penyimpangan dari Mockup / PRD
- Mockup statis menampilkan chip "Data contoh" dan data tiruan hardcoded; pada implementasi ini dihapus dan digantikan data riil dari TanStack Query serta penanganan empty state dan status memuat.
- Pada Laptop & PC, jika dibuka oleh user dengan role non-Akuntansi dan non-Manager (mis. PIC Unit), ditampilkan banner penolakan akses yang informatif daripada tampilan kosong.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Nilai default ambang investasi (`5000000`) dan batas karakter teks investasi (`300`) dibaca dari `settings`, dengan fallback aman di kode jika setting belum dimuat.
- Rencana bulan pengadaan default ke bulan 1 (Januari) jika belum dipilih.

### 6. Pertanyaan Terbuka & Risiko
- Rekomendasi IT saat ini bersifat opsional / catatan penanda pada baris investasi laptop & PC sesuai PRD dan mockup.
