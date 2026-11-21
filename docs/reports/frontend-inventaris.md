# Laporan Inventaris Berkas Frontend Pra-F0

Dokumen ini mencatat seluruh berkas di direktori `frontend/src` yang dibuat sebelum fase migrasi antarmuka (F0) dan belum menggunakan komponen atau styling `mockup.css`.

---

## 1. Tabel Inventaris Berkas

| No | Berkas | Fungsinya | Layar Mockup Penggantinya | Logika Masih Berguna (API, Validasi, Hook) | Masih Diimpor Rute Aktif | Tindakan |
|:--:|---|---|---|---|:---:|:---:|
| 1 | `pages/MasterDataPage.jsx` | Wrapper layar master data lama berbasis Tailwind | `11-master-data.html` (`PengaturanMasterPage.jsx`) | **Tidak** — Hanya membungkus `MasterDataView`. | Tidak | **Dihapus** |
| 2 | `components/master/MasterDataView.jsx` | Komponen 6 tab master data lama berbasis Tailwind (Barang, COA, Kategori, Unit) | `11-master-data.html` (`PengaturanMasterPage.jsx`) | **Tidak** — Logika integrasi API sudah ditulis ulang secara bersih di `PengaturanMasterPage.jsx` dan modal-modal baru. | Tidak | **Dihapus** |
| 3 | `components/master/ImportModal.jsx` | Modal dialog import spreadsheet master lama berbasis Lucide + Tailwind | `11-master-data.html` (`MasterImportDialog.jsx`) | **Tidak** — Seluruh alur dry_run dan parsing sudah digantikan oleh `MasterImportDialog.jsx`. | Tidak | **Dihapus** |
| 4 | `pages/PengaturanPage.jsx` | Shell tab navigasi pengaturan sistem lama (Master, Periode, Users, Ambang, Audit) | Rute modular `/pengaturan/*` (`PengaturanMasterPage`, `PengaturanPenggunaPage`, dll.) | **Tidak** — Sub-halaman sudah dipisah menjadi rute mandiri yang terproteksi role. | Tidak | **Dihapus** |
| 5 | `pages/EntryPage.jsx` | Layar monolitik usulan anggaran biaya, pengajuan belanja modal, dan penambahan barang baru | `03-entry-biaya.html` (`EntryBiayaPage.jsx`) | **Ya** — Menghitung sebaran bulanan, penanganan draft usulan, validasi status submit dokumen, dan kalkulasi total dokumen. | Tidak (Rute aktif saat ini placeholder) | **Dipertahankan** |
| 6 | `components/entry/InvestmentForm.jsx` | Formulir entry usulan belanja modal investasi lama | `04-entry-investasi.html` (`EntryInvestasiPage.jsx`) | **Ya** — Validasi ambang batas investasi Rp 5.000.000 (BR-01), penentuan COA susut otomatis (BR-15), dan kalkulasi beban penyusutan tahun berjalan (BR-16). | Tidak | **Dipertahankan** |
| 7 | `components/entry/InvestmentTable.jsx` | Tabel rincian belanja modal investasi lama | `04-entry-investasi.html` (`EntryInvestasiPage.jsx`) | **Ya** — Agregasi akumulasi nilai investasi dan kalkulasi penyusutan bulanan per unit kerja. | Tidak | **Dipertahankan** |
| 8 | `components/entry/NewItemRequestsSection.jsx` | Antarmuka PIC unit untuk mengajukan usulan barang baru ke Akuntansi | Bagian dari `03-entry-biaya.html` (`EntryBiayaPage.jsx`) | **Ya** — Penyusunan draft item baru, validasi status DRAFT dokumen anggaran, dan alur pengiriman ke Akuntansi (`MENUNGGU_COA`). | Tidak | **Dipertahankan** |
| 9 | `components/investment/LaptopPcView.jsx` | Antarmuka telaah standardisasi spesifikasi dan rasio kebutuhan PC/Laptop unit | `05-laptop-pc.html` (`LaptopPcPage.jsx`) | **Ya** — Kalkulasi rasio unit eksisting terhadap pegawai, limit anggaran per kategori laptop/desktop. | Tidak | **Dipertahankan** |
| 10 | `pages/ProsesPage.jsx` | Shell navigasi tab proses kerja (Validasi Dokumen, Input Realisasi, Penentuan COA) | `06-validasi.html`, `07-telaah-dokumen.html`, `08-realisasi.html` | **Ya** — Manajemen filter tab proses kerja dan passing context peran pengguna. | Tidak | **Dipertahankan** |
| 11 | `components/proses/ValidationQueueSection.jsx` | Antrian dokumen RKAP yang menunggu telaah dan pengesahan Manager/Akuntansi | `06-validasi.html` (`ValidasiPage.jsx`) | **Ya** — Filter dokumen berstatus `SUBMITTED` dan `REVISED`, pencarian, dan paginasi antrian. | Tidak | **Dipertahankan** |
| 12 | `components/proses/DocReviewModal.jsx` | Dialog modal telaah rincian anggaran biaya dan investasi sebelum disetujui/dikembalikan | `07-telaah-dokumen.html` | **Ya** — Logika penolakan/pengembalian revisi dengan catatan (BR-14), persetujuan bertingkat (BR-07, BR-12), dan audit trail review. | Tidak | **Dipertahankan** |
| 13 | `components/proses/PenentuanCoaSection.jsx` | Antrian Akuntansi untuk menetapkan COA barang baru yang diajukan unit | `07-telaah-dokumen.html` (Tab Penentuan COA) | **Ya (Kritis)** — Memuat aturan bisnis BR-17 dan BR-18 (`POST /api/new-item-requests/:id/assign-coa`), penetapan kode produk, pemilihan COA beban, dan pembuatan otomatis master barang di katalog. | Tidak | **Dipertahankan** |
| 14 | `pages/LaporanPage.jsx` | Shell halaman laporan keuangan lama (Laporan Rekapitulasi & Laporan Matriks 12 Bulan) | `09-laporan-rekap.html` & `10-laporan-matriks.html` | **Ya** — Pengelompokan agregasi COA operasional dan pemecahan matriks anggaran bulanan (Jan–Des). | Tidak | **Dipertahankan** |
| 15 | `components/pengaturan/PeriodSubmissionSection.jsx` | Komponen pengaturan jadwal pengisian anggaran, batas waktu telaah, dan kunci unit | `06-periode-pengajuan.html` (`PengaturanPeriodePage.jsx`) | **Tidak** — Seluruh logika API dan validasi telah dipindahkan ke `PengaturanPeriodePage.jsx` dengan TanStack Query. | Tidak | **Dihapus** |

---

## 2. Catatan Khusus Logika Bisnis yang Wajib Dijaga

### A. Logika Penentuan COA (`assign-coa` pada `PenentuanCoaSection.jsx`)
Komponen ini mengimplementasikan aturan bisnis krusial Fase 3b:
- **BR-17**: Usulan barang baru yang diajukan unit berstatus `MENUNGGU_COA` dan **tidak masuk ke total anggaran biaya unit** sampai Akuntansi menentukan nomor akun COA-nya.
- **BR-18**: Akuntansi memiliki hak mutlak menetapkan:
  - Kode barang baru (atau generate otomatis format `BRG-0000X`).
  - Akun COA beban operasional.
  - Harga satuan standar yang dicatat ke `item_prices` dan `item_price_history`.
  - Endpoint pemanggilan: `POST /api/new-item-requests/:id/assign-coa` dengan payload `{ coa_id, code, price, manual_handling_note }`.
- **Status Transisi**: Bila dokumen anggaran masih berstatus `DRAFT`, sistem otomatis menyisipkan item tersebut ke `expense_lines` dokumen. Bila sudah bukan `DRAFT`, sistem mencatat `manual_handling_note` agar unit dapat menindaklanjutinya saat siklus revisi. Logika ini akan dipindahkan apa adanya saat pembangunan antarmuka `07-telaah-dokumen.html`.

### B. Komponen Validasi Dokumen Anggaran (`ValidationQueueSection.jsx` & `DocReviewModal.jsx`)
- Mengakomodasi penegakan **BR-07**: Pengaju (PIC unit) ditolak saat mencoba menyetujui dokumen yang diajukannya sendiri.
- Mengakomodasi **BR-12**: Dokumen berstatus `FINAL` terkunci secara permanen dan tidak dapat diubah oleh siapapun.
- Mengakomodasi **BR-14**: Pengembalian dokumen usulan oleh Manager atau Akuntansi otomatis membuka kembali akses pengeditan unit selama batas waktu validasi (*review deadline*) belum terlewati.

### C. Komponen Usulan Belanja Modal / Investasi (`InvestmentForm.jsx` & `InvestmentTable.jsx`)
- Mengakomodasi **BR-01**: Nilai barang harus lebih besar dari ambang investasi (`min_investment_amount`, default Rp 5.000.000). Barang dengan harga di bawah ambang otomatis dialihkan ke anggaran biaya belanja barang (OPEX).
- Mengakomodasi **BR-15**: Akun COA aset tetap dan akumulasi penyusutan, serta masa manfaat (tahun) diambil otomatis berdasarkan Kategori Investasi yang dipilih.
- Mengakomodasi **BR-16**: Rumus beban penyusutan tahun berjalan:
  $$\text{Beban Penyusutan} = \frac{\text{Jumlah}}{\text{Masa Manfaat}} \times \frac{12 - \text{Bulan Rencana}}{12} \quad (\text{Januari} = 1)$$
- Komponen ini tetap aman tersimpan di `frontend/src/components/entry/` sampai tiba giliran pembangunan layar `04-entry-investasi.html`.

---

## 3. Rekomendasi Pembersihan
1. **Sudah Dihapus**: Berkas no. 1, 2, 3, 4 (`MasterDataPage.jsx`, `MasterDataView.jsx`, `ImportModal.jsx`, `PengaturanPage.jsx`), dan no. 15 (`PeriodSubmissionSection.jsx`) karena sudah sepenuhnya terintegrasi pada layar pengganti (`PengaturanMasterPage.jsx`, `PengaturanPenggunaPage.jsx`, dan `PengaturanPeriodePage.jsx`).
2. **Pertahankan Penuh**: Berkas no. 5 s.d. 14 tetap dipertahankan sampai masing-masing layar mockup penggantinya dikerjakan satu per satu sesuai instruksi bertahap pemilik proyek.
