# Laporan Akhir Frontend: Layar Pengguna & Penugasan Unit

### 1. Ringkasan Hasil
Layar Pengguna dan Penugasan Unit (`/pengaturan/pengguna`) telah selesai dibangun persis mengikuti mockup `13-pengguna-penugasan.html` dengan komponen F0. Tata letak mendatar memuat tabel pengguna di kiri dan formulir panel samping di kanan. Panel samping berfungsi ganda untuk penambahan pengguna baru dan pengubahan pengguna yang dipilih via tombol "Ubah". Seluruh data statis contoh digantikan integrasi API riil dengan penanganan status memuat, keadaan kosong, dan galat bahasa Indonesia.

### 2. Komponen & Berkas Baru / Diubah
- `frontend/src/api/user.api.js`: Modul helper klien untuk `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`, dan `PUT /api/users/:id/units`.
- `frontend/src/pages/PengaturanPenggunaPage.jsx`: Layar lengkap dengan tabel pengguna, aksi Ubah/Aktifkan/Nonaktifkan, serta formulir panel samping dwi-fungsi.

### 3. Hasil Verifikasi
- **Linting**: `npm --prefix frontend run lint` lulus (0 errors, 15 warnings — murni sisa `react-hooks/set-state-in-effect` React 19).
- **Build**: `npm --prefix frontend run build` sukses dalam 1.50 detik menghasilkan bundel produksi Vite (`dist/`).
- **Backend Intact**: Direktori `backend/` sama sekali tidak disentuh (`git status -s backend` bersih 100%).

### 4. Penyimpangan dari Mockup
- **Pilihan Ganda Unit Berkelompok (Disetujui)**: Mockup hanya menampilkan 2 checkbox contoh, sedangkan unit riil berjumlah puluhan. Diimplementasikan komponen multi-select yang dapat dicari (*search text*), difilter per perusahaan (`Semua`/`CN`/`CNH`), dikelompokkan menurut Kelompok Unit (*Org Group*), dilengkapi tombol *Pilih Semua / Batal* per kelompok, serta badge total unit terpilih.
- **Akuntansi Akses Semua Unit**: Untuk peran Akuntansi, seleksi unit otomatis dilewati dan menampilkan keterangan bahwa Akuntansi memiliki akses ke semua unit (CN dan CNH).

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Kata sandi wajib diisi saat tambah pengguna baru (minimal 8 karakter), sedangkan saat mode ubah, kolom kata sandi tidak ditampilkan karena pembaruan sandi dilakukan lewat endpoint profil pengguna.
- Perusahaan pengguna non-akuntansi ditentukan secara otomatis berdasarkan entitas pemilik unit-unit yang ditugaskan kepadanya.
- Chip "Data contoh" dihapus sesuai instruksi; digantikan status status riil dari database.

### 6. Pertanyaan Terbuka, Risiko & Catatan Backend
- **Catatan Backend**: Endpoint `GET /api/users` tidak menyertakan daftar unit dan perusahaan pengguna dalam satu kueri (hanya kolom dasar tabel `users`). Frontend mengatasinya dengan memuat detail unit secara paralel via `GET /api/users/:id`. Untuk skala ratusan user, disarankan backend kelak menambahkan agregasi `companies` dan `units` langsung pada `GET /api/users`.
- Pembaruan profil dan unit dipisah di backend (`PUT /api/users/:id` dan `PUT /api/users/:id/units`); frontend mengeksekusinya secara berurutan saat mode simpan perubahan.
