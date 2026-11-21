# Laporan Pembaruan Frontend: Layar Pengguna & Master Data

### 1. Ringkasan Hasil
Pembaruan Layar Pengguna (`/pengaturan/pengguna`) dan Layar Master Data (`/pengaturan/master`) telah selesai dilakukan sesuai pembaruan backend Fase 1c dan mockup `13-pengguna.html`.
- **Layar Pengguna**: Menggunakan respons tunggal `GET /api/users` tanpa N+1 kueri detail per user; mengirim payload profil dan `unit_ids` dalam satu transaksi atomis `PUT /api/users/:id`; menambahkan dialog "Atur Ulang Kata Sandi" (`POST /api/users/:id/reset-password`) dengan opsi kata sandi acak aman atau manual, proteksi akun sendiri, tampilan kata sandi sekali pakai, dan tombol salin ke clipboard.
- **Layar Master Data**: Dialog import multi-tipe (barang, COA, unit) mengirimkan permintaan nyata ke backend dengan `?dry_run=true` melalui query parameter URL dan form data (bukan kalkulasi simulasi di klien); modal riwayat harga barang membaca data resmi dari endpoint `GET /api/items/:id/price-history`.

---

### 2. Komponen & Berkas yang Diubah / Ditambahkan
1. `frontend/src/api/user.api.js`:
   - Menambahkan metode `resetPassword(id, new_password)`.
2. `frontend/src/components/pengaturan/ResetPasswordModal.jsx`:
   - Komponen modal baru untuk atur ulang kata sandi berstyling murni `mockup.css`.
   - Menyediakan pilihan mode acak (12 karakter alfanumerik) atau manual (min 8 karakter).
   - Menampilkan kotak peringatan sekali pakai, teks monospaced, tombol salin ke clipboard dengan notifikasi respon kilat, dan informasi pencabutan sesi aktif target di database.
3. `frontend/src/pages/PengaturanPenggunaPage.jsx`:
   - Menghapus fetch N+1 (`userUnitsMap` dan `detailPromises`).
   - Membaca properti `companies` dan `units` langsung dari tiap baris `users`.
   - Mengirim satu `PUT /api/users/:id` yang memuat `unit_ids` saat mode ubah (menghapus panggilan `updateUnits` terpisah).
   - Menyematkan tombol "Reset Sandi" di tabel pengguna (disembunyikan untuk akun Akuntansi yang sedang login).
   - Menghubungkan modal `ResetPasswordModal`.
4. `frontend/src/api/master.api.js`:
   - Menambahkan metode `getItemPriceHistory(id, params)`.
   - Memperbarui fungsi `importItems`, `importCoas`, dan `importUnits` agar secara eksplisit menyertakan query parameter `?dry_run=true/false` pada URL endpoint.
5. `frontend/src/components/master/ItemPriceHistoryModal.jsx`:
   - Mengalihkan pembacaan riwayat harga dari log audit umum ke endpoint resmi `GET /api/items/:id/price-history`.
   - Menyesuaikan tabel riwayat harga untuk menyajikan kolom: No, Waktu, Perusahaan (`company_code`), Harga Lama, Harga Baru, Sumber (`Import Excel` / `Ubah Manual`), dan Diubah Oleh.

---

### 3. Hasil Verifikasi
- **ESLint Frontend**: `npm --prefix frontend run lint` -> **0 error** (24 warnings sisa dependensi hook React 19 lama pada komponen pra-fase).
- **Vite Build**: `npm --prefix frontend run build` -> **Sukses 100%** (selesai dalam 1.59s, menghasilkan artefak `dist/`).
- **Backend Intact**: `npm --prefix backend test tests/fase_1c.test.mjs` -> **12 passed (100%)**; tidak ada regresi pada backend.

---

### 4. Laporan Terpisah Pembandingan Visual (Visual Comparison)

#### A. Apakah Pembandingan Visual Dilakukan?
**Ya, pembandingan visual telah dilakukan** terhadap berkas mockup acuan `docs/mockup/13-pengguna.html` dan `docs/mockup/11-master-data.html`.

#### B. Bagaimana Pembandingan Visual Dilakukan?
1. **Koreksi Penamaan Berkas Acuan**:
   - Dikonfirmasi bahwa nama berkas mockup yang benar adalah `13-pengguna.html` (bukan `13-pengguna-penugasan.html`).
2. **Inspeksi Struktur DOM & Kelas CSS (`13-pengguna.html`)**:
   - **Header & Chip**: Struktur `<div class="hd">` menggunakan heading `<h1>Pengaturan · Pengguna dan Penugasan Unit</h1>` dan badge `<span class="chip nt">Akuntansi</span>`. Sesuai aturan B9, chip statis "Data contoh" ditiadakan karena data berasal langsung dari database riil.
   - **Tata Letak Horizontal (Two-Column Flex)**: Kontainer utama menggunakan flex wrapping dengan pembagian kolom tabel di kiri (`flex: 2; min-width: 520px`) dan panel formulir di kanan (`flex: 1; min-width: 320px`).
   - **Tabel Pengguna**: Mempertahankan urutan dan penamaan kolom mockup: `Nama`, `Role`, `Perusahaan`, `Unit ditugaskan`, `Status`, serta kolom aksi. Tombol aksi menggunakan styling mockup `.btn .b2` (Ubah, Reset Sandi) dan `.btn .b3` (Nonaktifkan).
   - **Panel Formulir Samping**: Mempertahankan susunan input vertikal mockup: Nama, Email, Role (select), dan bagian Penugasan Unit. Form berfungsi dwi-guna (`Tambah pengguna` / `Ubah pengguna`).
3. **Penyimpangan Visual yang Diizinkan**:
   - Pada mockup `13-pengguna.html`, pilihan unit ditugaskan hanya berupa 2 checkbox statis. Diimplementasikan komponen multi-select unit berkelompok yang dapat dicari dan difilter per perusahaan untuk menangani puluhan unit riil di database.
4. **Verifikasi Dialog Modal (Reset Sandi & Riwayat Harga)**:
   - Dialog dibangun dengan styling murni kelas `mockup.css` (`.card`, `.btn`, `.b2`, `.chip`, `.sc`), menggunakan backdrop semi-transparan `#232B4A` (73%), dan tata letak responsif maksimal `680px`.
