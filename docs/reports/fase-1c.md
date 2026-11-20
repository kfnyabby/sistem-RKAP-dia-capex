# Laporan Akhir Fase 1c: Perbaikan Backend (Pengguna, Reset Password, Riwayat Harga)

## 1. Ringkasan Hasil
Perbaikan backend Fase 1c telah diselesaikan tanpa menyentuh direktori `frontend/`.
Endpoint `GET /api/users` kini menyertakan relasi `companies` dan `units` dalam satu kueri SQL tunggal bebas masalah N+1.
`PUT /api/users/:id` mendukung `unit_ids` opsional dan melakukan pembaruan profil serta penugasan unit dalam 1 transaksi atomis ter-audit.
`POST /api/users/:id/reset-password` khusus Akuntansi mendukung kata sandi manual atau acak, mencabut seluruh sesi target di DB, menolak akun sendiri (403), dan mencatat audit tanpa plain password.
Tersedia `GET /api/items/:id/price-history` khusus Akuntansi untuk membaca riwayat perubahan harga barang.

## 2. Migrasi Baru & Endpoint Baru
- Migrasi: Tidak ada migrasi baru (`item_price_history` dan indeksnya sudah tersedia sejak migrasi `006_item_prices_refactor.sql`).
- Endpoint:
  - `GET /api/users` (dimodifikasi: menyertakan `companies` dan `units` via `COALESCE(json_agg(...))` tanpa N+1).
  - `PUT /api/users/:id` (dimodifikasi: payload `unit_ids` opsional; pembaruan profil dan unit diproses atomis dalam 1 transaksi `BEGIN`/`COMMIT`).
  - `POST /api/users/:id/reset-password` (baru: khusus Akuntansi, reset manual/acak 12 karakter, cabut sesi via `sessionRepository`, audit sanitized).
  - `GET /api/items/:id/price-history` (baru: khusus Akuntansi, mengembalikan riwayat perubahan harga barang per perusahaan dan periode).

## 3. Hasil Verifikasi
- Tes Vitest: 173 tes lulus dari 11 file test (100% lulus, 0 gagal). Termasuk 12 tes baru di `backend/tests/fase_1c.test.mjs`.
- Lint Backend: 0 errors, 0 warnings (`npm --prefix backend run lint`).
- Frontend: Direktori `frontend/` sama sekali tidak tersentuh (`git status -s frontend` bersih).
- REST Client: Tersedia di `docs/api/fase-1c.http` (11 skenario request siap uji).

## 4. Penyimpangan dari PRD, DECISIONS.md, dan Mockup
- Tidak ada penyimpangan. Seluruh fungsi menerapkan RBAC ketat, audit log atomis, validasi Zod 422, dan kode status HTTP standar (400, 403, 404, 422).

## 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Generator kata sandi acak menghasilkan 12 karakter alfanumerik + simbol yang aman via `crypto.randomInt` saat `new_password` tidak diisi atau string kosong.
- Reset kata sandi pada akun Akuntansi sendiri melalui `POST /api/users/:id/reset-password` ditolak dengan HTTP 403; pengguna harus memakai endpoint ganti kata sandi reguler `PATCH /api/auth/password`.
- Riwayat harga membaca dari tabel `item_price_history` yang diisi secara konsisten oleh `recordPriceHistory` saat import atau patch harga.

## 6. Pertanyaan Terbuka & Risiko yang Diketahui
- Tidak ada pertanyaan terbuka yang memblokir backend.
