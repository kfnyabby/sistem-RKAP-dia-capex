# Laporan Akhir Fase 3d: Display Anggaran Biaya & Investasi Lintas Dokumen

### 1. Ringkasan Hasil
Fase 3d mengimplementasikan endpoint backend untuk tampilan lintas dokumen (Display Anggaran Biaya dan Display Anggaran Investasi) serta ekspor lembar kerja Excel (.xlsx). Endpoint mendukung filter multi-unit, status dokumen, kelompok & akun COA, rentang bulan realisasi berjalan (debet - kredit), pencarian teks, dan paginasi yang menyertakan kalkulasi totals untuk keseluruhan hasil filter (bukan hanya halaman aktif). Otorisasi menerapkan fail-closed unit scoping di level repository di mana PIC dan Manager hanya dapat melihat data unit cakupan mereka, sedangkan Akuntansi dapat melihat seluruh unit.

### 2. Migrasi Baru & Endpoint Baru
- **Migrasi**: Tidak ada migrasi baru (memanfaatkan skema tabel yang sudah ada).
- `GET /api/expense-lines`: Baris biaya lintas unit & dokumen dengan filter (`period_id`, `unit_id`, `doc_status`, `coa_group_id`, `coa_id`, `search`, `month_from`, `month_to`, `page`, `per_page`), realisasi per barang dari jurnal `CONFIRMED`, dan kalkulasi `totals` (`total_rkap`, `total_realization`, `total_units`, `total_lines`).
- `GET /api/investment-lines`: Diperluas dengan scoping unit untuk PIC dan Manager, filter multi-unit, `doc_status`, `category_id`, `priority_id`, `search`, kompatibilitas `is_laptop_pc=true`, dan kalkulasi `totals` (`total_amount`, `total_depreciation`, `total_units`, `total_lines`).
- `GET /api/reports/export?report=display-biaya&format=xlsx`: Ekspor Excel data baris biaya lengkap beserta total dan persentase pemakaian.
- `GET /api/reports/export?report=display-investasi&format=xlsx`: Ekspor Excel data baris investasi lengkap beserta total investasi dan beban penyusutan.

### 3. Hasil Verifikasi
- **Pengujian Otomatis**: 16/16 tes pada `tests/display.test.mjs` lulus 100% (0 gagal).
- **Pengujian Regresi**: Seluruh 23/23 tes `tests/expense.test.mjs` dan 16/16 tes `tests/investment.test.mjs` lulus.
- **Scoping & Security**: Fail-closed verifikasi: user tanpa unit menerima data kosong dan total 0; user lain tidak dapat melihat unit di luar hak aksesnya.

### 4. Penyimpangan
- Tidak ada penyimpangan dari PRD maupun arahan Fase 3d. Format respons konsisten menggunakan `{ success: true, data, meta, totals }` dengan HTTP status yang tepat.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Realisasi per barang pada `GET /api/expense-lines` bernilai `null` (bukan 0) jika tidak ditemukan transaksi jurnal berstatus `CONFIRMED` pada unit dan barang tersebut (sesuai aturan B9: larangan angka karangan).
- Ekspor Excel menggunakan batasan `per_page: 100000` untuk mengekspor seluruh hasil filter pengguna tanpa terpotong paginasi layar.

### 6. Pertanyaan Terbuka & Risiko
- Seiring pertumbuhan volume `journal_lines`, lateral query agregasi realisasi per item dapat ditingkatkan performanya dengan materialisasi rekap bulanan jika transaksi mencapai ratusan ribu baris.
