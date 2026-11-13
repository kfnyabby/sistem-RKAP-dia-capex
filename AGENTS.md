# AGENTS.md — Sistem RKAP (DIA CAPEX) CN dan CNH

Dua bagian: **A** adalah pedoman perilaku umum (dari CLAUDE.md milik pemilik proyek, tidak diubah). **B** adalah aturan khusus proyek ini, disesuaikan dengan struktur proyek yang sudah ada (`backend/`, `frontend/`, `docs/`). Bila keduanya tampak bertentangan, ikuti B, lalu catat di `docs/DECISIONS.md`.

---

## A. Pedoman perilaku (dari CLAUDE.md)

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## B. Aturan khusus proyek

### B1. Penyesuaian terhadap bagian A
- **PRD dihitung sebagai permintaan eksplisit.** Fitur dan pengaturan yang tertulis di `docs/PRD.md` (mis. ambang investasi, penutupan otomatis, batas karakter) bukan "spekulatif"; bangun sesuai PRD, jangan lebih.
- **Pertanyaan tidak boleh menghentikan pekerjaan tanpa alasan.** Bila hal yang tidak jelas ada di daftar pertanyaan terbuka PRD (bagian 14), jangan menebak diam-diam: tulis asumsi di `docs/DECISIONS.md`, beri komentar `TODO(keputusan)` di kode, lanjut dengan default PRD. Berhenti dan bertanya hanya bila hal itu memblokir pekerjaan.

### B2. Sumber kebenaran (urutan prioritas)
1. `docs/DECISIONS.md` (keputusan terbaru, ada tanggal)
2. `AGENTS.md` ini, **khusus untuk stack, struktur folder, dan cara menjalankan** (PRD lama masih menyebut `/server`, `/client`, TypeScript, dan Prisma; abaikan bagian itu)
3. `docs/PRD.md` (kebutuhan, aturan bisnis BR-xx, fase, pertanyaan terbuka)
4. Mockup (acuan tampilan, bukan spesifikasi perilaku)
5. `docs/PRD_Sistem_RKAP_DIA_CAPEX.pdf` (kontrak endpoint dan model data; bila beda dengan PRD.md, PRD.md menang)

### B3. Kondisi proyek saat ini dan stack
Proyek sudah berjalan sebagai starter. **Jangan membuat ulang; bangun di atasnya.**
- `backend/`: JavaScript (CommonJS), Express 5, driver `pg`, `dotenv`, `cors`, `nodemon`. Entrypoint `index.js`, koneksi di `db.js`. Endpoint yang sudah ada: `GET /api/health`, `GET /api/test-db` (pertahankan).
- `frontend/`: React 19, Vite 8, Axios, JSX. Dev server port 3000 dengan proxy `/api` ke `http://localhost:5000`.
- `docs/`: PRD dan dokumen pendukung.
- **Bahasa: JavaScript, bukan TypeScript**, mengikuti kode yang ada. `frontend/tsconfig.json` ada tetapi belum dipakai; jangan migrasi ke TypeScript tanpa keputusan di `docs/DECISIONS.md`.
- **Tanpa ORM.** Query SQL lewat `backend/db.js` dengan parameter (`$1`, `$2`, ...). Jangan merangkai SQL dari input pengguna.
- Express 5: handler async yang melempar error diteruskan otomatis ke error handler; sintaks wildcard route berbeda dari Express 4.
- Tambahan yang diizinkan, dipasang saat dibutuhkan, satu fase satu keputusan, dicatat di `docs/DECISIONS.md`:
  - Backend: migrasi SQL (`node-pg-migrate` atau berkas `.sql` berurutan dengan runner sederhana), `zod`, `express-session` + `connect-pg-simple`, `argon2` atau `bcrypt`, `exceljs`, `pg-boss`, `vitest` + `supertest`, ESLint + Prettier.
  - Frontend: `react-router-dom`, Tailwind CSS, TanStack Query dan TanStack Table bila perlu.

### B4. Struktur target dan aturan arsitektur
- Backend: `backend/src/{routes,controllers,services,repositories,middleware,jobs,validators}`, `backend/migrations`, `backend/seeds`, `backend/tests`. `index.js` tetap entrypoint dan boleh menjadi tipis.
- Frontend: `frontend/src/{pages,components,api,auth}`.
- Aturan bisnis hanya di `backend/src/services`. Controller tipis. React tidak memuat aturan bisnis.
- Otorisasi di server: middleware `requireRole` dan `requireUnitAccess`; filter unit diterapkan di repository. Menyembunyikan menu di React bukan otorisasi.
- Setiap mutasi data memanggil `AuditService` (siapa, kapan, nilai lama dan baru).
- Uang disimpan sebagai bilangan bulat rupiah (`bigint` di PostgreSQL). Tidak ada float untuk uang.
- Nilai yang bisa berubah (ambang investasi, ambang peringatan, penutupan otomatis, akun realisasi investasi, batas karakter) dibaca dari tabel `settings`, bukan ditulis langsung di kode.
- Migrasi database bersifat menambah (tambah tabel atau kolom). Jangan mengubah atau menghapus kolom yang sudah dipakai tanpa persetujuan.
- UI berbahasa Indonesia; kode dan nama variabel berbahasa Inggris; pesan galat berbahasa Indonesia dan menyebut baris serta cara memperbaikinya.

### B5. Aturan bisnis kunci (rujuk PRD untuk teks lengkap)
- BR-01: item investasi harus bernilai lebih dari ambang (default Rp 5.000.000); di bawahnya masuk Anggaran Biaya.
- BR-05: realisasi biaya = DEBET − KREDIT per COA, unit, dan bulan dari daftar jurnal; investasi dari akun aset tetap, satu sisi saja.
- BR-07: pengaju tidak boleh menyetujui dokumennya sendiri.
- BR-06, BR-12, BR-13, BR-14: dokumen FINAL terkunci; hanya Akuntansi mengubah deadline serta menutup atau membuka pengajuan; dokumen yang dikembalikan membuka akses unit secara otomatis selama deadline validasi belum lewat.
- BR-15, BR-16: COA dan masa manfaat investasi otomatis dari Kategori Investasi; penyusutan = Jumlah ÷ masa manfaat × (12 − bulan rencana), Januari = 1.
- BR-17, BR-18: barang baru belum masuk total sampai Akuntansi menentukan COA.
- BR-19: baris jurnal unik menurut ID SUB JURNAL; unggah ulang menggantikan.
- Tulis uji untuk aturan ini **sebelum** implementasinya.

### B6. Cara kerja per fase
1. Kerjakan **satu fase per sesi** sesuai PRD (bagian 12). Jangan mengerjakan fase berikutnya.
2. Mulai dengan rencana singkat: langkah, berkas yang akan disentuh, dan cara verifikasi. **Tunggu persetujuan** sebelum menulis kode.
3. Verifikasi dengan skrip yang benar-benar ada. Saat ini: `npm run dev` di `backend/` dan `frontend/`, serta `npm run build` di `frontend/`. Skrip `test` dan `lint` belum ada; Fase 0 menambahkannya. Jangan mengarang perintah yang tidak ada.
4. Akhiri dengan ringkasan: apa yang dibuat, cara menjalankannya, asumsi yang diambil, hal yang menunggu keputusan.

### B7. Data dan keamanan
- **Jangan membaca, menampilkan, atau mengubah isi `backend/.env`.** Bila variabel baru dibutuhkan, tambahkan ke `backend/.env.example` dan beri tahu pemilik proyek.
- Buat `.gitignore` di akar proyek: `node_modules`, `dist`, `.env`, serta berkas besar (jurnal, master, spreadsheet asli). `frontend/dist` adalah hasil build dan tidak di-commit.
- Jangan menaruh data asli (jurnal, master barang, spreadsheet RKAP, nama pegawai) di repositori. Pakai seed fiktif.
- Hash kata sandi dengan argon2 atau bcrypt; lindungi CSRF; beri batas laju pada login.

### B8. Jangan
- Jangan menambah fitur di luar fase yang sedang dikerjakan.
- Jangan membuat ulang struktur proyek, mengganti nama `backend` atau `frontend`, atau menambah ORM tanpa keputusan tercatat.
- Jangan mengubah mockup atau PRD kecuali diminta; usulkan perubahannya di `docs/DECISIONS.md`.
- Jangan menghapus data pengguna atau menimpa file besar tanpa konfirmasi.
