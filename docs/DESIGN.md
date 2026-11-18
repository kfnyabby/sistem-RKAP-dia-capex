# DESIGN.md — Acuan tampilan Sistem RKAP

Sumber: mockup kanvas (sudah dipakai untuk diskusi dengan pemilik proyek). Warna sidebar **bukan** ungu seperti di PPT Ideabox; ikuti nilai di bawah. Daftarkan nilai ini sebagai token di tema Tailwind (`@theme` di `frontend/src/index.css`), jangan menulis kode hex berulang di komponen.

## Font
Plus Jakarta Sans (400, 500, 600, 700), cadangan `system-ui, sans-serif`. Ukuran dasar 14px.

## Warna
| Token | Hex | Pemakaian |
|---|---|---|
| `ink` | `#232B4A` | Sidebar, kolom TOTAL gelap, segmen "Final" |
| `ink-active` | `#3A4577` | Menu sidebar aktif |
| `ink-text` | `#D5D9EE` | Teks menu sidebar |
| `canvas` | `#FAF7F2` | Latar halaman |
| `card-border` | `#E6E0D6` | Garis kartu dan tabel |
| `row-border` | `#F0EBE2` | Garis antar baris tabel |
| `text` | `#1F2233` | Teks utama |
| `muted` | `#5E6070` | Label dan keterangan |
| `primary` | `#3D4E9C` | Tombol utama, tab aktif, baris total gabungan |
| `input-border` | `#B9B4C9` | Garis kolom isian |

Chip status (latar / teks): hijau `#DDF1E4` / `#14532D`, kuning `#FBE8C8` / `#7A3E00`, merah `#F8D9D6` / `#8A1F1B`, netral `#ECE8F5` / `#3A3F63`.

Progres pengisian unit (label di dalam warna): Draft `#B9B4C9` teks `#1F2233`; Diajukan `#E0A030` teks `#2B1B00`; Disetujui `#2F7F5B` teks putih; Final `#232B4A` teks putih.

Akses cepat dashboard: Entry `#D9533D` di `#FDE7E2`; Proses `#B7791F` di `#FBEFD2`; Display `#2F7F5B` di `#DDF0E6`.

Matriks unit × COA: pita kelompok COA `#F6E7B4` teks `#4A3500`; pita instalasi `#2F7F5B` teks putih; subtotal `#E4DDF3`; baris total CN + CNH `#3D4E9C` teks putih.

## Aturan tampilan
- Warna tidak boleh menjadi satu-satunya pembawa makna: selalu sertakan teks (misalnya "88% · Waspada").
- Target sentuh minimal 44px untuk tombol dan isian.
- Setiap tabel data punya kolom **No.** di paling kiri; nomor mengikuti urutan tampil.
- Angka uang rata kanan dengan pemisah ribuan titik (`1.728.000`), tanpa desimal.
- Semua perubahan tersimpan otomatis; tampilkan chip "Tersimpan otomatis · jam" dan jangan beri tombol Simpan draft.
- Langkah Unggah, Pratinjau, Konfirmasi memakai satu warna; langkah aktif dibedakan huruf tebal dan garis bawah.
- Teks panjang (strategi, KPI, program kerja, strategic action) memakai kotak teks selebar form dengan penghitung karakter.
- Tabel lebar (matriks) digulir mendatar di dalam wadahnya; kolom Company dan Unit tetap terlihat.
- Label dan pesan galat berbahasa Indonesia.
