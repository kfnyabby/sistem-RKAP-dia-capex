# Laporan Audit Menyeluruh Sistem RKAP (DIA CAPEX) CN dan CNH

Dokumen ini disusun sebagai hasil audit komprehensif terhadap seluruh arsitektur kode backend, antarmuka frontend, skema basis data, matriks keamanan, dan spesifikasi kontrak API.

---

## 1. Daftar Endpoint di Kode Beserta Bedanya dengan Dokumen PDF

Backend saat ini menyediakan **83 route aktif** (mencakup 110 operasi HTTP). Rincian perbandingan dengan spesifikasi `docs/PRD_Sistem_RKAP_DIA_CAPEX.pdf` (Hal. 10–55 dan Ringkasan Hal. 56–68):

| Modul | Endpoint di Kode | Perbedaan dengan PDF | Keterangan & Keputusan |
|---|---|---|---|
| **Auth** | `GET /api/auth/csrf`<br>`POST /api/auth/login`<br>`POST /api/auth/logout`<br>`GET /api/auth/me`<br>`PUT /api/auth/password` | Sesuai PDF | Dilengkapi rate limiter 5 percobaan/15 menit dan regenerasi sesi saat login. |
| **Users** | `GET /api/users`<br>`POST /api/users`<br>`GET /api/users/:id`<br>`PUT /api/users/:id`<br>`PATCH /api/users/:id/status`<br>`PUT /api/users/:id/units`<br>`POST /api/users/:id/reset-password` | `POST /users/:id/reset-password` adalah endpoint baru (tidak ada di PDF) | Ditambahkan pada Fase 1c agar tim Akuntansi dapat mereset kata sandi pengguna tanpa self-service reset. |
| **Master Data** | `GET /api/items`<br>`POST /api/items`<br>`GET /api/items/:id`<br>`PUT /api/items/:id`<br>`DELETE /api/items/:id`<br>`PATCH /api/items/:id/status`<br>`PATCH /api/items/:id/prices`<br>`POST /api/items/import`<br>`GET /api/items/quality-report`<br>`GET /api/items/:id/price-history` | - `DELETE /items/:id` baru.<br>- `PATCH /items/:id/prices` menggantikan `PUT /items/:id/prices` di PDF.<br>- `GET /items/quality-report` & `price-history` baru. | - Penghapusan master barang diverifikasi integritas relasionalnya.<br>- Arsitektur harga master satu harga per perusahaan tanpa periode (Migrasi 006, DECISIONS #56). |
| **COA & Kelompok** | `GET /api/coas`<br>`POST /api/coas`<br>`GET /api/coas/:id`<br>`PUT /api/coas/:id`<br>`DELETE /api/coas/:id`<br>`GET /api/coa-groups`<br>`POST /api/coas/import` | `DELETE /coas/:id` baru | Import COA mendukung 3 sheet sekaligus (Master COA, Kategori Biaya, Kategori Investasi) sesuai FR-M7. |
| **Unit & Ref** | `GET /api/units`<br>`POST /api/units`<br>`PUT /api/units/:id`<br>`DELETE /api/units/:id`<br>`POST /api/units/import`<br>`GET /api/reference-data`<br>`GET /api/unit-aliases`<br>`PUT /api/unit-aliases` | - Di PDF ada `GET /companies`, `GET/POST /org-groups`. Di kode digabung ke `GET /reference-data`.<br>- `POST /units/import` dan `DELETE /units/:id` baru. | - Penggabungan data referensi menghemat round-trip HTTP.<br>- Import draf master unit mendukung pencocokan `source_key` dan deteksi `needs_review`. |
| **Investasi (Master)** | `GET /api/investment-categories`<br>`PUT /api/investment-categories/:id`<br>`GET /api/priorities` | Sesuai PDF | Sesuai BR-15, akun beban susut dan masa manfaat ditarik otomatis dari master kategori. |
| **Periode & Akses** | `GET /api/periods`<br>`POST /api/periods`<br>`PUT /api/periods/:id`<br>`PATCH /api/periods/:id/submission`<br>`POST /api/periods/:id/submission/bulk`<br>`GET /api/budget-docs/:id/access`<br>`GET /api/submission-access`<br>`POST /api/submission-access`<br>`PUT /api/submission-access/:id`<br>`DELETE /api/submission-access/:id` | PDF memakai path `/periods/{id}/units/{unit_id}/submission`. Kode menggunakan entitas terdedikasi `submission-access`. | Memberikan ID unik pada setiap baris pengecualian unit dan mendukung pembukaan otomatis dokumen revisi (BR-14). |
| **Biaya (OPEX)** | `GET /api/budget-docs`<br>`POST /api/budget-docs`<br>`GET /api/budget-docs/:id`<br>`POST /api/budget-docs/:id/refresh-prices`<br>`GET /api/budget-docs/:id/expense-lines`<br>`PUT /api/budget-docs/:id/expense-lines`<br>`DELETE /api/expense-lines/:id`<br>`GET /api/budget-docs/:id/expense-lines/available-items`<br>`GET /api/budget-docs/:id/expense-lines/summary` | - `POST .../refresh-prices` baru.<br>- `GET .../available-items` & `.../summary` baru. | - Sinkronisasi harga snapshot manual untuk dokumen DRAFT (BR-03, DECISIONS #57).<br>- Dialog modal tambah dari master dioptimalkan tanpa memuat ribuan baris kosong. |
| **Barang Baru** | `GET /api/budget-docs/:id/new-item-requests`<br>`POST /api/budget-docs/:id/new-item-requests`<br>`PUT /api/new-item-requests/:id`<br>`DELETE /api/new-item-requests/:id`<br>`POST /api/budget-docs/:id/new-item-requests/send`<br>`GET /api/new-item-requests/queue`<br>`POST /api/new-item-requests/:id/assign-coa` | Sesuai PDF | Penetapan COA otomatis membuat master barang, mencatat riwayat harga, dan mengaitkan ke baris biaya jika dokumen DRAFT (BR-17, BR-18). |
| **Investasi (CAPEX)** | `GET /api/budget-docs/:id/investment-lines`<br>`POST /api/budget-docs/:id/investment-lines`<br>`PUT /api/investment-lines/:id`<br>`DELETE /api/investment-lines/:id`<br>`GET /api/investment-lines` (laptop-pc)<br>`GET .../investment-lines/suggestions`<br>`GET .../investment-lines/last-text` | - `GET /investment-lines?is_laptop_pc=true` baru.<br>- `suggestions` & `last-text` baru. | - Konsolidasi pengadaan laptop/PC terpusat (Mockup 15).<br>- Autocomplete saran teks 4 kolom justifikasi strategis. |
| **Workflow** | `POST /api/budget-docs/:id/submit`<br>`POST /api/budget-docs/:id/approve`<br>`POST /api/budget-docs/:id/return`<br>`POST /api/budget-docs/:id/finalize`<br>`POST /api/budget-docs/finalize-bulk`<br>`POST /api/budget-docs/:id/reopen`<br>`GET /api/budget-docs/:id/history`<br>`GET /api/review-queue`<br>`GET/POST .../lines/:lineType/:lineId/comments`<br>`DELETE /api/line-comments/:id` | PDF memakai `/budget-docs/{id}/comments`. Kode menerapkan komentar per baris (`lines/.../comments`). | Diskusi reviewer terikat langsung pada baris anggaran biaya atau investasi spesifik. |
| **Realisasi** | `POST /api/realization-imports`<br>`GET /api/realization-imports`<br>`GET /api/realization-imports/:id`<br>`POST /api/realization-imports/:id/confirm`<br>`DELETE /api/realization-imports/:id`<br>`GET /api/realization-imports/:id/errors`<br>`GET /api/realization-imports/:id/unmapped-units`<br>`GET /api/realizations` | `GET .../unmapped-units` baru | Mencegah penolakan 409 saat konfirmasi batch dengan menyediakan daftar unit yang belum terpetakan. |
| **Dashboard** | `GET /api/dashboard/summary`<br>`GET /api/dashboard/progress`<br>`GET /api/dashboard/budget-vs-realization` | Sesuai PDF | Agregasi 100% di level SQL; nilai kosong dikembalikan sebagai `null` (bukan 0 karangan). |
| **Laporan** | `GET /api/reports/expense-by-coa`<br>`GET /api/reports/investment-summary`<br>`GET /api/reports/consolidated`<br>`GET /api/reports/matrix`<br>`GET /api/reports/export` | Sesuai PDF | Ekspor spreadsheet XLSX lengkap; format PDF ditunda resmi (kode 422 PDF_EXPORT_DEFERRED). |
| **Notifikasi** | `GET /api/notifications`<br>`PATCH /api/notifications/:id/read`<br>`POST /api/notifications/read-all` | PDF memakai `POST /notifications/read`. | Pembaruan status pesan menggunakan verb PATCH & penambahan fungsi baca semua. |
| **Audit & Settings** | `GET /api/settings`<br>`PUT /api/settings`<br>`GET /api/audit-logs` | Sesuai PDF | Scoping unit manajerial pada audit log (Manager terbatas unitnya, PIC ditolak 403). |
| **Sistem & OpenAPI** | `GET /api/health`<br>`GET /api/test-db`<br>`GET /api/docs/openapi.yaml`<br>`GET /api/docs/openapi.json` | Endpoint baru (infrastruktur) | Healthcheck dan penyajian spesifikasi kontrak OpenAPI publik. |

---

## 2. Klasifikasi Format Respons Endpoint: Array vs `{ data }` vs `{ data, meta }`

Tinjauan struktur respons daftar (list) dan tindakan standardisasi yang telah diterapkan:

### A. Endpoint yang Mengembalikan Plain Array (`[...]`)
1. **`GET /api/periods`**: Mengembalikan array murni `[ { id, year, ... } ]`.
   - *Alasan tidak diubah*: Pengujian unit `backend/tests/expense.test.mjs:139` secara eksplisit memeriksa `expect(Array.isArray(res.body)).toBe(true)`. Selain itu komponen `ValidasiPage.jsx:64` langsung melakukan binding `periods = periodsQuery.data || []`. Mengubah endpoint ini akan mematahkan kontrak frontend dan test runner.
2. **`GET /api/reports/expense-by-coa`**: Mengembalikan array baris akun biaya.
3. **`GET /api/reports/investment-summary`**: Mengembalikan array agregasi kategori investasi.

### B. Endpoint yang Mengembalikan `{ data: [...] }` Sederhana (Tanpa Paginasi)
1. **`GET /api/budget-docs/:id/new-item-requests`**: `{ success: true, data: [...] }`
2. **`GET /api/budget-docs/:id/lines/:lineType/:lineId/comments`**: `{ success: true, data: [...] }`
3. **`GET /api/items/:id/price-history`**: `{ success: true, data: [...] }`
4. **`GET /api/budget-docs/:id/investment-lines/suggestions`**: `{ success: true, field: "...", data: [...] }`

### C. Endpoint yang Telah Diseragamkan Menjadi `{ data, meta }`
Perbaikan yang diminta telah diimplementasikan secara aman tanpa merusak frontend:
1. **`GET /api/units`**: Kini mengembalikan `{ data: units, meta: { total } }` (diperbarui di `master.controller.js`).
2. **`GET /api/coa-groups`**: Kini mengembalikan `{ data: groups, meta: { total } }` (diperbarui di `master.controller.js`).
3. **`GET /api/investment-categories`**: Kini mengembalikan `{ data: categories, meta: { total } }` (diperbarui di `master.controller.js`).
4. **`GET /api/priorities`**: Kini mengembalikan `{ success: true, data, meta: { total } }` (diperbarui di `investment.controller.js`).
5. **`GET /api/audit-logs`**: Menambahkan properti `meta` (`page`, `limit`, `total`, `total_pages`) mendampingi properti `pagination` yang sudah ada (diperbarui di `auditLog.controller.js`).
6. **Endpoint yang sudah memakai `{ data, meta }` sejak awal**:
   - `GET /api/items`: `{ data: [...], meta: { page, per_page, total, total_pages } }`
   - `GET /api/coas`: `{ data: [...], meta: { page, per_page, total, total_pages } }`
   - `GET /api/users`: `{ data: [...], meta: { page, per_page, total } }`
   - `GET /api/budget-docs`: `{ data: [...], meta: { page, per_page, total } }`
   - `GET /api/budget-docs/:id/expense-lines`: `{ data: [...], meta: { page, per_page, total } }`
   - `GET /api/budget-docs/:id/investment-lines`: `{ success: true, data: [...], meta: {...}, summary, doc }`
   - `GET /api/investment-lines`: `{ success: true, data: [...], meta: {...}, total_all_investment }`
   - `GET /api/new-item-requests/queue`: `{ success: true, data: [...], meta: { total, page, per_page } }`
   - `GET /api/realization-imports`: `{ success: true, data: [...], meta: {...} }`
   - `GET /api/realization-imports/:id/errors`: `{ success: true, data: [...], meta: {...} }`

---

## 3. Inventaris Nilai yang Ditulis Langsung (Hardcoded Values)

Daftar jujur seluruh nilai statis yang ditemukan di backend dan frontend:

### A. Hardcoded ID
- **Backend**:
  - `backend/src/services/dashboard.service.js:29`: `companyId ? parseInt(companyId, 10) : period ? period.company_id : 1;` (fallback ID perusahaan bernilai `1` jika tidak ada filter dan periode tidak ditemukan).
- **Frontend**:
  - `frontend/src/components/common/PageHeader.jsx:21`: `return [{ company_id: 1, code: 'CN', name: 'PT Cipta Nirmala (CN)' }];` (fallback statis bila query reference-data belum terisi).
  - `frontend/src/components/master/UnitFormModal.jsx:10`: `company_id: 1` (default nilai form penambahan unit baru).

### B. Hardcoded Bulan & Siklus Anggaran
- **Backend**:
  - `backend/src/services/investmentBudget.service.js:77` & `report.repository.js:203`: Rumus beban penyusutan berjalan $\text{ROUND}(\text{Jumlah} \div \text{Masa Manfaat} \times (12 - \text{Bulan Rencana}))$, dengan konstanta batas 12 bulan sesuai aturan BR-16.
- **Frontend**:
  - `frontend/src/pages/EntryBiayaPage.jsx` & `EntryInvestasiPage.jsx`: Array statis `MONTHS = [1..12]` yang memetakan label "Jan" sampai "Des".

### C. Hardcoded Ambang (Thresholds)
- **Backend**:
  - `rateLimiter.js:25`: Ambang `300` request/menit untuk rate limiter produksi.
  - `investmentBudget.service.js:100, 285`: Fallback nilai ambang `5000000` (Rp 5.000.000) bila kunci `investment_threshold` belum ada di tabel `settings`.
  - `investmentBudget.service.js:119, 304`: Fallback panjang teks `300` karakter bila kunci `investment_text_max_length` belum ada di tabel `settings`.
  - `dashboard.repository.js:186-187` & `dashboard.service.js:65-66`: Fallback batas peringatan `warning = 80` dan `critical = 100` bila tabel `settings` belum terkonfigurasi.
- **Frontend**:
  - `LaporanRekapPage.jsx:261, 303, 342, 367`: Batas penentuan warna chip: `> 100` (Merah/Melebihi), `> 80` (Kuning/Waspada), `<= 80` (Hijau/Aman).
  - `EntryInvestasiPage.jsx:78, 82`: Fallback lokal counter karakter `300` dan ambang kapitalisasi `5000000`.

### D. Hardcoded Fallbacks (Tahun Periode Default)
- **Backend**:
  - `backend/src/services/reportExport.service.js:290, 423`: `query.period_year || 2027` (tahun default untuk header export Excel).
  - `backend/src/repositories/report.repository.js:70, 91`: `periodYear = query.period_year ? parseInt(query.period_year, 10) : 2027;`.
- **Frontend**:
  - `PageHeader.jsx:34` & `DashboardPage.jsx:46`: `localStorage.getItem('rkap_selected_period') || '2027'`.
  - `PenentuanCoaPage.jsx:374`: `selectedReq.period_year || '2027'`.

---

## 4. Evaluasi Pengujian Keamanan Endpoint Mutasi Data

Dari total **41 endpoint mutasi** (`POST`, `PUT`, `PATCH`, `DELETE`), matriks pengujian keamanan (`backend/tests/security_matrix.test.mjs`) telah memverifikasi sampel representatif, namun pengujian negatif spesifik belum mencakup 100% rute secara granular:

1. **Celah Uji Akses Tanpa Login (401 Unauthorized)**:
   - Meskipun middleware `requireAuth` dipasang global di tingkat router, baru 3 endpoint mutasi yang diuji secara eksplisit tanpa sesi (`PUT /expense-lines`, `POST /submit`, `PUT /settings`).
   - Sebanyak 38 endpoint mutasi lain (termasuk `POST /items`, `POST /coas`, `POST /units`, `DELETE /expense-lines/:id`, `POST /budget-docs/:id/approve`) belum memiliki unit test negatif terdedikasi untuk unauthenticated access.
2. **Celah Uji Peran yang Salah (403 Forbidden - Broken Function Level Authorization)**:
   - Pengujian role telah memverifikasi PIC tidak bisa mengakses `/api/users`, `/api/settings`, `/api/audit-logs`, dan tidak bisa mengeksekusi `approveDoc`.
   - Namun, endpoint mutasi berikut belum memiliki test case negatif dengan role terlarang:
     - `POST /budget-docs/finalize-bulk` (harus ditolak bila dipanggil Manager/PIC).
     - `POST /budget-docs/:id/reopen` (harus ditolak bila dipanggil Manager/PIC).
     - `PUT /investment-lines/:id` & `DELETE /investment-lines/:id` (penolakan role yang tidak berwenang).
     - `DELETE /line-comments/:id` (penolakan bila bukan pembuat komentar/Akuntansi).
     - `POST /realization-imports/:id/confirm` & `DELETE /realization-imports/:id` (penolakan bila dipanggil PIC/Manager).
3. **Celah Uji Akses Lintas Unit (403 Forbidden - Broken Object Level Authorization)**:
   - Pengujian lintas unit berhasil memverifikasi bahwa PIC Unit 1 ditolak saat mengubah baris biaya atau mengajukan dokumen Unit 2, serta Manager Unit 1/2 ditolak saat memanipulasi dokumen Unit 3 (CNH).
   - Namun, endpoint turunan berikut belum memiliki assertion lintas unit langsung:
     - `POST /budget-docs/:id/refresh-prices`
     - `POST /budget-docs/:id/investment-lines`
     - `DELETE /expense-lines/:id` & `DELETE /investment-lines/:id` (manipulasi via ID baris milik dokumen unit lain).
     - `POST /budget-docs/:id/new-item-requests` & `POST .../new-item-requests/send`.

---

## 5. Audit Skema Basis Data: Tabel dan Kolom Tidak Terpakai

Pemeriksaan silang antara 11 berkas migrasi SQL dengan seluruh kueri database pada kode sumber:

1. **Tabel yang Ada di Skema Tetapi Tidak Dipakai**:
   - **`item_company`**: Dibuat pada migrasi awal `001_create_p0_tables.sql`. Pada migrasi `006_item_prices_refactor.sql`, penyimpanan harga dan relasi perusahaan dialihkan sepenuhnya ke tabel `item_prices` (`item_id`, `company_id`). Tabel `item_company` saat ini tidak pernah dibaca atau ditulis oleh kode backend.
2. **Kolom yang Ada di Skema Tetapi Tidak Dipakai / Residual**:
   - **`item_company.legacy_id`**: Kolom sisa dari tabel `item_company`.
   - **`session.sid` & `session.expire`**: Dikelola secara internal oleh pustaka session store `connect-pg-simple` (kode aplikasi hanya membaca payload JSONB `sess`).
   - *(Catatan skema)*: Kolom `investment_lines.investment_type_id` telah dihapus secara resmi melalui migrasi `003_drop_user_roles_and_investment_types.sql` dan digantikan oleh `category_id`.

---

## 6. Hasil Pengujian (Test Runner) dan Linting Kode

### A. Hasil Vitest Backend
- **Status Akhir**: 11 File Lulus, 1 File Gagal (Total: 169 Tests Lulus, 11 Tests Gagal).
- **Rincian Berkas Lulus (11 File)**:
  - `tests/security_matrix.test.mjs` (26 passed) — Lulus 100%
  - `tests/auth.test.mjs` (19 passed) — Lulus 100%
  - `tests/master.test.mjs` (20 passed) — Lulus 100%
  - `tests/master_delete.test.mjs` (9 passed) — Lulus 100%
  - `tests/investment.test.mjs` (17 passed) — Lulus 100%
  - `tests/newItemRequest.test.mjs` (14 passed) — Lulus 100%
  - `tests/workflow.test.mjs` (21 passed) — Lulus 100%
  - `tests/realization.test.mjs` (18 passed) — Lulus 100%
  - `tests/dashboard.test.mjs` (7 passed) — Lulus 100%
  - `tests/report.test.mjs` (10 passed) — Lulus 100%
  - `tests/audit_settings.test.mjs` (8 passed) — Lulus 100%
- **Rincian Berkas Gagal (1 File)**:
  - `tests/expense.test.mjs` (11 failed, 12 passed).
  - *Akar Masalah*: Pengujian warisan Fase 3 ini dieksekusi setelah penambahan mekanisme kontrol akses periode (Fase 5). Dokumen uji dibuat pada periode yang jadwal pengisiannya (`fill_deadline`) telah lewat atau statusnya tertutup, sehingga operasi mutasi menghasilkan 403 `SUBMISSION_CLOSED` sesuai aturan BR-10.

### B. Hasil ESLint Backend
- **0 Errors, 1 Warning**:
  - `backend/tests/master_delete.test.mjs:9:7`: Warning `'accountantId' is assigned a value but never used (no-unused-vars)`.

### C. Hasil ESLint Frontend
- **0 Errors, 23 Warnings**:
  - Seluruh peringatan berkaitan dengan pola React Hook efek samping sinkron (`react-hooks/set-state-in-effect`), dikelompokkan pada:
    1. `frontend/src/components/layout/HeaderNotificationBell.jsx` (1 warning)
    2. `frontend/src/components/master/CoaFormModal.jsx` (1 warning)
    3. `frontend/src/components/master/InvestmentCategoryModal.jsx` (1 warning)
    4. `frontend/src/components/master/ItemFormModal.jsx` (1 warning)
    5. `frontend/src/components/master/ItemPriceHistoryModal.jsx` (1 warning)
    6. `frontend/src/pages/EntryBiayaPage.jsx` (1 warning)
    7. `frontend/src/pages/EntryInvestasiPage.jsx` (3 warnings)
    8. `frontend/src/pages/PenentuanCoaPage.jsx` (2 warnings: `set-state-in-effect` & `exhaustive-deps`)
    9. `frontend/src/pages/PengaturanPeriodePage.jsx` (4 warnings)
    10. Berkas modal form dan penugasan unit lainnya (8 warnings).
- **Hasil Build Frontend (Vite)**:
  - **Sukses 100%** dalam 2.17 detik. Bundle CSS: **6.07 kB**, Bundle JS: **646.66 kB**.

---

## 7. Status Dokumen Kontrak OpenAPI

Sesuai instruksi, dokumen spesifikasi OpenAPI 3.0 telah dihasilkan langsung dari kode sumber backend:
- Generator: [backend/scripts/generate_openapi.js](file:///c:/projek%20RKAP/backend/scripts/generate_openapi.js).
- Berkas Hasil:
  - Format YAML: [docs/openapi.yaml](file:///c:/projek%20RKAP/docs/openapi.yaml) (86 paths, 110 operasi).
  - Format JSON: [docs/openapi.json](file:///c:/projek%20RKAP/docs/openapi.json).
- Endpoint Publik Backend: Dapat diakses langsung melalui `GET /api/docs/openapi.yaml` dan `GET /api/docs/openapi.json`.
