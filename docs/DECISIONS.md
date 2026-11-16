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
| 10 | 2026-11-13 | **Satu pengguna, satu role** (kolom `users.role`: pic, manager, akuntansi). Mendukung respons API sesuai spesifikasi PRD PDF. | Kolom tunggal paling sederhana; Manager mewarisi hak PIC lewat aturan otorisasi server. | Disetujui |
| 11 | 2026-11-13 | **Cakupan data = daftar unit yang ditugaskan eksplisit** (`user_unit_access`) untuk PIC dan Manager. Akuntansi memiliki wewenang ke semua unit di CN dan CNH. | Paling aman, eksplisit, dan mudah diuji pada middleware `requireUnitAccess`. | Disetujui |
| 12 | 2026-11-13 | Hash kata sandi memakai **bcryptjs** (portabel dan tanpa isu kompilasi C++ di Windows). | Menjamin portabilitas lingkungan kerja lokal dan server. | Disetujui |
| 13 | 2026-11-13 | Sesi: `express-session` + `connect-pg-simple`; tabel `"session"` di PostgreSQL; cookie `httpOnly`, `sameSite=lax`, `secure` di produksi. | Sesuai PRD (sesi cookie persisten di PostgreSQL). | Disetujui |
| 14 | 2026-11-13 | CSRF: token double-submit lewat `GET /api/auth/csrf` dan header `X-CSRF-Token` pada setiap request non-GET. | Mencegah eksploitasi CSRF lintas situs pada cookie sesi. | Disetujui |
| 15 | 2026-11-13 | Batas laju login: `express-rate-limit` membatasi 5 percobaan gagal per 15 menit per IP; pesan galat sama untuk email tidak dikenal dan kata sandi salah. | Mencegah serangan brute-force dan kebocoran keberadaan akun. | Disetujui |
| 16 | 2026-11-13 | Tidak ada fitur reset password mandiri; Akuntansi yang mereset/mengganti kata sandi atau pengguna mengganti lewat `PUT /api/auth/password` saat aktif. | Sesuai teks resmi pada mockup layar Login. | Disetujui |
| 17 | 2026-11-13 | Seed pengembangan berisi pengguna dev fiktif: Rina (`rina@ptcn.id` - PIC), Budi (`budi@ptcn.id` - Manager), Dya (`dya@ptcn.id` - Akuntansi), dan akun nonaktif untuk uji coba. | Mencegah paparan kredensial riil di repositori. | Disetujui |
| 18 | 2026-11-13 | Middleware otorisasi modular (`requireAuth`, `requireRole`, `requireUnitAccess`, `csrfProtection`). | Memisahkan kekhawatiran dan memudahkan integrasi masa depan. | Disetujui |
| 19 | 2026-11-13 | Sanitasi log audit: properti kata sandi dihapus sepenuhnya sebelum disimpan ke `audit_logs` atau dicetak ke log. | Mencegah kebocoran kata sandi di log dan jejak audit. | Disetujui |

## C. Pertanyaan terbuka yang tidak memblokir Fase 1
- PRD nomor 4: berapa Manager per unit dan adakah persetujuan di atas Manager (memengaruhi Fase 5).
- PRD nomor 9: hosting dan SSO (diantisipasi oleh baris 18).

## D. Pertanyaan terbuka yang memblokir fase berikutnya
Lihat PRD bagian 14. Yang paling mendesak: nomor 6 (ambang investasi per item atau per baris), 12 (akun realisasi investasi), 13 (master dan harga CNH), 16 (format export matriks).
