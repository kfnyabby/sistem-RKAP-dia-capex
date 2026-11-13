# DECISIONS.md — Catatan Keputusan Arsitektur & Teknis Sistem RKAP

Dokumen ini mencatat keputusan arsitektur, pemilihan alat, dan asumsi implementasi proyek Sistem RKAP Terintegrasi (DIA CAPEX) untuk PT Cipta Nirmala (CN) dan Cipta Nirmala Husada (CNH).

---

## [2026-11-13] — Keputusan Fase 0: Fondasi Sistem RKAP

### 1. Struktur Backend Modular (CommonJS & Express 5)
* **Keputusan:** Memecah struktur `backend/` menjadi pola arsitektur berlapis:
  * `backend/src/routes/` — penanganan routing REST API per modul.
  * `backend/src/controllers/` — pengontrol tipis untuk validasi request dan respons.
  * `backend/src/services/` — pusat seluruh aturan bisnis (BR-xx).
  * `backend/src/repositories/` — query SQL berparameter murni melalui `db.js`.
  * `backend/src/middleware/` — middleware penanganan galat (`errorHandler`), otentikasi, dan otorisasi.
* **Alasan:** Sesuai aturan arsitektur `AGENTS.md` (B4), React tidak memuat aturan bisnis dan controller tetap tipis. Pemisahan `src/app.js` dan `index.js` memungkinkan pengujian API otomatis dengan Supertest tanpa harus membuka socket server secara manual.

### 2. Alat Migrasi SQL Tanpa ORM
* **Keputusan:** Menggunakan runner migrasi SQL berurutan berbasis file `.sql` di `backend/migrations/` dan dieksekusi melalui `backend/scripts/migrate.js` dengan pencatatan status di tabel `_migrations`.
* **Alasan:** Menghindari kompleksitas dan overhead ORM, menjaga kueri SQL tetap eksplisit, native PostgreSQL, dan mudah diaudit sesuai instruksi `AGENTS.md` (B3). Seluruh 28 tabel skema P0 dan indeks wajib telah dibuat.

### 3. Data Seeder Fiktif (P0)
* **Keputusan:** Menyediakan seeder fiktif yang realistis melalui `backend/seeds/seed_p0.js` (`npm run seed`):
  * 2 Perusahaan: PT Cipta Nirmala (`CN`) dan Cipta Nirmala Husada (`CNH`).
  * 5 Kelompok Organisasi (Instalasi dan Unit Bisnis).
  * 6 Unit Kerja (MCU, Laboratorium, Rawat Inap 1, Klinik SG PPS, Klinik SG Veteran, Klinik Bogorejo).
  * 14 COA (12 COA operasional utama + 2 COA penyusutan).
  * 50 Master Barang Logistik dengan variasi harga per perusahaan (CN dan CNH) pada periode 2027.
  * Master referensi: 5 jenis investasi, 4 prioritas, 7 kategori investasi beserta masa manfaat (bulan), dan pengaturan default sistem di tabel `settings`.
* **Alasan:** Menjamin kerahasiaan data riil perusahaan (tidak memasukkan data produksi ke repositori sesuai aturan B7).

### 4. Pengujian Otomatis dengan Vitest & Supertest
* **Keputusan:** Memasang `vitest` dan `supertest` di `backend/` untuk pengujian unit dan endpoint API.
* **Alasan:** Vitest cepat, modern, dan kompatibel dengan pipeline pengujian Express 5. Satu suite pengujian otomatis dibuat pada `backend/tests/health.test.mjs` untuk memverifikasi endpoint `GET /api/health` dan root `/`.

### 5. Frontend UI: Tailwind CSS & React Router
* **Keputusan:**
  * Memasang `@tailwindcss/vite` (Tailwind v4) untuk styling utilitas yang cepat dan terintegrasi dengan Vite.
  * Memasang `react-router-dom` (v7) untuk client-side routing SPA.
  * Mengimplementasikan `MainLayout` dengan Sidebar berwarna ungu (`#23174f`) sesuai acuan prototype mockup PPT Ideabox "DIA CAPEX".
  * Menyediakan 6 rute halaman utama: Dashboard (`/dashboard`), Entry (`/entry`), Proses (`/proses`), Display (`/display`), Laporan (`/laporan`), dan Pengaturan (`/pengaturan`).
* **Alasan:** Memenuhi hierarki navigasi PRD Bagian 8 dan memastikan antarmuka siap menerima komponen interaktif pada fase-fase berikutnya.

### 6. Standarisasi Kode: ESLint & Prettier
* **Keputusan:** Mengonfigurasi ESLint (Flat Config) dan Prettier pada `backend/` dan `frontend/`.
* **Alasan:** Memastikan konsistensi penulisan kode, deteksi dini sintaks tidak valid, dan kemudahan kolaborasi (aturan B3 & PRD Bagian 10).

