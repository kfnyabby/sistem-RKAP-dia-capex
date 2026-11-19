# Laporan Akhir Fase 6: Realisasi Jurnal Buku Besar

## 1. Ringkasan Hasil
Modul Realisasi Jurnal Buku Besar (Fase 6) berhasil diselesaikan pada sisi backend dengan arsitektur streaming penuh (`ExcelJS.stream.xlsx.WorkbookReader`).
Sistem menyimpan file sementara di disk (`multer.diskStorage`), menyaring baris akun 4.x/5.x dan aset tetap dari `settings.investment_asset_coas`, serta memetakan unit via kode `[9xxx]` dan `unit_aliases`.
Nilai realisasi dihitung sesuai BR-05 (Biaya: DEBET − KREDIT, Aset Tetap: DEBET satu sisi tanpa pengurangan kredit).
Batch diproses asinkron (respons `202 Accepted`), tersimpan berstatus PREVIEW, menolak konfirmasi dengan status 409 bila masih ada unit tak terpetakan, serta mendukung mode `replace_month` dan `append` (BR-19).
Seluruh mutasi status dan pemetaan alias unit tercatat lengkap pada `audit_logs`.

## 2. Migrasi Baru & Endpoint Baru
- Migrasi: `backend/migrations/007_realization_journal_enhancements.sql` (kolom progres/status pada `import_batches`, metadata baris pada `journal_lines`, tabel `realization_errors`, dan indeks pendukung).
- Endpoint:
  - `POST /api/realization-imports` (202 Accepted, upload latar belakang)
  - `GET /api/realization-imports` & `GET /api/realization-imports/:id` (pantau status & progres)
  - `GET /api/realization-imports/:id/unmapped-units` & `GET /api/realization-imports/:id/errors`
  - `PUT /api/unit-aliases` (upsert alias & otomatis remap baris PREVIEW)
  - `POST /api/realization-imports/:id/confirm` (409 Conflict bila ada unmapped unit)
  - `DELETE /api/realization-imports/:id` (rollback batch & hapus baris jurnalnya)
  - `GET /api/realizations` (agregasi COA, Unit, Bulan, Barang; filter fail-closed di repository)

## 3. Hasil Verifikasi
- Tes Vitest: 80 tes lulus dari 5 file test (100% lulus, 0 gagal). Rincian: 16 tes Realisasi Fase 6, 23 tes Dokumen Anggaran Biaya Fase 3, 20 tes Master Data Fase 2, 19 tes Auth & RBAC Fase 1, 2 tes Starter.
- Lint: 0 errors, 0 warnings pada seluruh berkas backend (`npm run lint`).
- Benchmark 600.000 baris (`benchmark_realization_stream.js`):
  - Total baris: 600.000 (File Excel 28.31 MB di disk)
  - Durasi baca & proses streaming: 10.64 detik (Throughput: 56.391 baris/detik)
  - Pemakaian memori: Heap Awal 12.09 MB, Peak Heap 33.54 MB, Heap Akhir 31.86 MB, Peak RSS 183.38 MB (jauh di bawah batas 300 MB).

## 4. Penyimpangan dari PRD, DECISIONS.md, dan Mockup
- Tidak ada penyimpangan. Header wajib divalidasi secara streaming sebelum batch dibuat agar klien langsung mendapatkan status 400 Bad Request yang informatif jika kolom header tidak lengkap.

## 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Akun aset tetap realisasi investasi dibaca dari tabel `settings` key `investment_asset_coas` (default: `['1.2.1.1.4', '1.2.1.1.6']`), bukan hardcoded.
- Ekstraksi ID barang pada baris bertanda "pemakaian" membaca angka di dalam tanda kurung pertama, misal: `(101)`.
- Jika baris tidak memiliki ID SUB JURNAL, sistem menggunakan fallback identifikasi `ROW-<nomor_baris>`.

## 6. Pertanyaan Terbuka & Risiko yang Diketahui
- Penentuan COA untuk barang baru yang muncul di baris pemakaian menunggu penugasan dari tim Akuntansi (BR-17/18).
- Potensi perbedaan penulisan teks unit di masa mendatang pada file jurnal perlu dimonitor lewat tabel `unit_aliases`.
