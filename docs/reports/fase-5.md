# Laporan Akhir Fase 5: Workflow Approval, Kontrol Akses Pengajuan, dan Notifikasi

### 1. Ringkasan Hasil
Fase 5 berhasil menyelesaikan alur persetujuan dokumen anggaran (Biaya & Investasi) secara penuh.
Mesin status dokumen (DRAFT, DIAJUKAN, DISETUJUI, DIKEMBALIKAN, FINAL) terintegrasi dengan penjaga aturan Maker-Checker BR-07,
catatan pengembalian wajib BR-08, pembukaan kembali FINAL BR-06, kontrol akses pengajuan bertingkat fail-closed BR-10 & BR-12,
auto-return pembukaan revisi BR-14, penjadwal internal penutupan & pengingat batas waktu, serta notifikasi in-app.
Frontend menyajikan layar Antrian Validasi, Pengaturan Periode & Pengajuan, tombol Ajukan, banner akses, dan lonceng notifikasi.

### 2. Migrasi Baru & Endpoint Baru
- **Migrasi**: `backend/migrations/010_workflow_and_submission_access.sql` (indeks unik `uq_submission_access_period_unit_type`, indeks riwayat/komentar/notifikasi, default settings alur pengajuan).
- **Endpoint Baru**:
  - `POST /api/budget-docs/:id/submit`: Pengajuan dokumen (DRAFT/DIKEMBALIKAN -> DIAJUKAN).
  - `POST /api/budget-docs/:id/approve`: Persetujuan dokumen (DIAJUKAN -> DISETUJUI, penjaga Maker-Checker BR-07).
  - `POST /api/budget-docs/:id/return`: Pengembalian dokumen dengan catatan wajib (BR-08, auto-return BR-14).
  - `POST /api/budget-docs/:id/finalize` & `POST /api/budget-docs/finalize-bulk`: Pengesahan dokumen final oleh Akuntansi.
  - `POST /api/budget-docs/:id/reopen`: Pembukaan kembali dokumen FINAL dengan alasan wajib (BR-06).
  - `GET /api/budget-docs/:id/history`: Riwayat mutasi status dan telaah dokumen.
  - `GET /api/budget-docs/review-queue`: Antrian telaah dokumen bertingkat untuk Manager & Akuntansi.
  - `POST /api/budget-docs/:id/line-comments` & `GET /api/budget-docs/:id/line-comments`: Komentar telaah per baris anggaran.
  - `DELETE /api/line-comments/:id`: Hapus komentar baris milik sendiri.
  - `GET /api/budget-docs/:id/access`: Evaluasi status akses pengajuan efektif unit & jenis anggaran.
  - `POST /api/periods/:id/deadlines`: Konfigurasi tanggal batas pengisian & validasi periode.
  - `POST /api/periods/:id/toggle-submission`: Buka/tutup pengajuan periode (alasan wajib saat buka BR-12).
  - `GET /api/periods/:id/unit-access`: Matriks status akses seluruh unit pada periode.
  - `POST /api/periods/:id/units/:unitId/submission-access`: Override izin akses pengajuan unit spesifik.
  - `POST /api/periods/:id/bulk-submission-access`: Override izin akses pengajuan massal unit.
  - `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`: Manajemen notifikasi pengguna.

### 3. Hasil Verifikasi
- **Automated Tests**: 115 tests passed, 0 failed (8 test files, termasuk 18 tes komprehensif `workflow.test.mjs`).
- **Linter**: `npm --prefix backend run lint` bersih (0 errors, 0 warnings).
- **Frontend Build**: `npm --prefix frontend run build` sukses 100% tanpa error via Vite (914ms).

### 4. Penyimpangan dari PRD, DECISIONS.md, dan Mockup
- Tidak ada penyimpangan fungsional. Layar Proses > Antrian Validasi dan Pengaturan > Periode dan Pengajuan mematuhi mockup `05-antrian-validasi` dan `06-periode-pengajuan`.

### 5. Hal yang Diasumsikan atau Ditulis Langsung di Kode
- Tugas terjadwal auto-close dan reminder diimplementasikan via `setInterval` internal Node.js (`scheduler.service.js`) tanpa pg-boss eksternal untuk menjaga kesederhanaan stack.
- Submit ulang dokumen yang berstatus DIKEMBALIKAN otomatis menutup kembali baris override izin `source = 'AUTO_RETURN'` pada unit tersebut.
- Pengajuan dokumen oleh Manager pada unitnya sendiri diizinkan, tetapi persetujuan dokumen tersebut wajib didelegasikan ke Akuntansi (BR-07).

### 6. Pertanyaan Terbuka & Risiko
- **Pertanyaan Terbuka**: Mekanisme hierarki persetujuan bertingkat jika suatu unit memiliki lebih dari satu Manager aktif di masa depan.
- **Risiko**: Bila server di-restart, jadwal pengingat H-3/H-1 berbasis waktu berjalan kembali pada interval berikutnya tanpa kehilangan data di PostgreSQL.
