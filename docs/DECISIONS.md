# DECISIONS.md — Catatan Keputusan Sistem RKAP (DIA CAPEX)

Cara pakai: setiap keputusan punya tanggal dan status. **Disetujui** = sudah diputuskan pemilik proyek. **Usulan** = default sementara agar pekerjaan bisa jalan; pemilik proyek mengubahnya bila perlu. Agent menambah baris baru di bagian bawah, tidak menghapus baris lama (bila berubah, tandai baris lama "Digantikan" dan rujuk baris baru).

Urutan prioritas sumber kebenaran: DECISIONS.md, lalu AGENTS.md (stack dan struktur), lalu docs/PRD.md, lalu mockup, lalu PRD_Sistem_RKAP_DIA_CAPEX.pdf.

## A. Keputusan yang sudah disetujui

| # | Tanggal | Keputusan | Alasan singkat | Status |
|---|---|---|---|---|
| 1 | 2026-11-13 | Stack mengikuti proyek yang berjalan: `backend/` Express 5 + `pg` (JavaScript CommonJS, tanpa ORM), `frontend/` React 19 + Vite + Axios (JSX). | Sudah ada kode awal; hemat perpindahan alat. | Disetujui |
| 2 | 2026-11-13 | Untuk stack dan struktur folder, AGENTS.md menang atas PRD. | PRD lama masih menyebut Prisma dan `/server`. | Disetujui |
| 3 | 2026-11-13 | Realisasi diambil dari **daftar jurnal** (xlsx) yang diunggah manual oleh Akuntansi, bukan API ERP. Realisasi biaya = DEBET − KREDIT per COA, unit, bulan (BR-05). | Sumber data yang tersedia; integrasi ERP ditunda. | Disetujui |
| 4 | 2026-11-13 | Manager boleh mengajukan seperti PIC, tetapi pengaju tidak boleh menyetujui dokumennya sendiri (BR-07). | Prinsip dua mata. | Disetujui |
| 5 | 2026-11-13 | Dokumen yang dikembalikan setelah pengisian ditutup (dan deadline validasi belum lewat) otomatis membuka akses unit untuk jenis anggaran itu; Akuntansi tetap bisa membuka atau menutup manual (BR-14). | Menghindari unit terkunci saat revisi. | Disetujui |
| 6 | 2026-11-13 | Semua perubahan tersimpan otomatis; tidak ada tombol Simpan draft. | Permintaan pemilik proyek. | Disetujui |
| 7 | 2026-11-13 | Lampiran file pada form investasi dihapus. | Permintaan pemilik proyek. | Disetujui |
| 8 | 2026-11-13 | COA dan masa manfaat investasi otomatis dari Kategori Investasi (master); penyusutan = Jumlah ÷ masa manfaat × (12 − bulan rencana), Januari = 1 (BR-15, BR-16). | Sesuai Master COA. | Disetujui |
| 9 | 2026-11-13 | Barang baru yang diminta PIC belum masuk total sampai Akuntansi menentukan COA-nya (BR-17, BR-18). | Permintaan pemilik proyek. | Disetujui |

## B. Keputusan Fase 1 (Auth dan RBAC)

| # | Tanggal | Keputusan | Alasan | Status |
|---|---|---|---|---|
| 10 | 2026-11-13 | **Satu pengguna, satu role** (kolom `users.role`: pic, manager, akuntansi). Mendukung respons API sesuai spesifikasi PRD PDF. | Kolom tunggal paling sederhana; Manager mewarisi hak PIC lewat aturan otorisasi server. | Usulan, menunggu konfirmasi |
| 11 | 2026-11-13 | **Cakupan data = daftar unit yang ditugaskan eksplisit** (`user_unit_access`) untuk PIC dan Manager. Akuntansi memiliki wewenang ke semua unit di CN dan CNH. | Paling aman, eksplisit, dan mudah diuji pada middleware `requireUnitAccess`. | Usulan, menunggu konfirmasi |
| 12 | 2026-11-13 | Hash kata sandi memakai **bcryptjs** (portabel dan tanpa isu kompilasi C++ di Windows). | Menjamin portabilitas lingkungan kerja lokal dan server. | Usulan, menunggu konfirmasi |
| 13 | 2026-11-13 | Sesi: `express-session` + `connect-pg-simple`; tabel `"session"` di PostgreSQL; cookie `httpOnly`, `sameSite=lax`, `secure` di produksi. | Sesuai PRD (sesi cookie persisten di PostgreSQL). | Usulan, menunggu konfirmasi |
| 14 | 2026-11-13 | CSRF: token double-submit lewat `GET /api/auth/csrf` dan header `X-CSRF-Token` pada setiap request non-GET. | Mencegah eksploitasi CSRF lintas situs pada cookie sesi. | Usulan, menunggu konfirmasi |
| 15 | 2026-11-13 | Batas laju login: `express-rate-limit` membatasi 5 percobaan gagal per 15 menit per IP; pesan galat sama untuk email tidak dikenal dan kata sandi salah. | Mencegah serangan brute-force dan kebocoran keberadaan akun. | Usulan, menunggu konfirmasi |
| 16 | 2026-11-13 | Tidak ada fitur reset password mandiri; Akuntansi yang mereset/mengganti kata sandi atau pengguna mengganti lewat `PUT /api/auth/password` saat aktif. | Sesuai teks resmi pada mockup layar Login. | Usulan, menunggu konfirmasi |
| 17 | 2026-11-13 | Seed pengembangan berisi pengguna dev fiktif: Rina (`rina@ptcn.id` - PIC), Budi (`budi@ptcn.id` - Manager), Dya (`dya@ptcn.id` - Akuntansi), dan akun nonaktif untuk uji coba. | Mencegah paparan kredensial riil di repositori. | Usulan, menunggu konfirmasi |
| 18 | 2026-11-13 | Middleware otorisasi modular (`requireAuth`, `requireRole`, `requireUnitAccess`, `csrfProtection`). | Memisahkan kekhawatiran dan memudahkan integrasi masa depan. | Usulan, menunggu konfirmasi |
| 19 | 2026-11-13 | Sanitasi log audit: properti kata sandi dihapus sepenuhnya sebelum disimpan ke `audit_logs` atau dicetak ke log. | Mencegah kebocoran kata sandi di log dan jejak audit. | Usulan, menunggu konfirmasi |

## C. Keputusan Koreksi Fase 0

| # | Tanggal | Keputusan | Alasan | Status |
|---|---|---|---|---|
| 20 | 2026-11-16 | **Penghapusan tabel `user_roles` dan `investment_types`** lewat Migrasi 003. Kolom `investment_type_id` pada `investment_lines` dihapus; baris investasi merujuk langsung ke `investment_categories(id)`. | Menghilangkan redundansi skema, menyederhanakan relasi master investasi dan normalisasi role pengguna. | Disetujui |
| 21 | 2026-11-16 | **Kode unit fiktif dipindahkan ke rentang `99xx`** (9910: MCU, 9920: Lab, 9930: Rawat Inap 1, 9940: SG PPS, 9950: SG Veteran, 9960: Bogorejo). | Membedakan secara tegas data dummy dev dengan kode unit operasional rumah sakit sebenarnya. | Disetujui |
| 22 | 2026-11-16 | **Pengecualian `.gitignore` untuk fixture pengujian** (`!backend/tests/fixtures/**`). | Memastikan file fixture pengujian (seperti template Excel untuk uji coba import) tetap terlacak repositori. | Disetujui |
| 23 | 2026-11-16 | **Idempotensi Seeder**: Seluruh query `INSERT` pada `seed_p0.js` dilengkapi klausa `ON CONFLICT DO UPDATE` atau `ON CONFLICT DO NOTHING`. | `npm run seed` aman dijalankan berulang kali tanpa memicu galat duplikasi kunci. | Disetujui |

## D. Keputusan Keamanan Fase 1b

| # | Tanggal | Keputusan | Alasan | Status |
|---|---|---|---|---|
| 24 | 2026-11-16 | **`requireUnitAccess` Gagal Tertutup (Fail-Closed)**: Rute yang diproteksi wewenang unit menolak dengan 403 bila target unit tidak dapat ditentukan dari params/query/body. | Mencegah kebocoran akses data jika ada endpoint unit yang dipanggil tanpa parameter unit. | Disetujui |
| 25 | 2026-11-16 | **Isolasi Data Dokumen via Helper Repository**: Query pembacaan dokumen dibatasi oleh unit milik pengguna (`unit_id = ANY($2::int[])`) untuk PIC/Manager; PIC tidak dapat membaca data unit lain lewat ID dokumen langsung. | Memenuhi aturan B4 AGENTS.md (filter unit diterapkan di repository, bukan hanya di UI). | Disetujui |
| 26 | 2026-11-16 | **Validasi Ketat `SESSION_SECRET`**: Menghapus nilai cadangan (fallback); aplikasi langsung berhenti (`process.exit(1)`) jika variabel tidak ada. | Mencegah aplikasi berjalan di produksi dengan kunci enkripsi sesi default/lemah. | Disetujui |
| 27 | 2026-11-16 | **Regenerasi Sesi & CSRF Baru saat Login**: Memanggil `req.session.regenerate()` dan menerbitkan token CSRF baru setelah verifikasi kredensial berhasil. | Mencegah serangan *Session Fixation* dan memastikan sesi terautentikasi memiliki token CSRF unik. | Disetujui |
| 28 | 2026-11-16 | **Proteksi Akun Akuntansi**: Akuntansi dilarang menonaktifkan atau mengubah role dirinya sendiri, serta dilarang menonaktifkan/menurunkan role Akuntansi aktif terakhir di sistem. | Mencegah terjadinya penguncian sistem (sistem kehilangan seluruh administrator aktif). | Disetujui |
| 29 | 2026-11-16 | **Mitigasi Serangan Waktu (Timing Attack)**: Login email tidak dikenal membandingkan kata sandi dengan hash tiruan bcrypt sebelum melempar 401; perbandingan token CSRF menggunakan `crypto.timingSafeEqual`. | Menghilangkan timing oracle sehingga penyerang tidak bisa mendeteksi keberadaan akun atau menebak token CSRF. | Disetujui |
| 30 | 2026-11-16 | **Pencabutan Sesi Lain saat Ganti Password**: Penggantian kata sandi menghapus seluruh sesi aktif lain milik pengguna terkait dari tabel `"session"` PostgreSQL. | Mengamankan akun seketika bila terjadi kompromi kredensial di perangkat lain. | Disetujui |
| 31 | 2026-11-16 | **`AuditService.log` Siap Transaksi (Atomis)**: Fungsi audit menerima koneksi database klien opsional (`client = db`). | Memastikan catatan audit log tersimpan atau dibatalkan bersama-sama dalam transaksi mutasi data bisnis. | Disetujui |
| 32 | 2026-11-16 | **Isolasi Lingkungan Pengujian**: Test suite membersihkan seluruh data uji (pengguna dummy, dokumen uji, sesi uji) di blok `afterAll`. | Mencegah residu data uji mengotori database development. | Disetujui |

## E. Pertanyaan terbuka yang tidak memblokir Fase 1
- PRD nomor 4: berapa Manager per unit dan adakah persetujuan di atas Manager (memengaruhi Fase 5).
- PRD nomor 9: hosting dan SSO (diantisipasi oleh baris 18).

## F. Pertanyaan terbuka yang memblokir fase berikutnya
Lihat PRD bagian 14. Yang paling mendesak: nomor 6 (ambang investasi per item atau per baris), 12 (akun realisasi investasi), 13 (master dan harga CNH), 16 (format export matriks).
