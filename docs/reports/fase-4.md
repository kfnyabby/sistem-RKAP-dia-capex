# Laporan Akhir Fase 4: Anggaran Investasi (Capex)

### 1. Ringkasan Hasil
Fase 4 berhasil menyelesaikan modul Anggaran Investasi (`type = 'INVESTASI'`) secara full-stack.
Backend mengimplementasikan validasi ambang kapitalisasi BR-01, penarikan otomatis COA & masa manfaat BR-15,
kalkulasi presisi beban penyusutan berjalan BR-16, batasan 300 karakter 4 teks justifikasi, isolasi saran isian per unit,
serta konsolidasi pengadaan Laptop & PC lintas unit. Frontend menyajikan form entri responsif, tabel komprehensif,
dan tampilan khusus Laptop & PC untuk Akuntansi & Manager.

### 2. Migrasi Baru & Endpoint Baru
- **Migrasi**: `backend/migrations/009_investment_lines_enhancements.sql` (kolom `version`, indeks performa, default settings `investment_threshold_basis` & `investment_text_max_length`).
- **Endpoint Baru**:
  - `GET /api/priorities`: Referensi prioritas investasi.
  - `GET /api/budget-docs/:id/investment-lines`: Daftar baris investasi & rekapitulasi total.
  - `POST /api/budget-docs/:id/investment-lines`: Tambah baris investasi baru (BR-01, BR-15, BR-16).
  - `GET /api/budget-docs/:id/investment-lines/suggestions?field=`: Sugesti isian teks unit pemilik dokumen.
  - `GET /api/budget-docs/:id/investment-lines/last-text`: Salin 4 teks dari baris investasi sebelumnya.
  - `PUT /api/investment-lines/:id`: Perbarui baris investasi dengan optimistic locking (`version`).
  - `DELETE /api/investment-lines/:id`: Hapus baris investasi & rekalkulasi total dokumen.
  - `GET /api/investment-lines`: Konsolidasi pengadaan Laptop & PC lintas unit (khusus Akuntansi/Manager).

### 3. Hasil Verifikasi
- **Automated Tests**: 97 tests passed, 0 failed (7 test files, termasuk 9 tes komprehensif `investment.test.mjs`).
- **Linter**: `npm --prefix backend run lint` bersih (0 errors, 0 warnings).
- **Frontend Build**: `npm --prefix frontend run build` sukses 100% tanpa error via Vite.

### 4. Penyimpangan dari PRD, DECISIONS.md, dan Mockup
- Tidak ada penyimpangan fungsional. Seluruh alur entry, kartu ringkasan, dan tampilan Laptop/PC mematuhi mockup `03-entry-investasi` dan `15-laptop-pc`.

### 5. Hal yang Diasumsikan atau Ditulis Langsung di Kode
- Nilai default basis ambang investasi disetel ke `'unit_price'` (harga satuan) pada tabel `settings` sesuai usulan keputusan no. 71 untuk menjawab Pertanyaan Terbuka no. 6.
- Kategori Laptop & PC diidentifikasi dari nama kategori `LOWER(ic.name) LIKE '%laptop%' OR LOWER(ic.name) LIKE '%pc%'` atau relasi master `investment_categories`.
- Sisa bulan untuk rencana belanja Desember (bulan 12) menghasilkan penyusutan 0 pada tahun berjalan sesuai kaidah formula $(12 - \text{bulan rencana})$.

### 6. Pertanyaan Terbuka & Risiko
- **Pertanyaan Terbuka**: Penegasan final dari manajemen apakah dasar ambang BR-01 mengacu pada harga satuan (`unit_price`) atau total baris (`line_total`). Saat ini dapat diubah kapan saja via tabel `settings`.
- **Risiko**: Bila unit kerja mengubah bulan rencana investasi di tengah jalan, penyusutan akan bergeser secara proporsional dan memengaruhi proyeksi laba/rugi DIA CAPEX.
