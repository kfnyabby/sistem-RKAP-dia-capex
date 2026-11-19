# Laporan Akhir Fase 8: Audit Logs, Settings, Hardening, & OpenAPI

### 1. Ringkasan Hasil
Fase 8 mengimplementasikan modul Audit Logs & Pengaturan Sistem (Settings) terpusat, penguatan keamanan menyeluruh (Helmet, Rate Limiter global, dynamic CORS, sanitasi log, respon galat seragam), skrip idempotent bootstrap akun Akuntansi produksi, spesifikasi OpenAPI 3.0 resmi pengganti PDF, panduan README.md lengkap, serta verifikasi matriks keamanan RBAC dan wewenang unit pada seluruh rute API mutasi data.

### 2. Migrasi Baru & Endpoint Baru
- **Migrasi**: Tidak ada migrasi skema baru (tabel `audit_logs` dan `settings` sudah aktif dari migrasi sebelumnya).
- `GET /api/audit-logs` (Akuntansi akses penuh, Manager terbatas unit cakupan, filter komprehensif, paginasi).
- `GET /api/settings` (membaca seluruh konfigurasi bisnis dinamis).
- `PUT /api/settings` (memperbarui konfigurasi dengan validasi Zod ketat dan catatan audit atomis).
- `GET /api/docs/openapi.yaml` & `GET /api/docs/openapi.json` (kontrak spesifikasi OpenAPI publik).

### 3. Hasil Verifikasi
- **Pengujian Otomatis**: 161 tes dari 10 berkas uji lulus 100% (0 gagal). Khusus `tests/security_matrix.test.mjs`: 26/26 tes lulus (pengujian unauthenticated 401, wrong role 403, dan wrong unit 403).
- **Linting**: `npm run lint` backend lulus 100% (0 errors, 0 warnings).
- **Skrip Admin**: `npm run bootstrap-admin` diverifikasi berjalan aman dan idempotent.

### 4. Penyimpangan
- Tidak ada penyimpangan dari PRD maupun DECISIONS.md. Dokumen PDF PRD lama resmi digantikan oleh spesifikasi OpenAPI 3.0 (`docs/openapi.yaml`) yang standar, terpusat, dan dapat diakses mesin secara langsung.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Batas laju global (`globalRateLimiter`) ditetapkan 300 req/menit per IP di produksi dan dilonggarkan (10.000 req/menit) saat NODE_ENV=test.
- Akses audit log bagi Manager difilter otomatis pada unit cakupannya; permintaan filter unit_id di luar wewenangnya ditolak fail-closed dengan 403 `UNIT_ACCESS_DENIED`.
- Skrip bootstrap membaca `INITIAL_ACCOUNTANT_*` dari env dan membatalkan otomatis bila sudah ada Akuntansi aktif.

### 6. Pertanyaan Terbuka & Risiko
- Kebijakan retensi dan pengarsipan berkala data `audit_logs` untuk jangka panjang di lingkungan produksi.
- Risiko: Konsistensi format galat seragam `{ success: false, message, code?, errors? }` wajib dijaga pada seluruh pengembangan frontend di masa mendatang.
