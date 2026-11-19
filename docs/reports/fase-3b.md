# Laporan Akhir Fase 3b: Permintaan Barang Baru & Penentuan COA

## 1. Ringkasan Hasil
Modul Permintaan Barang Baru (Fase 3b) berhasil diselesaikan pada backend dan frontend.
PIC/Manager dapat menyusun draft permintaan barang baru dan mengirimkannya ke Akuntansi (`MENUNGGU_COA`) disertai notifikasi otomatis.
Sesuai BR-17, barang baru tidak masuk ke total anggaran biaya sampai Akuntansi menentukan COA-nya.
Khusus Akuntansi (BR-18), disediakan antrean penetapan COA dan pembuatan barang otomatis di master `items`, pencatatan harga perusahaan awal di `item_prices` & `item_price_history`, serta penyisipan otomatis baris ke `expense_lines` jika dokumen masih DRAFT.
Seluruh perubahan dibungkus transaksi database atomis dan tercatat di `audit_logs`.

## 2. Migrasi Baru & Endpoint Baru
- Migrasi: `backend/migrations/008_new_item_requests_enhancements.sql` (mengubah `qty` menjadi `NUMERIC(14,2)`, menambahkan `manual_handling_note`, `version`, dan indeks pendukung).
- Endpoint:
  - `GET /api/budget-docs/:id/new-item-requests` (semua role, terisolasi unit)
  - `POST /api/budget-docs/:id/new-item-requests` (PIC/Manager unit, status DRAFT)
  - `PUT /api/new-item-requests/:id` (simpan otomatis / perbarui draft, ditolak jika bukan DRAFT)
  - `DELETE /api/new-item-requests/:id` (hapus draft, ditolak jika bukan DRAFT)
  - `POST /api/budget-docs/:id/new-item-requests/send` (DRAFT -> MENUNGGU_COA + notifikasi)
  - `GET /api/new-item-requests/queue` (antrean khusus Akuntansi)
  - `POST /api/new-item-requests/:id/assign-coa` (khusus Akuntansi, penetapan COA & master barang)

## 3. Hasil Verifikasi
- Tes Vitest: 88 tes lulus dari 6 file test (100% lulus, 0 gagal). Rincian: 8 tes Fase 3b (`newItemRequest.test.mjs`), 16 tes Realisasi Fase 6, 23 tes Dokumen Anggaran Fase 3, 20 tes Master Data Fase 2, 19 tes Auth & RBAC Fase 1, 2 tes Starter.
- Lint Backend: 0 errors, 0 warnings (`npm --prefix backend run lint`).
- Build Frontend: Sukses tanpa galat (`npm --prefix frontend run build`, built in 1.45s).
- REST Client: Tersedia di `docs/api/fase-3b.http`.

## 4. Penyimpangan dari PRD, DECISIONS.md, dan Mockup
- Tidak ada penyimpangan. Alur transisi status DRAFT -> MENUNGGU_COA -> COA_DITENTUKAN, penegakan BR-17, dan wewenang mutlak Akuntansi pada BR-18 diimplementasikan secara ketat.

## 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Kode barang otomatis yang digenerate sistem mengikuti format `BRG-0000X` (atau input kustom Akuntansi jika diisi) dan dijamin unik via pengecekan collision loop.
- Sumber riwayat perubahan harga (`item_price_history.source`) diset `'manual'` untuk menyesuaikan constraint `VARCHAR(20)`.
- Jika dokumen bukan DRAFT saat penetapan COA, sistem mengisi `manual_handling_note` dan mengirim notifikasi ke PIC.

## 6. Pertanyaan Terbuka & Risiko yang Diketahui
- Bila harga satuan riil yang ditetapkan Akuntansi jauh lebih tinggi dari estimasi PIC, unit mungkin memerlukan penyesuaian qty pada saat dokumen dibuka kembali untuk revisi (Fase 4/5).
