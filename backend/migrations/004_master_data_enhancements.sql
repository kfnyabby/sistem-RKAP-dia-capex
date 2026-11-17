-- Migrasi 004: Penambahan Atribut Master Data & Tabel Log Import

-- 1. Penambahan kolom pelengkap pada tabel items sesuai format Master Barang Logistik
ALTER TABLE items ADD COLUMN IF NOT EXISTS product_code VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS group_name VARCHAR(150);
ALTER TABLE items ADD COLUMN IF NOT EXISTS inventory_coa_id INT REFERENCES coas(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS coa_category VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS producer VARCHAR(255);
ALTER TABLE items ADD COLUMN IF NOT EXISTS sell_uom VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS max_stock INT DEFAULT 0;

-- Memperbolehkan coa_id bernilai NULL agar barang baru impor tanpa COA dapat ditampung untuk laporan kualitas
ALTER TABLE items ALTER COLUMN coa_id DROP NOT NULL;

-- 2. Penyesuaian skema Master Unit dan Kelompok Organisasi (org_groups)
-- Kolom units.code diperbolehkan NULL (untuk unit yang belum memiliki kode resmi)
ALTER TABLE units ALTER COLUMN code DROP NOT NULL;

-- Hapus constraint keunikan lama bila ada
ALTER TABLE units DROP CONSTRAINT IF EXISTS uq_units_company_code;

-- Keunikan kode hanya untuk kode terisi per perusahaan (conditional/partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_units_company_code_filled
ON units (company_id, code)
WHERE code IS NOT NULL AND code <> '';

-- Kolom source_key (ID Draf seperti CN-001, CNH-001), unik per perusahaan
ALTER TABLE units ADD COLUMN IF NOT EXISTS source_key VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS uq_units_company_source_key
ON units (company_id, source_key)
WHERE source_key IS NOT NULL AND source_key <> '';

-- Kolom penanda isu / perlu review Akuntansi
ALTER TABLE units ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;

-- Kolom nama & kode COA Pendapatan langsung dari template/draf
ALTER TABLE units ADD COLUMN IF NOT EXISTS revenue_coa_code VARCHAR(50);
ALTER TABLE units ADD COLUMN IF NOT EXISTS revenue_coa_name VARCHAR(255);

-- Kolom catatan akuntansi / riwayat isu draf
ALTER TABLE units ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS order_no INT DEFAULT 0;

-- Kolom hierarki parent_id pada tabel org_groups
ALTER TABLE org_groups ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES org_groups(id) ON DELETE SET NULL;

-- 3. Tabel import_logs untuk menyimpan riwayat dan metrik import master data
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- ITEMS, COAS, UNITS
    filename VARCHAR(255),
    total_read INT DEFAULT 0,
    matched_existing INT DEFAULT 0,
    new_items INT DEFAULT 0,
    coa_changed INT DEFAULT 0,
    hpp_zero INT DEFAULT 0,
    missing_coa INT DEFAULT 0,
    unknown_coa INT DEFAULT 0,
    raw_summary JSONB,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pencarian barang & unit
CREATE INDEX IF NOT EXISTS idx_items_product_code ON items(product_code);
CREATE INDEX IF NOT EXISTS idx_items_group_name ON items(group_name);
CREATE INDEX IF NOT EXISTS idx_units_needs_review ON units(needs_review);
CREATE INDEX IF NOT EXISTS idx_units_source_key ON units(source_key);
