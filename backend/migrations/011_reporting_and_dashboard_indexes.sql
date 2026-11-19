-- Migrasi 011: Indeks Performa untuk Dashboard & Laporan (Fase 7)
-- Menambahkan indeks-indeks pendukung agregasi SQL untuk mempercepat pembacaan matriks,
-- konsolidasi rekapitulasi, dashboard summary, progress pengisian, dan perbandingan anggaran vs realisasi.

-- 1. Indeks pada budget_docs untuk percepatan pencarian dokumen per periode, tipe, dan status
CREATE INDEX IF NOT EXISTS idx_budget_docs_period_type_status ON budget_docs(period_id, type, status);

-- 2. Indeks pada units untuk percepatan join hierarki organisasi per perusahaan dan kelompok instalasi
CREATE INDEX IF NOT EXISTS idx_units_company_group ON units(company_id, group_id);

-- 3. Indeks pada coas untuk percepatan pengelompokan akun per Jenis COA (coa_groups)
CREATE INDEX IF NOT EXISTS idx_coas_group_id ON coas(group_id);

-- 4. Indeks pada journal_lines untuk percepatan agregasi transaksi realisasi per unit dan tanggal
CREATE INDEX IF NOT EXISTS idx_journal_lines_status_unit_date ON journal_lines(status, unit_id, trx_date);

-- 5. Indeks pada import_batches untuk percepatan pencarian batch buku besar berstatus CONFIRMED
CREATE INDEX IF NOT EXISTS idx_import_batches_company_period_status ON import_batches(company_id, period, status);
