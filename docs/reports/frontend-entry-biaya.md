# Laporan Implementasi Layar Entry Anggaran Biaya (`/entry/biaya`)

### 1. Ringkasan Hasil
Layar Entry Anggaran Biaya telah dibangun di rute `/entry/biaya` sesuai struktur dan styling mockup `02-entry-biaya.html`.
Seluruh pengambilan dan manipulasi data telah dimigrasikan ke TanStack Query dengan data riil dari backend.
Fitur utama meliputi pemilih unit, filter berurutan, tabel berurutan bernomor, edit Qty inline dengan debounce auto-save, penanganan bentrok versi (409), kolom realisasi dari jurnal, dialog "Tambah dari master", "Perbarui harga", banner akses dan deadline, catatan pengembalian, serta kartu permintaan barang baru PIC.
Komponen usang `NewItemRequestsSection.jsx` telah dihapus dan logikanya dipindahkan secara bersih ke `NewItemRequestPicCard.jsx`.

### 2. Berkas & Endpoint Baru yang Digunakan
- **Berkas Baru/Diubah**:
  - `frontend/src/pages/EntryBiayaPage.jsx` (halaman utama).
  - `frontend/src/components/entry/NewItemRequestPicCard.jsx` (kartu permintaan barang baru PIC).
  - `frontend/src/components/entry/AddMasterItemDialog.jsx` (dialog tambah barang master).
  - `frontend/src/components/entry/RefreshPriceConfirmDialog.jsx` (modal konfirmasi perbarui harga).
  - `frontend/src/api/realization.api.js` (klien API realisasi jurnal).
  - `frontend/src/components/entry/NewItemRequestsSection.jsx` (dihapus).
- **Endpoint API Nyata yang Dipanggil**:
  - `GET /api/units`, `GET /api/periods`, `GET /api/coa-groups`, `GET /api/coas`
  - `GET /api/budget-docs`, `POST /api/budget-docs`
  - `GET /api/budget-docs/:id/access`
  - `GET /api/budget-docs/:id/history`, `POST /api/budget-docs/:id/submit`
  - `GET /api/budget-docs/:id/expense-lines`, `PUT /api/budget-docs/:id/expense-lines`, `DELETE /api/expense-lines/:id`
  - `POST /api/budget-docs/:id/refresh-prices`
  - `GET /api/items?available_for_doc=:id`
  - `GET /api/realizations?group_by=item&unit_id=...&start_month=...&end_month=...`
  - `GET /api/budget-docs/:id/new-item-requests`, `POST /api/budget-docs/:id/new-item-requests`, `DELETE /api/new-item-requests/:id`, `POST /api/budget-docs/:id/new-item-requests/send`

### 3. Hasil Verifikasi
- **Lint**: 0 errors, 24 warnings (seluruh berkas baru lulus bersih tanpa error/warning; warning tersisa berasal dari komponen pre-F0).
- **Build**: Vite production build sukses (`built in 2.01s`, `dist/assets/index-DR-NSKhU.js`).
- **Verifikasi Visual**: Pembandingan visual otomatis via Chrome DevTools tidak dapat tersambung karena browser tidak dijalankan dengan port remote debugging (`--remote-debugging-port=9222`). Pembandingan visual dilakukan via penyesuaian struktural dan token CSS mockup `02-entry-biaya.html` pada resolusi 1280px (styling `mockup.css`, kelas `.app`, `.mn`, `.hd`, `.card`, `.sc`, `.chip`, `.btn`, tabel responsif).

### 4. Penyimpangan dari Mockup / PRD
- Mockup statis menampilkan chip "Data contoh" dan data tiruan hardcoded; pada implementasi ini dihapus dan digantikan data riil dari TanStack Query serta penanganan empty state dan loading.
- Subtotal total per dokumen ditampilkan di footer tabel dan baris bawah untuk mempermudah PIC melihat pagu anggaran tanpa harus menghitung manual.

### 5. Hal yang Diasumsikan / Ditulis Langsung di Kode
- Default rentang bulan realisasi diatur dari bulan `01` (Januari) sampai `10` (Oktober), mengikuti label pada mockup `02-entry-biaya.html`.
- Jika dokumen anggaran belum ada untuk unit dan periode yang dipilih, sistem menampilkan empty state ramah dengan tombol inisialisasi `+ Buat Draft Anggaran Biaya`.

### 6. Pertanyaan Terbuka & Risiko
- Realisasi per barang bergantung pada keterbacaan kode barang di deskripsi jurnal (FR-R4). Bila tabel jurnal belum memiliki data pemakaian terkait item, kolom menampilkan `—`.
