# Laporan Akhir Fase 7: Dashboard & Laporan

### 1. Ringkasan Hasil
Fase 7 mengimplementasikan seluruh endpoint Dashboard Monitoring dan Laporan Keuangan RKAP (Fase 7 saja). Seluruh kalkulasi agregasi (total RKAP, realisasi DEBET - KREDIT, persentase pemakaian, dan level ambang) dihitung murni di database PostgreSQL via SQL. Endpoint menyediakan rekapitulasi biaya per COA, ringkasan belanja modal investasi, rekap gabungan konsolidasi CN & CNH, serta matriks unit × COA terkelompok dengan dukungan ekspor lembar sebar Excel (.xlsx) profesional via ExcelJS.

### 2. Migrasi Baru & Endpoint Baru
- **Migrasi 011**: `011_reporting_and_dashboard_indexes.sql` (indeks komposit performa pada `budget_docs`, `units`, `coas`, `journal_lines`, dan `import_batches`).
- `GET /api/dashboard/summary` (ringkasan RKAP biaya & investasi, realisasi pemakaian, dan ambang dinamis).
- `GET /api/dashboard/progress` (distribusi unit per status dokumen dan daftar unit terlambat).
- `GET /api/dashboard/budget-vs-realization` (drill-down anggaran vs realisasi per `coa`, `unit`, atau `item`).
- `GET /api/reports/expense-by-coa` (rekapitulasi anggaran biaya per COA).
- `GET /api/reports/investment-summary` (ringkasan investasi per kategori/jenis atau per bulan rencana).
- `GET /api/reports/consolidated` (rekap gabungan konsolidasi CN & CNH dengan subtotal unit, perusahaan, grand total).
- `GET /api/reports/matrix` (matriks unit × COA terkelompok per Jenis COA dan instalasi, opsi `hide_empty=true`).
- `GET /api/reports/export` (ekspor file `.xlsx` via ExcelJS dengan tata letak, warna, format angka, dan auto-fit).

### 3. Hasil Verifikasi
- **Pengujian Otomatis**: 135 tes dari 9 berkas uji lulus 100% (0 gagal). Khusus `tests/dashboard_reports.test.mjs`: 20/20 tes lulus.
- **Linting**: `npm run lint` backend lulus 100% (0 errors, 0 warnings).
- **Rencana Kueri (EXPLAIN ANALYZE)**: Kueri Matriks Unit × COA = 0.218 ms; Kueri Rekap Konsolidasi = 0.126 ms.

### 4. Penyimpangan
- Ekspor format PDF (`format=pdf`) ditunda dan merespons 422 `PDF_EXPORT_DEFERRED` (dicatat di DECISIONS.md #87) untuk menjaga kesederhanaan stack tanpa dependensi headless browser / engine PDF biner berat di backend.
- Matriks Unit × COA menyembunyikan kolom COA kosong secara default (`hide_empty=true`) agar tampilan tabel dan file Excel tetap ergonomis dan tidak dipenuhi kolom kosong tanpa anggaran.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Tahun periode default diasumsikan 2027 bila parameter query `period_year` tidak dikirimkan.
- Realisasi belanja modal investasi diambil dari akun aset tetap (`1.2.1.1.%` dan settings `investment_asset_coas`) pada unit pemilik sesuai kaidah BR-05.
- Dokumen atau periode tanpa transaksi mengembalikan nilai `null` (bukan 0) agar antarmuka menampilkan keadaan kosong secara tepat.

### 6. Pertanyaan Terbuka & Risiko
- Pertanyaan PRD No. 16: Format spesifik laporan PDF resmi (bila kelak diwajibkan) perlu ditentukan apakah berbasis HTML-to-PDF atau template dokumen kaku.
- Risiko: Seiring pertambahan tahun buku transaksi jurnal, pembersihan cache atau partisi tabel `journal_lines` berkala dapat dipertimbangkan pada fase skala besar.
