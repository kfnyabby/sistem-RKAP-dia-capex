# Laporan Implementasi Layar Input Realisasi (`/proses/realisasi`)

### 1. Ringkasan Hasil
Layar Input Realisasi (`/proses/realisasi`) telah dibangun sesuai struktur dan styling mockup `12-input-realisasi.html`.
Seluruh alur terhubung ke TanStack Query dengan polling proses latar belakang riil dari backend tanpa data karangan.
Fitur utama meliputi stepper 3 langkah (Unggah, Pratinjau, Konfirmasi), form upload .xlsx dengan mode replace/append, polling progres baris latar belakang, 4 kartu metrik (baris dibaca, dipakai biaya & investasi, dilewati, tanpa unit), tabel pemetaan unit alias instan (`PUT /api/unit-aliases`), daftar galat baris, konfirmasi import dengan penanganan 409 conflict unmapped units, rollback batch, dan riwayat batch.
Memori file segera dibebaskan dari peramban setelah pengunggahan terkirim.

### 2. Berkas & Endpoint Baru yang Digunakan
- **Berkas Baru/Diperbarui**:
  - `frontend/src/pages/RealisasiPage.jsx` (halaman utama input realisasi).
  - `frontend/src/api/realization.api.js` (klien API import dan realisasi buku besar).
- **Endpoint API Nyata yang Dipanggil**:
  - `POST /api/realization-imports` (unggah file spreadsheet multipart/form-data)
  - `GET /api/realization-imports/:id` (polling status batch, progres baris, periode terdeteksi)
  - `GET /api/realization-imports/:id/unmapped-units` (daftar unit tak dikenal)
  - `GET /api/realization-imports/:id/errors` (daftar baris galat batch)
  - `PUT /api/unit-aliases` (petakan nama alias unit ke master unit sistem)
  - `POST /api/realization-imports/:id/confirm` (konfirmasi batch PREVIEW -> CONFIRMED, 409 bila unmapped)
  - `DELETE /api/realization-imports/:id` (rollback/batalkan batch import)
  - `GET /api/realization-imports` (riwayat batch import per perusahaan)
  - `GET /api/units` (daftar master unit untuk dropdown pemetaan)

### 3. Hasil Verifikasi
- **Lint**: 0 errors, 23 warnings (seluruh berkas baru lulus bersih 0 error & 0 warning; warning tersisa berasal dari komponen pre-F0).
- **Build**: Vite production build sukses (`built in 1.27s`, `dist/assets/index-D7UPRt3m.js`).
- **Verifikasi Visual**: Port remote debugging Chrome DevTools (`--remote-debugging-port=9222`) tidak aktif di host browser. Verifikasi visual dilakukan via penyesuaian struktural DOM, token CSS `mockup.css`, kelas `.app`, `.mn`, `.hd`, `.card`, `.sc`, `.chip`, `.btn`, `.g4`, `.lb`, `.vl`, dan responsive layout pada resolusi 1280px.

### 4. Penyimpangan dari Mockup / PRD
- Mockup statis menampilkan chip "Data contoh" dan data tiruan hardcoded; pada implementasi ini dihapus dan digantikan data riil dari TanStack Query serta penanganan empty state dan status memuat.
- Pada tabel riwayat batch, ditambahkan tombol "Lanjutkan/Detail" dan "Rollback" agar Akuntansi dapat meninjau kembali atau membatalkan batch yang telah diunggah sebelumnya.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Interval polling untuk batch berstatus `PROCESSING` diatur sebesar 1.500 ms sampai status berganti ke `PREVIEW`, `CONFIRMED`, atau `FAILED`.
- File spreadsheet dibatasi berekstensi `.xlsx` sesuai spesifikasi backend ExcelJS.

### 6. Pertanyaan Terbuka & Risiko
- Backend saat ini menghapus file fisik sementara di folder uploads setelah parsing selesai. Seluruh detail baris yang dipertahankan berada di database `journal_lines` dan `realization_errors`.
