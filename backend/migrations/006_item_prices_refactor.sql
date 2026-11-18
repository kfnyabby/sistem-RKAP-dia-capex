-- Migration: 006_item_prices_refactor.sql
-- Description: Satu harga per barang per perusahaan (tanpa periode), tabel item_price_history

-- 1. Bersihkan duplikasi (item_id, company_id) jika ada data lama lintas periode (simpan data terbaru)
DELETE FROM item_prices ip1
USING item_prices ip2
WHERE ip1.id < ip2.id
  AND ip1.item_id = ip2.item_id
  AND ip1.company_id = ip2.company_id;

-- 2. Hapus foreign key dan constraint unik lama yang melibatkan period_id
ALTER TABLE item_prices DROP CONSTRAINT IF EXISTS uq_item_prices;
ALTER TABLE item_prices DROP CONSTRAINT IF EXISTS item_prices_period_id_fkey;

-- 3. Hapus kolom period_id dari item_prices
ALTER TABLE item_prices DROP COLUMN IF EXISTS period_id;

-- 4. Tambah kolom updated_by jika belum ada
ALTER TABLE item_prices ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES users(id);

-- 5. Tambah constraint unik baru: satu harga per barang per perusahaan
ALTER TABLE item_prices ADD CONSTRAINT uq_item_prices_item_company UNIQUE (item_id, company_id);

-- 6. Tabel item_price_history (mencatat jejak perubahan harga)
CREATE TABLE IF NOT EXISTS item_price_history (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    old_price BIGINT NOT NULL DEFAULT 0,
    new_price BIGINT NOT NULL,
    source VARCHAR(20) NOT NULL, -- 'import' atau 'manual'
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_item ON item_price_history(item_id, company_id);
