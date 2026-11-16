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

-- 2. Tabel import_logs untuk menyimpan riwayat dan metrik import master data
CREATE TABLE IF NOT EXISTS import_logs (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- ITEMS, COAS
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

-- Index pencarian barang
CREATE INDEX IF NOT EXISTS idx_items_product_code ON items(product_code);
CREATE INDEX IF NOT EXISTS idx_items_group_name ON items(group_name);

