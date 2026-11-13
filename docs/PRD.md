# PRD: Sistem RKAP Terintegrasi (DIA CAPEX) untuk CN & CNH

Versi 1.2 (Draft) | 12 November 2026 | Disusun untuk vibe coding di Antigravity | Sumber: spreadsheet RKAP 2027 CN & CNH, PPT Ideabox "DIA CAPEX"

## 1. Ringkasan Eksekutif

**Produk:** aplikasi web internal untuk menyusun, memvalidasi, dan memonitor **Anggaran Biaya** dan **Anggaran Investasi (Capex)** tahunan (RKAP), menggantikan spreadsheet dan pengiriman Excel via email. Satu aplikasi melayani dua perusahaan: **PT Cipta Nirmala (CN)** dan **Cipta Nirmala Husada (CNH)**.

**Masalah (dari PPT):** proses manual lama, pengumpulan data via email sering terlambat (dikirim saat sudah *close*), format antar unit berbeda, monitoring realisasi manual dan periodik, tidak ada validasi, audit trail, maupun pencatatan risiko.

**Akar masalah:** belum ada sistem digital terintegrasi untuk pengelolaan RKAP.

**Hasil yang diharapkan:** unit mengisi langsung di sistem, Manager memvalidasi di sistem, Akuntansi mengonsolidasi dan memonitor realisasi lewat dashboard tanpa olah data manual.

### 1.1 Tujuan terukur

| ID | Tujuan | Indikator keberhasilan |
| --- | --- | --- |
| G1 | Menghilangkan pengiriman Excel via email | 100% unit CN & CNH mengisi RKAP di sistem pada siklus RKAP berikutnya |
| G2 | Mempercepat konsolidasi | Rekap per COA, per unit, dan per perusahaan tersedia otomatis; tanpa pembuatan summary manual |
| G3 | Kontrol anggaran | Realisasi vs RKAP terlihat per unit dan per COA; peringatan otomatis saat melewati ambang |
| G4 | Data akurat dan konsisten | Validasi otomatis (wajib isi, tipe angka, aturan investasi), tidak ada angka bertipe teks |
| G5 | Akuntabel | Setiap perubahan tercatat (siapa, kapan, nilai lama dan baru) |

### 1.2 Bukan tujuan (MVP)

- Pengganti ERP atau pencatatan transaksi akuntansi.
- Penyusunan Cash Flow, Laba Rugi, Neraca, Rasio, dan PSAK 118 (saat ini ada di workbook CN; tetap di spreadsheet Akuntansi, lihat bagian Fase 3).
- Integrasi langsung ke ERP (disiapkan antarmukanya, dibangun setelah KDCTI siap).

## 2. Kondisi Saat Ini (As-Is) dari Spreadsheet

### 2.1 Struktur workbook

| Aspek | CN | CNH |
| --- | --- | --- |
| Jumlah sheet | sekitar 62 | sekitar 57 |
| Sheet unit | sekitar 50 (1 sheet per unit) | sekitar 50 (1 sheet per unit/cabang) |
| Master barang | 3.091 item | 3.070 item |
| Pengelompokan unit | Per Instalasi (Penunjang Medik, Pelayanan Medik, Rawat Inap, dst.) | Per Unit Bisnis (Gresik: Klinik SG PPS/Veteran/SG2; Tuban & Jateng: Bogorejo, Pramuka, Rembang, dst.) |
| Sheet tambahan | Rekap Investasi, SDM, PC & Laptop, Diklat & Tenaga, Resume Biaya, CF, LR, Neraca, Rasio, PSAK 118 | Sheet biaya |

Setiap unit punya kode `[9xxx]` dan nama (contoh `[9220] MCU`).

### 2.2 Pola sheet unit

1. **Bagian atas: pengajuan investasi.** Kolom: Strategi Objektif, KPI, Program Kerja, Strategic Action, Jenis Investasi, Nama Barang, Qty, Harga, Jumlah, Jadwal (bulan), Jenis (prioritas).
2. **Bagian bawah: pengajuan biaya.** Seluruh master barang (sekitar 3.000 baris) disalin ke setiap sheet unit. PIC hanya mengisi qty pada kolom kuning **RKAP 2027**. Jumlah rupiah = harga x qty.
3. **Realisasi** (kolom "Real s.d. Jul 2026") diambil dengan SUMIFS dari sheet `export_input_pemakaian_logistik` per unit dan per ID barang. Export ini diunduh manual dari ERP; status transaksi: Terproses, Pengajuan, Draft.
4. **COA** tiap barang diambil dari master barang (satu barang satu COA).

### 2.3 Daftar COA di master barang

| Kode | Nama COA |
| --- | --- |
| 4.1.7 | Biaya Bahan O2 & NO2 |
| 4.2.1 | Biaya Bahan Makan |
| 4.2.2 | Biaya Bahan Cucian |
| 4.2.3 | Biaya Bahan Pembersih |
| 4.2.4 | Biaya Bahan Linen |
| 4.2.5 | Biaya Bahan Bakar L.P.G. |
| 5.1.9 | Biaya Seragam Pegawai |
| 5.2.4 | Biaya Pemakaian Suku Cadang Medis |
| 5.2.6 | Biaya Pemakaian Suku Cadang Non Medis |
| 5.7.3 | Biaya Rumah Tangga |
| 5.8.2 | Biaya Pemakaian Alat Perkantoran |
| 5.8.3 | Biaya Cetak & Fotocopy |

Sheet laporan (`BIAYA CN/CNH`, `RESUME BIAYA`) memakai daftar COA lebih luas (misalnya 4.1.1 sampai 4.1.6 obat/injeksi, 5.2.x pemeliharaan, 5.1.1.x gaji di sheet SDM). Daftar COA lengkap **harus dikonfirmasi Akuntansi** dan dimuat sebagai master yang bisa ditambah.

### 2.4 Masalah data yang harus ditangani

| # | Temuan | Penanganan di sistem baru |
| --- | --- | --- |
| D1 | 3.050 nama barang sama di CN dan CNH; 41 hanya di CN, 20 hanya di CNH; 11 ID berbeda | Satu master barang, dengan penanda ketersediaan per perusahaan |
| D2 | Harga berbeda pada 2.782 barang | Tabel harga per barang per perusahaan per periode; Akuntansi verifikasi sebelum go-live |
| D3 | 16 barang di CN tanpa COA | Import ditolak untuk baris tanpa COA, masuk laporan "perlu dilengkapi" |
| D4 | SUMIFS realisasi tidak memfilter status; Draft dan Pengajuan ikut terhitung | Sumber realisasi baru adalah daftar jurnal (tanpa kolom status transaksi): realisasi = debet dikurangi kredit pada akun biaya dan aset (BR-05). Draft dan Pengajuan tidak ada lagi di sumber ini. |
| D5 | Batas investasi > 5 juta tidak divalidasi | Validasi otomatis (BR-01) |
| D6 | Angka tersimpan sebagai teks ("15,000,000", "-"), label "Rp Juta" padahal rupiah penuh, label "RKAP 2026" di file 2027, jadwal campur angka dan teks, nomor urut loncat | Semua angka bertipe numerik (rupiah, integer), jadwal berupa pilihan bulan, penomoran otomatis |
| D7 | Master barang disalin ke 50 sheet | Satu master, tampilan per unit |

### 2.5 Pemetaan Fitur Spreadsheet ke Sistem

Daftar ini dipakai agar tidak ada fungsi spreadsheet yang hilang tanpa disetujui pengusul ide. Setiap baris perlu ditandatangani: **ya, cukup** atau **harus masuk MVP**.

| Di spreadsheet | Di sistem baru | Status | Prioritas |
| --- | --- | --- | --- |
| MENU (daftar unit dan tautan) | Master unit dan navigasi menurut role | Tercakup | P0 |
| Sheet unit, bagian investasi (Strategi Objektif, Counter Measure (KPI), Program Kerja / Inisiatif Strategis, Strategic Action, jenis, nama, qty, harga, jadwal, prioritas) | Entry Anggaran Investasi dengan kolom yang sama | Tercakup | P0 |
| Sheet unit, bagian biaya (master barang disalin, qty RKAP) | Entry Anggaran Biaya; barang dari riwayat unit, tambah dari master, dan permintaan barang baru | Tercakup | P0 |
| Kolom realisasi per barang (SUMIFS dari export logistik) | Realisasi dari daftar jurnal per COA, unit, dan bulan; per barang bila KETERANGAN jurnal dapat dibaca | Tercakup, sumber berubah | P0 |
| export\_input\_pemakaian\_logistik | Digantikan daftar jurnal yang diunggah manual oleh Akuntansi | Diganti | P0 |
| Sheet8 / master barang | Master Barang Logistik (3.204 barang) dan Master COA | Tercakup | P0 |
| REKAP INVEST RKAP 2027 | Laporan investasi per jenis, prioritas, dan bulan | Tercakup | P0 |
| RESUME BIAYA, BIAYA CN, BIAYA CNH (template ERP) | Laporan Rekap per unit dan Matriks unit × COA (format ERP); kolom lengkap template (sekitar 160 kolom) perlu dikonfirmasi | Tercakup, kolom perlu konfirmasi | P0 |
| PC & LAPTOP | Kategori investasi PC/Laptop di Entry Investasi, ditambah tampilan terfilter lintas unit | Tercakup | P0 |
| Penyusutan investasi (nilai dibagi masa manfaat dikali bulan sisa) | Dihitung otomatis di Entry Investasi (BR-16) | Tercakup | P0 |
| DIKLAT & TENAGA (Jenis Diklat atau Tenaga Kerja; Tenaga Kerja tanpa nilai rupiah) | Form khusus Diklat dan Tenaga Kerja | Usulan MVP, menunggu keputusan | P1 |
| SDM (usulan biaya tenaga kerja per COA dengan prognosa dan persentase kenaikan) | Layar Usulan RKAP SDM per COA | Usulan MVP, menunggu keputusan | P1 |
| CF, LR, Neraca, Rasio | Tetap di spreadsheet Akuntansi | Di luar sistem | - |
| PSAK 118 | Tetap di spreadsheet Akuntansi | Di luar sistem | - |

Fungsi baru yang tidak ada di spreadsheet: alur approval, deadline serta buka/tutup pengajuan, audit trail, notifikasi, Form ACC Anggaran, pengalihan biaya, dan Risk Register.

## 3. Pengguna dan Hak Akses

### 3.1 Role

| Role | Deskripsi | Cakupan data |
| --- | --- | --- |
| **PIC Unit** | Mengisi pengajuan berdasarkan permintaan unit dan departemennya | Hanya unit yang ditugaskan |
| **Manager** | Validator; juga punya akses seperti PIC | Unit dalam tanggung jawabnya (kelompok/instalasi/unit bisnis) |
| **Akuntansi** | Super admin: kelola master, periode, user, konsolidasi, realisasi, pengaturan | Semua unit, CN dan CNH |

Pengguna dapat ditugaskan ke lebih dari satu unit dan lebih dari satu perusahaan.

### 3.2 Matriks izin

| Aksi | PIC | Manager | Akuntansi |
| --- | --- | --- | --- |
| Lihat dan isi draft anggaran biaya/investasi unit sendiri | Ya | Ya | Ya |
| Ajukan (submit) ke Manager | Ya | Ya | Ya |
| Setujui / kembalikan dengan catatan | Tidak | Ya (unit cakupannya) | Ya |
| Final (kunci) dan konsolidasi | Tidak | Tidak | Ya |
| Buka kembali dokumen terkunci | Tidak | Tidak | Ya (wajib alasan) |
| Kelola master (barang, COA, harga, unit, jenis investasi) | Tidak | Tidak | Ya |
| Kelola periode dan tenggat | Tidak | Tidak | Ya |
| Kelola user dan role | Tidak | Tidak | Ya |
| Import realisasi | Tidak | Tidak | Ya |
| Dashboard unit sendiri | Ya | Ya | Ya |
| Dashboard konsolidasi lintas unit dan perusahaan | Tidak | Sebatas cakupan | Ya |
| Lihat audit log | Tidak | Sebatas cakupan | Ya |
| Tentukan atau ubah deadline pengisian, validasi, dan lock (periode atau per unit) | Tidak | Tidak | Ya |
| Tutup atau buka pengajuan (seluruh periode, per unit, atau per jenis anggaran) | Tidak | Tidak | Ya (alasan wajib saat membuka kembali) |

## 4. Ruang Lingkup dan Prioritas

**P0 = wajib MVP; P1 = fase 2; P2 = fase 3.**

| Modul | Prioritas |
| --- | --- |
| Auth, user, role, multi-perusahaan | P0 |
| Master data (perusahaan, kelompok, unit, COA, barang, harga, jenis investasi, prioritas) | P0 |
| Periode RKAP, deadline, serta tutup dan buka pengajuan oleh Akuntansi | P0 |
| Entry Anggaran Biaya | P0 |
| Entry Anggaran Investasi | P0 |
| Workflow approval PIC, Manager, Akuntansi | P0 |
| Import realisasi dari export ERP (xlsx) | P0 |
| Dashboard dan laporan (biaya, investasi, realisasi vs RKAP) | P0 |
| Export Excel dan PDF | P0 |
| Audit trail | P0 |
| Notifikasi (in-app) | P0 |
| Import data awal dari spreadsheet (master dan isian) | P0 |
| Permintaan penggunaan anggaran dan **Form ACC Anggaran** | P1 |
| Pengalihan biaya (budget transfer) dengan SOP | P1 |
| Notifikasi email | P1 |
| Risk Register RKAP | P1 |
| Pengisian SDM, PC & Laptop, Diklat & Tenaga | P1 |
| Integrasi API ke ERP | P2 |
| Penyusutan investasi dan proyeksi CF/LR/Neraca | P2 |

## 5. Persyaratan Fungsional

### 5.1 Autentikasi dan Pengguna

- **FR-A1** Login email/username dan password; password di-hash; sesi dengan masa kedaluwarsa.
- **FR-A2** Akuntansi membuat, menonaktifkan, dan mengatur role dan penugasan unit pengguna.
- **FR-A3** Pengguna yang punya akses ke beberapa perusahaan memilih perusahaan aktif di header (CN atau CNH).
- **FR-A4** Semua query data dibatasi sesuai role dan penugasan di sisi server (bukan hanya menyembunyikan menu).

### 5.2 Master Data (Akuntansi)

- **FR-M1** CRUD perusahaan, kelompok (Instalasi/Unit Bisnis), dan unit (kode `[9xxx]`, nama, kelompok, perusahaan, status aktif).
- **FR-M2** CRUD COA (kode, nama, kategori biaya/investasi, aktif).
- **FR-M3** CRUD barang (kode/ID, nama, satuan, COA), dengan **harga per perusahaan dan per periode**.
- **FR-M4** Daftar referensi: Jenis Investasi (Tanah & Bangunan, Peralatan Medis, Peralatan Non Medis, Knowledge, Laptop/PC) dan Prioritas (Strategic, Improvement, Regulasi, Keep Operation); dapat ditambah.
- **FR-M5** Import master barang dari xlsx dengan pratinjau, validasi (COA wajib, duplikat), dan laporan galat per baris.
- **FR-M6** Laporan kualitas master: barang tanpa COA, barang tanpa harga di suatu perusahaan, ID bentrok.
- **FR-M7** Import **Master COA** (tiga sheet: Master COA, Kategori Biaya, Kategori Investasi) dengan pratinjau, validasi, dan laporan galat per baris.
- **FR-M8** Import **Master Barang Logistik** (kolom: ID\_BARANG, KODE\_PRODUK, NAMA\_BARANG, golongan, satuan, HPP, status, COA\_BIAYA, COA\_PERSEDIAAN, kategori COA). Pemeriksaan otomatis terhadap data RKAP: jumlah barang cocok, barang baru, barang yang COA-nya berubah, HPP bernilai 0, dan barang yang ada di RKAP tetapi tidak ada di master. Contoh file: 3.204 barang, 3.080 cocok, 124 baru, 35 COA berubah, 52 HPP 0, 1 hilang dari master.
- **FR-M9** **Kategori Investasi** dikelola Akuntansi: kategori, masa manfaat (bulan), dan COA penyusutan (5.4.x). Contoh: Bangunan 120, Peralatan Medis 60, Peralatan Non Medis 60, Kendaraan 48, Aset Tak Berwujud 48, PC/Laptop 60, AC 2 PK 60.
- **FR-M10** **Jenis COA** (kelompok biaya) diturunkan dari hierarki COA: 4.1 Bahan Medis, 4.2 Bahan Non medis, serta 5.1 sampai 5.99 dari sheet Kategori Biaya; dipakai untuk filter dan pengelompokan kolom laporan.
- **FR-M11** Harga ditetapkan per perusahaan. Master barang yang ada cocok dengan harga CN (2.822 dari 3.067 barang) tetapi tidak dengan CNH (239 dari 2.619), jadi CNH memerlukan daftar harga sendiri.
- **FR-M12** Atribut unit tambahan: kelompok (Instalasi atau Unit Bisnis), klasifikasi (Penunjang Intermediate, Pusat Laba), dan COA Pendapatan, sesuai template ERP.
- **FR-M13** Layar Akuntansi untuk menentukan COA pada permintaan barang baru dan menambahkannya ke master (FR-B9).

### 5.3 Periode RKAP

- **FR-P1** Akuntansi membuat periode (tahun RKAP, mis. 2027) per perusahaan dengan tenggat pengisian, tenggat validasi, dan tanggal lock.
- **FR-P2** Setelah tenggat, PIC tidak bisa mengubah (kecuali dibuka oleh Akuntansi).
- **FR-P3** Status periode: Persiapan, Pengisian, Validasi, Final, Ditutup.

* **FR-P4** Akuntansi menetapkan dan mengubah deadline per tahap (pengisian, validasi, lock) pada suatu periode, kapan saja selama periode belum Ditutup. Setiap perubahan tercatat di audit log dan dikirim sebagai notifikasi ke PIC dan Manager terkait.
* **FR-P5** Akuntansi dapat memberi deadline berbeda (perpanjangan) untuk unit tertentu, dan jika perlu hanya untuk satu jenis anggaran (Biaya atau Investasi), tanpa memengaruhi unit lain. Alasan wajib diisi.
* **FR-P6** Akuntansi dapat **menutup pengajuan** secara manual pada tingkat seluruh periode, unit tertentu, atau jenis anggaran tertentu. Saat ditutup, PIC dan Manager hanya dapat melihat (read-only): tidak dapat menambah, mengubah, menghapus, atau mengajukan. Data yang sudah tersimpan tidak berubah.
* **FR-P7** Akuntansi dapat **membuka kembali pengajuan** pada tingkat yang sama, dengan alasan wajib dan deadline baru (opsional). Unit terkait menerima notifikasi bahwa pengajuan dibuka kembali.
* **FR-P8** Pengajuan ditutup otomatis saat deadline terlewati. Penutupan otomatis dapat dimatikan di Pengaturan dan dicatat di audit log sebagai aksi sistem.
* **FR-P9** Akuntansi melihat papan status per unit: status buka atau tutup, deadline efektif, dan siapa yang terakhir mengubah. Pengingat otomatis dikirim pada H-3, H-1, dan saat penutupan (default, dapat diatur).
* **FR-P10** Saat pengajuan ditutup, halaman Entry menampilkan banner (status, deadline, kontak Akuntansi) dan tombol simpan serta ajukan dinonaktifkan.

- **FR-P11** Saat dokumen dikembalikan setelah pengisian ditutup, sistem membuka akses unit secara otomatis untuk dokumen tersebut sampai deadline validasi (BR-14). Akuntansi juga dapat membuka atau menutup secara manual kapan saja.

### 5.4 Entry Anggaran Biaya

- **FR-B1** PIC memilih unit dan periode, lalu mengisi qty RKAP per barang. Kolom tabel: No., Barang, Satuan, Harga, Real (rentang bulan yang dipilih), Qty RKAP, Jumlah (otomatis), dan **COA** di kolom paling kanan (kode, nama, dan jenis COA).
- **FR-B2** Filter berurutan: Cari barang (nama atau kode), Jenis COA, COA, Periode, dan rentang bulan realisasi (dari bulan sampai bulan). Opsi "hanya yang terisi".
- **FR-B3** Hanya barang yang punya riwayat realisasi unit tersebut yang ditampilkan di awal (data historis), dengan opsi "tambah barang dari master". Ini menggantikan 3.000 baris yang disalin per sheet.
- **FR-B4** Total otomatis per COA dan total unit, tampil sebagai ringkasan tetap di atas tabel.
- **FR-B5** Semua perubahan **tersimpan otomatis** sebagai Draft; tidak ada tombol Simpan draft. Indikator "Tersimpan otomatis" menampilkan jam terakhir. Penyimpanan harus mencegah dua pengguna saling menimpa data unit yang sama (versi baris atau penguncian ringan).
- **FR-B6** Kolom catatan/justifikasi per baris (wajib bila qty RKAP melebihi realisasi tahun berjalan lebih dari ambang persen yang diatur Akuntansi).
- **FR-B7** Import qty dari template Excel (opsional) untuk unit yang ingin mengisi offline.
- **FR-B8** Tabel dan daftar baris diberi nomor urut (No.) otomatis mengikuti tampilan; nomor berubah saat tabel difilter.
- **FR-B9** **Permintaan barang baru** (barang tidak ada di daftar): PIC mengisi nama barang, spesifikasi, satuan, qty, estimasi harga satuan, dan alasan. Status: Draft, Menunggu penentuan COA, COA ditentukan. Setelah dikirim, **Akuntansi menentukan COA** dan menambahkan barang ke master. Barang baru belum masuk total sampai COA ditentukan (BR-17).
- **FR-B10** Kolom Real per barang hanya terisi bila realisasi per barang dapat dibaca dari KETERANGAN jurnal (FR-R4); bila tidak, Entry menampilkan realisasi per COA.

### 5.5 Entry Anggaran Investasi

- **FR-I1** Form baris investasi: Kategori investasi (Bangunan, Peralatan Medis, Peralatan Non Medis, Kendaraan, Aset Tak Berwujud, PC/Laptop, AC 2 PK), Nama barang atau kegiatan, Qty, Harga satuan, Jumlah (otomatis), Bulan rencana (1-12), Prioritas, serta empat isian teks: Strategi objektif, Counter Measure (KPI), Program kerja / inisiatif strategis, dan Strategic action. **COA dan masa manfaat (susut) ditentukan otomatis dari kategori investasi**; PIC tidak memilih COA.
- **FR-I2** Validasi **BR-01**: nilai investasi per item harus lebih dari Rp 5.000.000; item yang kurang dari batas ditolak dengan pesan arahan untuk memasukkannya ke Anggaran Biaya.
- **FR-I3** Tidak ada lampiran file pada form investasi (dikeluarkan dari lingkup).
- **FR-I4** Total investasi per unit, per jenis, per prioritas, dan per bulan otomatis.
- **FR-I5** Penyusutan tahun RKAP = Jumlah ÷ masa manfaat (bulan) × (12 − bulan rencana; Januari = 1), ditampilkan per baris dan sebagai total (BR-16).
- **FR-I6** Empat isian teks memakai kotak teks selebar form yang melebar mengikuti isi, batas 300 karakter dengan penghitung, saran isian yang pernah dipakai unit (satu ketukan mengisi), tombol salin dari baris sebelumnya, dan baris detail yang bisa dibuka di tabel. Dasar angka: pada spreadsheet saat ini isian umumnya 40 sampai 50 karakter, terpanjang sekitar 130 (Strategic Action sekitar 230).
- **FR-I7** Tabel investasi bernomor urut dan menampilkan kolom COA, Susut (bulan), dan Penyusutan; tampilan terfilter jenis PC/Laptop tersedia lintas unit.

### 5.6 Workflow Approval

```
DRAFT -> DIAJUKAN -> (Manager) DISETUJUI -> (Akuntansi) FINAL (terkunci)
                 \-> DIKEMBALIKAN (catatan wajib) -> DRAFT
```

- **FR-W1** PIC atau Manager mengajukan dokumen anggaran unit (biaya dan investasi dapat diajukan terpisah).
- **FR-W2** Manager meninjau, dapat mengomentari per baris, lalu Setujui atau Kembalikan (catatan wajib). Manager yang juga mengisi tidak boleh menyetujui dokumen yang ia ajukan sendiri (maker-checker); persetujuan dilakukan Manager lain atau Akuntansi.
- **FR-W3** Akuntansi memfinalisasi per unit atau massal; dokumen FINAL terkunci dan masuk konsolidasi.
- **FR-W4** Riwayat status lengkap (siapa, kapan, catatan) ditampilkan di dokumen.
- **FR-W5** Notifikasi in-app ke pihak berikutnya pada setiap perubahan status dan pengingat menjelang tenggat.

* **FR-W6** Pengembalian dokumen setelah pengisian ditutup membuka akses unit secara otomatis dan mengirim notifikasi ke PIC; pengajuan ulang menutup akses itu kembali (BR-14).

### 5.7 Realisasi

- **FR-R1** Akuntansi mengunggah **daftar jurnal** (xlsx, export buku besar) per perusahaan; periode dideteksi dari kolom TANGGAL. Sistem hanya memakai akun biaya (4.x dan 5.x) dan akun aset tetap yang relevan (sekitar 14% baris pada contoh 620.848 baris), memetakan unit dari kode dalam kurung, lalu menampilkan pratinjau dan galat.
- **FR-R2** Penyimpanan per batch import (nama file, waktu, pengunggah, jumlah baris, jumlah galat) sehingga bisa dibatalkan (rollback) atau diganti.
- **FR-R3** Realisasi biaya = DEBET − KREDIT per COA, unit, dan bulan (BR-05). Realisasi investasi diambil dari akun aset tetap (1.2.1.1.x); Aset Dalam Pelaksanaan (1.2.1.3) dipindah ke aset tetap lewat jurnal IBA, jadi hanya satu sisi yang dihitung agar tidak ganda. Daftar akun dapat diubah di Pengaturan dan harus dikonfirmasi Akuntansi.
- **FR-R4** Baris dengan ID SUB JURNAL yang sudah ada diganti, bukan ditambah (BR-19); pilihan "Ganti data bulan ini" atau "Tambahkan saja". Realisasi per barang (opsional) dibaca dari KETERANGAN baris Pemakaian yang memuat ID barang dalam tanda kurung; baris yang gagal dibaca masuk daftar perlu dicek.
- **FR-R5** Antarmuka layanan realisasi dibuat modular agar sumber nanti dapat diganti API ERP tanpa mengubah dashboard.
- **FR-R6** Baris import yang gagal dipetakan masuk daftar "perlu dipetakan" dan tidak hilang.
- **FR-R7** Pemetaan unit: nama unit tanpa kode \[9xxx\] (pada contoh 10 nama) dan baris tanpa unit dipetakan sekali oleh Akuntansi; pemetaan disimpan dan dipakai pada unggahan berikutnya.
- **FR-R8** File besar (contoh 71 MB, 620 ribu baris untuk satu bulan) diproses di latar belakang dengan indikator progres; disarankan export hanya akun 4.x, 5.x, dan aset, atau format CSV.
- **FR-R9** Langkah Unggah, Pratinjau, Konfirmasi ditampilkan dalam satu warna; langkah aktif dibedakan dengan huruf tebal dan garis bawah.

### 5.8 Dashboard dan Laporan

- **FR-D1** Dashboard Akuntansi: total RKAP vs realisasi per perusahaan, per kelompok, per unit, per COA; progres pengisian (jumlah unit Draft/Diajukan/Disetujui/Final); unit terlambat.
- **FR-D2** Dashboard Manager dan PIC: ringkasan unit dalam cakupannya, status dokumen, notifikasi.
- **FR-D3** Penanda ambang pemakaian anggaran: kuning (default 80%) dan merah (100%), dapat diatur.
- **FR-D4** Laporan: Rekap Biaya per COA, Rekap Biaya per Unit, Rekap Investasi (per jenis, prioritas, bulan), Realisasi vs RKAP, Daftar Perlu Dilengkapi.
- **FR-D5** Semua laporan dapat difilter (perusahaan, kelompok, unit, periode, COA) dan diekspor ke **Excel** dan **PDF**.
- **FR-D6** Rekap gabungan CN dan CNH dalam satu tabel: dikelompokkan per perusahaan, lalu per unit dengan sekat (garis pemisah) dan subtotal di tiap unit, subtotal per perusahaan, dan total keseluruhan; dapat difilter dan diekspor ke Excel dan PDF.
- **FR-D7** Dua jenis laporan rekap, dipilih lewat tab. (1) **Rekap per unit**: CN dan CNH dalam satu tabel, dikelompokkan per perusahaan lalu per unit dengan sekat dan subtotal. (2) **Matriks unit × COA (format ERP)** mengikuti sheet BIAYA CN/CNH: satu baris per unit, kolom Company, Code, Analytic Group, Klasifikasi, satu kolom per COA dikelompokkan per Jenis COA dengan kolom TOTAL per kelompok, pita instalasi dengan subtotal, lalu TOTAL CN, TOTAL CNH, dan total gabungan. Export Excel mengikuti format template ERP; kolom lengkap (sekitar 160 kolom, 11 kelompok biaya, kolom Instalasi dan COA Pendapatan) dikonfirmasi.
- **FR-D8** Dashboard: pemakaian anggaran dipecah menjadi dua kartu, **anggaran biaya** dan **anggaran investasi**. Progres pengisian unit berupa bar dengan label di dalam tiap warna (Draft, Diajukan, Disetujui, Final) disertai keterangan arti status.

### 5.9 Audit Trail dan Notifikasi

- **FR-L1** Setiap create, update, delete pada data anggaran, master, dan role dicatat: pengguna, waktu, entitas, nilai lama dan baru.
- **FR-L2** Log tidak bisa diubah oleh pengguna aplikasi; hanya Akuntansi yang dapat melihat dan memfilter.
- **FR-N1** Pusat notifikasi (ikon lonceng dengan jumlah belum dibaca) sesuai prototype.

### 5.10 Fase 2 (P1) ringkas

- **FR-X1 Permintaan Anggaran dan Form ACC:** unit membuat permintaan penggunaan anggaran terhadap item RKAP; sistem menampilkan sisa anggaran; Manager dan Akuntansi menyetujui; **Form ACC Anggaran** dihasilkan otomatis sebagai PDF bernomor.
- **FR-X2 Pengalihan biaya:** pengajuan pemindahan anggaran antar COA/unit dengan alasan, persetujuan bertingkat, dan jejak audit; aturan mengikuti SOP tambahan dari Akuntansi.
- **FR-X3 Risk Register:** pencatatan risiko RKAP per unit/periode (deskripsi, kategori, dampak, kemungkinan, mitigasi, PIC, status) dan pemantauan.
- **FR-X4** Email notifikasi dan pengingat tenggat.
- **FR-X5** Isian SDM, PC & Laptop, serta Diklat & Tenaga mengikuti sheet tambahan di workbook CN.

## 6. Aturan Bisnis

| ID | Aturan |
| --- | --- |
| BR-01 | Item dengan nilai **lebih dari Rp 5.000.000** masuk Anggaran Investasi; nilai sampai Rp 5.000.000 masuk Anggaran Biaya. Ambang disimpan di Pengaturan (bukan hardcode). Dasar penilaian per item (harga satuan atau total) **dikonfirmasi** (lihat Pertanyaan Terbuka). |
| BR-02 | Setiap barang biaya wajib punya tepat satu COA. |
| BR-03 | Harga ditentukan per perusahaan dan per periode; perubahan harga tidak mengubah dokumen yang sudah FINAL (harga disalin ke baris dokumen saat disimpan). |
| BR-04 | Satu unit hanya milik satu perusahaan dan satu kelompok. |
| BR-05 | Realisasi biaya = DEBET − KREDIT pada akun 4.x dan 5.x dari daftar jurnal (tanpa status transaksi); realisasi investasi dari akun aset tetap, satu sisi saja. |
| BR-06 | Dokumen FINAL terkunci; pembukaan kembali hanya oleh Akuntansi dengan alasan dan tercatat di audit trail. |
| BR-07 | Pengaju tidak boleh menyetujui dokumennya sendiri. |
| BR-08 | Pengembalian dokumen wajib berisi catatan. |
| BR-09 | Semua nilai uang disimpan sebagai bilangan bulat rupiah; tampilan memakai pemisah ribuan titik. |
| BR-10 | Pengisian dan pengajuan hanya dapat dilakukan bila akses efektif unit TERBUKA: periode tidak ditutup, unit dan jenis anggaran tidak ditutup, dan waktu belum melewati deadline efektif (deadline unit bila ada, jika tidak deadline periode). |
| BR-11 | Kode unit `[9xxx]` unik dalam satu perusahaan. |
| BR-12 | Hanya Akuntansi yang dapat mengubah deadline serta menutup atau membuka pengajuan. Setiap aksi wajib tercatat: siapa, kapan, alasan, serta nilai lama dan baru. |
| BR-13 | Penutupan tidak menghapus data. Dokumen DRAFT tetap DRAFT dan tidak dapat diajukan. Dokumen DIAJUKAN tetap dapat divalidasi Manager selama tahap validasi belum ditutup. |
| BR-14 | Bila dokumen DIKEMBALIKAN (oleh Manager atau Akuntansi) saat pengisian sudah ditutup dan deadline validasi belum lewat, sistem otomatis membuka akses unit hanya untuk jenis anggaran dokumen itu (sumber AUTO\_RETURN) sampai deadline validasi atau sampai dokumen diajukan kembali, lalu menutupnya lagi. PIC menerima notifikasi. Akuntansi tetap dapat membuka atau menutup secara manual kapan saja dengan alasan, dan aksi manual menimpa pembukaan otomatis. Pengembalian setelah deadline validasi tidak membuka otomatis. Fitur ini dapat dimatikan lewat pengaturan auto\_reopen\_on\_return. |
| BR-15 | COA dan masa manfaat (susut) investasi ditentukan otomatis dari Kategori Investasi di master; PIC tidak memilih COA. |
| BR-16 | Penyusutan tahun RKAP = Jumlah ÷ masa manfaat (bulan) × (12 − bulan rencana), Januari = 1. Masa manfaat contoh: Bangunan 120, Peralatan Medis 60, Peralatan Non Medis 60, Kendaraan 48, Aset Tak Berwujud 48, PC/Laptop 60, AC 2 PK 60. |
| BR-17 | Barang dari permintaan barang baru belum masuk total anggaran sampai Akuntansi menentukan COA-nya. |
| BR-18 | Hanya Akuntansi yang menentukan COA barang baru dan menambahkannya ke master. |
| BR-19 | Setiap baris jurnal unik menurut ID SUB JURNAL; baris yang sudah ada diganti saat diunggah ulang. |

## 7. Model Data (Skema Logis)

Rekomendasi: PostgreSQL (versi stabil yang masih didukung). Seluruh tabel memiliki `id`, `created_at`, `updated_at`, `created_by`.

| Tabel | Kolom utama | Catatan |
| --- | --- | --- |
| companies | code (CN/CNH), name |  |
| org\_groups | company\_id, name, type (instalasi/unit\_bisnis) |  |
| units | company\_id, group\_id, code, name, is\_active | kode unik per perusahaan |
| users | name, email, password\_hash, is\_active |  |
| user\_roles | user\_id, role (PIC/MANAGER/AKUNTANSI) |  |
| user\_unit\_access | user\_id, unit\_id | cakupan data |
| coas | code, name, category (biaya/investasi), is\_active |  |
| items | code, name, uom, coa\_id, is\_active | master gabungan |
| item\_company | item\_id, company\_id, legacy\_id | pemetaan ID lama CN/CNH |
| item\_prices | item\_id, company\_id, period\_id, price |  |
| periods | company\_id, year, status, fill\_deadline, review\_deadline, lock\_date, submission\_state (BUKA/TUTUP), auto\_close |  |
| budget\_docs | period\_id, unit\_id, type (BIAYA/INVESTASI), status, submitted\_by, submitted\_at | satu dokumen per unit dan jenis |
| expense\_lines | doc\_id, item\_id, qty, price\_snapshot, amount, note |  |
| investment\_lines | doc\_id, investment\_type\_id, priority\_id, strategic\_objective, kpi, work\_program, strategic\_action, name, qty, price, amount, plan\_month, note |  |
| attachments | line\_id, file\_name, file\_path, size |  |
| doc\_status\_history | doc\_id, from\_status, to\_status, actor\_id, note, at |  |
| line\_comments | line\_id, author\_id, text | komentar Manager |
| investment\_types | name | referensi |
| priorities | name | referensi |
| import\_batches | company\_id, kind (realisasi/master), file\_name, uploaded\_by, rows\_total, rows\_error, status |  |
| realizations | batch\_id, unit\_id, item\_id, trx\_date, qty, amount, trx\_status, raw\_ref |  |
| unmapped\_rows | batch\_id, raw\_data, reason |  |
| audit\_logs | actor\_id, entity, entity\_id, action, old\_value, new\_value, at |  |
| notifications | user\_id, title, body, link, is\_read |  |
| settings | key, value | ambang investasi, ambang peringatan, filter status realisasi |
| (P1) budget\_requests, acc\_forms, budget\_transfers, risks |  | fase 2 |
| submission\_access | period\_id, unit\_id, doc\_type (BIAYA/INVESTASI/SEMUA), state (BUKA/TUTUP), deadline\_override, reason, changed\_by, changed\_at | pengecualian per unit dan jenis; menimpa aturan periode |
| investment\_categories | name, useful\_life\_months, depreciation\_coa\_id | dari Master COA sheet Kategori Investasi; menentukan COA dan susut |
| coa\_groups | code (4.1, 4.2, 5.1 ...), name; coas.group\_id | Jenis COA untuk filter dan kolom laporan |
| new\_item\_requests | doc\_id, unit\_id, name, spec, uom, qty, est\_price, reason, status, assigned\_coa\_id, assigned\_by, item\_id | status DRAFT, MENUNGGU\_COA, COA\_DITENTUKAN |
| unit\_aliases | company\_id, alias\_name, unit\_id | pemetaan nama unit di jurnal ke unit sistem |
| journal\_lines | batch\_id, sub\_journal\_id (unik), journal\_no, trx\_date, unit\_id, coa\_id, debit, credit, description, item\_id (opsional) | menggantikan realizations; hanya akun biaya dan aset yang disimpan |
| units (kolom tambahan) | classification, revenue\_coa\_id | mengikuti template ERP |
| investment\_lines (kolom tambahan) | category\_id, coa\_id, useful\_life\_months, depreciation\_amount, strategic\_action | coa, susut, dan penyusutan disalin saat disimpan; lampiran dihapus |

Indeks wajib: `realizations(unit_id, item_id, trx_date)`, `expense_lines(doc_id, item_id)`, `units(company_id, code)`.

## 8. Desain Antarmuka

Mengacu pada prototype di PPT (sidebar ungu, kartu menu, tabel entri).

### 8.1 Navigasi

Sidebar: **Dashboard, Entry, Proses, Display, Laporan, Pengaturan, Logout**. Header: pemilih perusahaan (CN/CNH), pemilih periode, lonceng notifikasi, nama pengguna dan role.

| Menu | Isi |
| --- | --- |
| Dashboard | Kartu ringkas, progres pengisian, grafik RKAP vs realisasi, daftar unit terlambat |
| Entry | Anggaran Biaya; Anggaran Investasi |
| Proses | Antrian validasi (Manager), Finalisasi (Akuntansi), Import Realisasi (Akuntansi), Deadline dan Buka/Tutup Pengajuan (Akuntansi); Fase 2: Permintaan, ACC, Pengalihan |
| Display | Lihat Anggaran Biaya, Anggaran Investasi (read-only per unit/COA); Fase 2: Permintaan |
| Laporan | Semua laporan dan ekspor |
| Pengaturan | Master data, periode, user, ambang, audit log (khusus Akuntansi) |

### 8.2 Halaman kunci

1. **Entry Anggaran Biaya:** tabel bernomor dengan header dan ringkasan total tetap; filter Cari barang, Jenis COA, COA, Periode, dan rentang bulan; kolom COA di paling kanan; tabel permintaan barang baru; edit inline qty; simpan otomatis; tombol Ajukan.
2. **Entry Investasi:** daftar bernomor dengan baris detail yang dapat dibuka, dan form dengan COA serta susut otomatis dari kategori investasi, empat kotak teks panjang dengan penghitung karakter, dan validasi BR-01.
3. **Antrian Validasi:** daftar dokumen Diajukan, buka dokumen, komentar per baris, tombol Setujui/Kembalikan.
4. **Import Realisasi:** unggah, pratinjau, ringkasan galat, konfirmasi.
5. **Dashboard Konsolidasi:** filter perusahaan dan kelompok, tabel RKAP vs realisasi dengan indikator warna, drill-down unit lalu COA lalu barang.

Halaman tambahan untuk Akuntansi: **Pengaturan Periode dan Pengajuan**, berisi deadline per tahap, tombol Tutup dan Buka pengajuan (periode, unit, atau jenis anggaran) dengan kolom alasan, serta tabel status per unit (buka atau tutup, deadline efektif, perubahan terakhir).

### 8.3 Prinsip UX

Bahasa Indonesia; responsif untuk desktop dan tablet; keyboard-friendly pada tabel; konfirmasi sebelum aksi tak terbalikkan; pesan galat yang menyebut baris dan cara memperbaiki; mode terang (gelap opsional).

## 9. Persyaratan Non-Fungsional

- **Keamanan:** otorisasi di server; hash password (bcrypt/argon2); proteksi CSRF dan XSS; HTTPS; pembatasan ukuran dan tipe unggahan; secret di variabel lingkungan; tidak ada data produksi di repo.
- **Kinerja:** halaman entry 3.000 baris memuat kurang dari 3 detik dengan virtualisasi atau paginasi sisi server; dashboard konsolidasi kurang dari 3 detik; import 50.000 baris realisasi kurang dari 60 detik.
- **Ketersediaan dan cadangan:** backup database harian; pemulihan diuji sebelum go-live.
- **Auditabilitas:** lihat FR-L1.
- **Kompatibilitas:** Chrome, Edge, Firefox versi terkini.
- **Aksesibilitas:** kontras memadai, label form jelas.
- **Pengujian:** unit test untuk aturan bisnis (BR-01 sampai BR-11), uji integrasi untuk workflow dan izin, uji import dengan file contoh nyata yang dianonimkan.

## 10. Arsitektur dan Tech Stack (Rekomendasi)

Pendekatan: dua aplikasi dalam satu repositori, yaitu backend Express (REST API) dan frontend React (SPA, dibangun dengan Vite). Setiap menu adalah **halaman React** (React Router) dengan **komponen interaktif** seperti tabel entri, dashboard, dan dialog. Data dibaca dan disimpan lewat endpoint `/api` (sesi cookie dengan token CSRF). Frontend tidak memuat aturan bisnis.

| Lapisan | Pilihan |
| --- | --- |
| Backend | Node.js (LTS) dengan Express 5 sebagai REST API; JavaScript (CommonJS), mengikuti kode yang sudah ada |
| Routing frontend | React Router: halaman Dashboard, Entry, Proses, Display, Laporan, Pengaturan dengan guard berdasarkan role (hanya kenyamanan; otorisasi tetap di server) |
| Frontend | React 19 dengan Vite 8 dan Axios; bahasa JavaScript (JSX); react-router-dom untuk routing; TanStack Query untuk data server bila diperlukan; Zod untuk validasi form |
| UI | Tailwind CSS; tabel entri dengan TanStack Table dan virtualisasi (TanStack Virtual); grafik Recharts atau Chart.js |
| Database | PostgreSQL (driver pg); manfaatkan constraint, indeks, dan tipe bigint untuk nilai rupiah |
| ORM dan migrasi | Tanpa ORM: driver pg dengan SQL berparameter lewat backend/db.js; migrasi SQL memakai node-pg-migrate atau berkas .sql berurutan |
| Autentikasi | Sesi cookie httpOnly (express-session dengan penyimpanan di PostgreSQL) karena frontend dan API satu domain di balik reverse proxy; password di-hash (argon2 atau bcrypt); perlindungan CSRF (double-submit token); rate limit pada login |
| Otorisasi | Middleware requireRole dan requireUnitAccess; filter unit diterapkan di lapisan repository agar tidak terlewat |
| Validasi | Zod di server; validasi di React hanya untuk kenyamanan |
| Excel | ExcelJS (baca dan tulis xlsx); import diproses lewat stream |
| PDF | Puppeteer (HTML ke PDF) atau PDFKit |
| Antrean dan jadwal | pg-boss (antrean berbasis PostgreSQL, tanpa Redis) dan jadwal cron untuk penutupan otomatis, pengingat deadline, dan pemrosesan import |
| Notifikasi | Tabel notifications di PostgreSQL (in-app, polling atau SSE); email di Fase 2 (Nodemailer) |
| Pengujian | Vitest (unit) dan Supertest (API), React Testing Library untuk komponen, Playwright untuk e2e |
| Kualitas kode | ESLint dan Prettier |
| Deploy | Docker Compose (nginx untuk file statis React dan reverse proxy, Node/Express, PostgreSQL) pada server internal atau VPS |

### Struktur folder yang diharapkan

```
/backend             (sudah ada: index.js, db.js, .env.example)
  /src/routes        route Express per modul (auth, master, periods, budget-docs, ...)
  /src/controllers   tipis: validasi (Zod), panggil service, bentuk respons
  /src/services      BudgetService, ApprovalService, SubmissionAccessService,
                     RealizationImportService, AuditService
  /src/middleware    auth, requireRole, requireUnitAccess, csrf, errorHandler
  /src/repositories  query PostgreSQL berparameter lewat db.js (filter unit diterapkan di sini)
  /src/jobs          pg-boss: auto-close deadline, pengingat, import realisasi
  /src/validators    skema Zod
  /migrations        migrasi SQL (menambah, tidak mengubah kolom yang sudah dipakai)
  /seeds             data fiktif
  /tests             unit (services) dan API (Supertest)
/frontend            (sudah ada: Vite, React 19, Axios)
  /src/pages         Dashboard, Entry, Proses, Display, Laporan, Pengaturan
  /src/components    tabel entri, kartu dashboard, dialog, banner status
  /src/api           client API (Axios) dan hooks
  /src/auth          context pengguna, route guard
/docs                PRD.md, DECISIONS.md, PRD_Sistem_RKAP_DIA_CAPEX.pdf, SOP-import.md
```

### Prinsip arsitektur

- Controller tipis; aturan bisnis hanya di `/backend/src/services` dan memiliki test.
- React tidak memuat aturan bisnis; React hanya menampilkan data dan memanggil API.
- Otorisasi di server: middleware requireRole dan requireUnitAccess pada setiap route, filter unit di lapisan repository.
- Seluruh mutasi melewati observer atau `AuditService`.
- Status akses pengajuan (buka, tutup, deadline efektif) dihitung terpusat di `SubmissionAccessService` dan dipakai oleh semua endpoint tulis serta banner di halaman Entry.
- Sumber realisasi berada di balik interface `RealizationSource`; implementasi saat ini `XlsxUploadSource` (unggah manual oleh Akuntansi).
- Nilai uang disimpan sebagai `unsignedBigInteger` (rupiah).

## 11. Migrasi Data

| Langkah | Detail |
| --- | --- |
| 1 | Bersihkan master: COA kosong, ID bentrok, duplikat nama; Akuntansi memverifikasi perbedaan harga CN vs CNH |
| 2 | Skrip seed: perusahaan, kelompok, unit (dari sheet MENU), COA, jenis investasi, prioritas |
| 3 | Import master barang gabungan dengan `item_company` untuk ID lama |
| 4 | Import harga per perusahaan |
| 5 | (Opsional) Import isian RKAP 2027 yang sudah ada dari sheet unit sebagai Draft |
| 6 | Import realisasi dari `export_input_pemakaian_logistik` CN dan CNH |
| 7 | Rekonsiliasi: total per COA dan per unit di sistem harus sama dengan spreadsheet (selisih dicatat dan dijelaskan) |

## 12. Rencana Build di Antigravity (Vibe Coding)

### 12.1 Aturan untuk agent (simpan sebagai aturan proyek)

1. Ikuti `docs/PRD.md`; jangan menambah fitur di luar fase yang sedang dikerjakan.
2. JavaScript (CommonJS di backend, JSX di frontend) mengikuti kode yang ada; validasi input dengan Zod; format kode dengan Prettier dan ESLint.
3. Aturan bisnis hanya di `backend/src/services`, dengan test Vitest.
4. React tidak boleh memuat aturan bisnis atau otorisasi; semua dicek di server dengan middleware requireRole dan requireUnitAccess.
5. Komponen React berupa function component dengan hooks; data server lewat TanStack Query; routing dengan React Router.
6. Setiap mutasi data tercatat lewat observer atau `AuditService`.
7. Nilai uang bilangan bulat rupiah; tidak memakai float.
8. Jangan hardcode ambang (5 juta, 80%, 100%) maupun deadline; baca dari tabel `settings` dan `periods`.
9. Sebelum selesai satu fase: jalankan ESLint, Vitest, dan Supertest di backend serta build di frontend (hanya skrip yang benar-benar ada), lalu jelaskan cara menjalankannya.
10. Jangan menyimpan data asli perusahaan di repo; gunakan seeder fiktif.
11. Tanpa ORM: semua query SQL berparameter (`$1`, `$2`, ...) lewat `backend/db.js`; jangan merangkai SQL dari input pengguna.

### 12.2 Fase dan prompt awal

| Fase | Cakupan | Definition of Done |
| --- | --- | --- |
| 0. Fondasi | Bangun di atas starter yang sudah ada (backend Express + pg, frontend React/Vite): .gitignore akar, pecah backend menjadi routes/controllers/services/repositories, migrasi SQL tabel P0, seed fiktif (2 perusahaan, 6 unit, 12 COA, 50 barang), Vitest + Supertest, Tailwind dan React Router, layout sidebar sesuai mockup | Aplikasi berjalan, migrate dan seed berhasil, halaman kosong tiap menu tampil |
| 1. Auth dan RBAC | Login sesi cookie, 3 role, penugasan unit, middleware requireRole dan requireUnitAccess | Tes izin sesuai matriks bagian 3.2 lulus |
| 2. Master data | CRUD master, import master xlsx, laporan kualitas master | Import file contoh dengan galat menghasilkan laporan per baris |
| 3. Periode, deadline, buka/tutup | Periode, deadline per tahap dan per unit, `SubmissionAccessService`, tutup dan buka manual, penutupan otomatis dan pengingat lewat Scheduler, banner di halaman Entry | Unit yang ditutup tidak dapat menyimpan atau mengajukan; pengecualian unit menimpa aturan periode; penutupan otomatis berjalan pada deadline uji |
| 4. Entry Biaya | Tabel entri (komponen React), total per COA, simpan otomatis, filter COA | Isi 100 baris, total benar, tersimpan |
| 5. Entry Investasi | Form, validasi BR-01, COA dan susut otomatis, penyusutan, teks panjang | Item Rp 4 juta ditolak, Rp 6 juta diterima |
| 6. Workflow | Status, antrian validasi, komentar, kunci, audit, pembukaan otomatis saat dikembalikan (BR-14) | Skenario Draft sampai Final lulus; pengembalian setelah deadline pengisian membuka unit otomatis |
| 7. Realisasi | Upload manual daftar jurnal, pemetaan unit, batch, rollback, aturan debet − kredit | Angka realisasi cocok dengan contoh hitung manual |
| 8. Dashboard dan Laporan | Dashboard, laporan, ekspor Excel dan PDF, notifikasi | RKAP vs realisasi dapat di-drill hingga barang |
| 9. Hardening dan migrasi | Rekonsiliasi, performa, backup, dokumentasi | Rekonsiliasi lulus; UAT dengan 2 unit per perusahaan |

### 12.3 Contoh prompt pembuka (Fase 0)

> Baca `AGENTS.md` dan `docs/PRD.md`. Proyek sudah punya starter di `backend/` (Express 5, pg) dan `frontend/` (React 19, Vite); jangan dibuat ulang. Kerjakan Fase 0 saja di atasnya: `.gitignore` akar, pecah backend menjadi routes, controllers, services, repositories tanpa mengubah `/api/health` dan `/api/test-db`, migrasi SQL untuk tabel P0 pada bagian 7, seed data fiktif, Vitest + Supertest, Tailwind dan React Router di frontend, serta layout sidebar Dashboard, Entry, Proses, Display, Laporan, Pengaturan sesuai bagian 8 dan mockup. Buat rencana dulu dan tunggu persetujuan saya. Jangan implementasikan fitur fase berikutnya.

Setiap fase berikutnya memakai pola yang sama: rujuk nomor FR dan BR, minta rencana implementasi dulu (review), baru kode, lalu tes.

## 13. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Master data CN/CNH belum bersih (D1 sampai D3) | Fase 2 menyediakan laporan kualitas; Akuntansi verifikasi sebelum UAT |
| Resistensi pengguna terhadap sistem baru | Pelatihan singkat, panduan, dan masa paralel dengan spreadsheet satu siklus |
| Aturan bisnis ambigu (lihat bagian 14) | Dikonfirmasi sebelum fase terkait dimulai |
| Format export ERP berubah | Pemetaan kolom konfigurabel dan validasi header |
| Kinerja tabel 3.000 baris | Tampilkan barang berdasar riwayat, virtualisasi, paginasi server |
| Trial error validasi data (disebut di PPT) | UAT bertahap dan rekonsiliasi dengan spreadsheet |

## 14. Pertanyaan Terbuka (Perlu Keputusan Pengusul Ide)

1. **Realisasi:** diputuskan: data pemakaian logistik di-upload manual oleh Akuntansi (bukan API ERP). Rupiah realisasi diambil dari nilai transaksi atau qty x harga master?
2. **Ambang investasi Rp 5 juta:** dinilai per item (harga satuan), per total baris, atau per pengadaan?
3. **Status realisasi:** apakah Draft dan Pengajuan memang sengaja ikut dihitung di spreadsheet saat ini?
4. **Manager:** satu atau banyak Manager per unit? Apakah ada tingkat persetujuan di atas Manager (mis. Direktur)?
5. **Tiga kategori lain** (PC & Laptop, Diklat & Tenaga, Tanah/Bangunan koordinasi): masuk investasi dengan form khusus atau modul terpisah (P1)?
6. **Perbedaan harga CN vs CNH:** sah (harga beli berbeda) atau selisih data?
7. **COA lengkap:** daftar resmi dan struktur induk-anak dari Akuntansi.
8. **Form ACC Anggaran dan Pengalihan Biaya:** template dan SOP-nya; masuk MVP atau fase 2?
9. **Hosting:** server internal KDCTI atau cloud; kebutuhan SSO?
10. **Penyusutan dan CF/LR/Neraca:** tetap di spreadsheet atau masuk sistem (fase 3)?

11) **Pengembalian setelah pengisian ditutup:** diputuskan: unit dibuka otomatis hanya untuk dokumen yang dikembalikan sampai deadline validasi, dan Akuntansi tetap dapat membuka secara manual kapan saja (lihat BR-14).

12. **Akun realisasi investasi:** akun aset tetap (1.2.1.1.x) atau Aset Dalam Pelaksanaan (1.2.1.3)? Hanya satu sisi yang dihitung agar tidak ganda; Akuntansi memastikan daftar akunnya.
13. **Master dan harga CNH:** file master mana yang dipakai CNH? Master yang ada cocok dengan harga CN, bukan CNH.
14. **35 barang yang COA-nya berubah:** master baru atau spreadsheet lama yang benar?
15. **Kategori investasi:** "Tanah & Bangunan" dan "Knowledge" tidak ada di Master COA; dihapus sengaja? Bagaimana jenis tanpa susut?
16. **Export matriks:** harus persis template ERP (sekitar 160 kolom, 11 kelompok biaya, kolom Instalasi dan COA Pendapatan)? Dibutuhkan file template aslinya.
17. **Realisasi per barang:** dibaca dari KETERANGAN jurnal, memakai export logistik lama, atau cukup per COA?
18. **Diklat dan Tenaga:** nilai rupiah per peserta atau total? Apakah jadwal "Sesuai jadwal pelaksanaan" tetap diizinkan?
19. **Strategi objektif, KPI, Program kerja:** dikelola sekali per unit lalu dipilih per baris, atau diketik bebas per baris?
20. **Cakupan MVP:** apakah SDM, Diklat dan Tenaga, serta Laptop dan PC ikut MVP?
21. **Format jurnal CNH:** apakah sama dengan jurnal CN (21 kolom, kode unit dalam kurung)?

## 15. Kriteria Penerimaan MVP

- PIC dapat mengisi Anggaran Biaya dan Investasi unitnya, dan tidak dapat melihat unit lain.
- Item investasi di bawah ambang ditolak otomatis.
- Manager dapat mengembalikan dengan catatan dan menyetujui; tidak dapat menyetujui dokumennya sendiri.
- Akuntansi dapat memfinalisasi, mengunci, dan membuka kembali dengan alasan.
- Import realisasi CN dan CNH menghasilkan angka yang cocok dengan spreadsheet pada sampel unit yang disepakati.
- Dashboard menampilkan RKAP vs realisasi per perusahaan, unit, dan COA, serta dapat diekspor ke Excel dan PDF.
- Seluruh perubahan tercatat pada audit log.
- Seluruh tes aturan bisnis dan izin lulus.

* Akuntansi dapat menetapkan deadline, menutup, dan membuka kembali pengajuan per periode, unit, atau jenis anggaran; saat ditutup, PIC dan Manager tidak dapat mengubah atau mengajukan.

- Pengembalian dokumen setelah pengisian ditutup membuka akses unit otomatis untuk dokumen tersebut sampai deadline validasi, dan Akuntansi dapat membuka atau menutup secara manual.

## 16. Catatan Perubahan Versi 1.2

- Sumber realisasi berubah dari export logistik (dengan status) menjadi daftar jurnal (debet dikurangi kredit); BR-05 dan FR-R1 sampai FR-R9 disesuaikan.
- Entry Anggaran Biaya: filter baru, kolom COA di kanan, permintaan barang baru, simpan otomatis, dan nomor urut.
- Entry Anggaran Investasi: COA dan susut otomatis dari Kategori Investasi, rumus penyusutan, empat isian teks panjang, lampiran dihapus.
- Master data memakai Master COA (tiga sheet) dan Master Barang Logistik; Jenis COA, kategori investasi, dan atribut unit ditambahkan.
- Laporan: dua jenis (Rekap per unit dan Matriks unit × COA format ERP); dashboard memecah pemakaian biaya dan investasi.
- Tabel pemetaan spreadsheet (bagian 2.5) dikoreksi: PC & LAPTOP tercakup lewat Entry Investasi; DIKLAT & TENAGA dan SDM adalah usulan MVP yang menunggu keputusan.
- Stack disesuaikan dengan proyek yang berjalan: backend (Express 5, pg, JavaScript) dan frontend (React 19, Vite), tanpa ORM.
