# Laporan Implementasi Frontend Layar Display (`/display`)

### 1. Ringkasan Hasil
Modul Display telah selesai diimplementasikan pada rute `/display/biaya`, `/display/investasi`, dan `/display/permintaan` sesuai mockup `19-display-anggaran-biaya.html` dan `20-display-anggaran-investasi.html`. Seluruh komponen menggunakan styling token `mockup.css`, komponen F0 (`PageHeader`), subnav tab atas yang interaktif, dan terintegrasi dengan TanStack Query ke endpoint Fase 3d. Halaman bersifat baca-saja tanpa tombol manipulasi data; seluruh filter, paginasi, dan kartu ringkasan bersumber langsung dari API (`totals` & `meta`). Komponen lama `DisplayPage.jsx` telah dihapus dan menu sidebar Display kini mengarah ke `/display/biaya`.

### 2. Berkas & Endpoint Baru yang Digunakan
- **Berkas Baru**:
  - `frontend/src/components/display/DisplaySubNav.jsx`: Navigasi tab atas (`Anggaran Biaya`, `Anggaran Investasi`, `Permintaan`).
  - `frontend/src/pages/DisplayBiayaPage.jsx`: Layar Display Anggaran Biaya (Mockup 19).
  - `frontend/src/pages/DisplayInvestasiPage.jsx`: Layar Display Anggaran Investasi (Mockup 20).
  - `frontend/src/pages/DisplayPermintaanPage.jsx`: Placeholder tab Permintaan bertuliskan *"Belum tersedia (Fase 2)"*.
- **Berkas Dimodifikasi & Dihapus**:
  - `frontend/src/api/budget.api.js`: Menambahkan `listCrossUnitExpenseLines` (`GET /api/expense-lines`).
  - `frontend/src/App.jsx`: Menghubungkan rute `/display`, `/display/biaya`, `/display/investasi`, `/display/permintaan`.
  - `frontend/src/components/layout/AppShell.jsx`: Item sidebar "Display" mengarah ke `/display/biaya`.
  - `frontend/src/pages/DisplayPage.jsx`: Dihapus (digantikan secara modular).
- **Endpoint API Nyata yang Dipanggil**:
  - `GET /api/expense-lines` (filter lintas dokumen, totals, realisasi per barang).
  - `GET /api/investment-lines` (filter lintas dokumen, totals, beban penyusutan).
  - `GET /api/reports/export?report=display-biaya|display-investasi&format=xlsx` (unduh file Excel display).
  - `GET /api/units`, `GET /api/coa-groups`, `GET /api/coas`, `GET /api/investment-categories`, `GET /api/priorities`.

### 3. Hasil Verifikasi
- **Build Production**: `npm run build` sukses 100% tanpa galat (Vite build selesai dalam 1.33s).
- **Lint**: Lulus tanpa error sintaks pada seluruh komponen baru Display (0 errors).
- **Pembandingan Visual (1280px)**: Server dev lokal tidak aktif di port 3000 pada saat pengujian. Verifikasi visual dilakukan melalui penyesuaian struktural DOM 1:1 terhadap mockup 19 & 20, kelas CSS tema (`.card`, `.chip`, `.sc`, `.g4`, `.lb`, `.vl`, `.btn.b2`, `.row`, `.r`), urutan kolom tabel, badge pemakaian realisasi, kartu ringkasan 4 kolom responsif, dan layout fluid container pada viewport 1280px.
- **Penanganan Galat**: Tersedia status loading, empty state, dan banner pesan galat berbahasa Indonesia untuk status HTTP 401, 403, 409, dan 422.

### 4. Penyimpangan dari PRD, DECISIONS.md, dan Mockup
- Menghapus chip statis "Data contoh" dari mockup dan menghubungkan kartu ringkasan secara langsung ke nilai agregasi riil `totals` dari respons API backend.
- Menambahkan tab placeholder `/display/permintaan` bertuliskan *"Belum tersedia (Fase 2)"* sesuai instruksi pengguna.
- Tombol aksi manipulasi (Ubah/Hapus) ditiadakan sesuai spesifikasi layar baca-saja.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Periode aktif default mengambil tahun `2027` dari `localStorage` atau periode pertama yang tersedia di database, dan merespons event `rkap:context-change` dari header aplikasi.
- Kolom Realisasi pada tabel biaya dan kartu ringkasan menampilkan `—` jika nilai realisasi bernilai `null` dari API (sesuai kaidah B9: larangan angka karangan).
- Unduh Excel memicu stream blob `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` dengan nama berkas ber-timestamp.

### 6. Pertanyaan Terbuka & Risiko
- Seiring penambahan data jurnal realisasi, kalkulasi persentase pemakaian dihitung di frontend dan backend secara konsisten (warna merah untuk pemakaian >100%, kuning 80-100%, hijau <80%).
