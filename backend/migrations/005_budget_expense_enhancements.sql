-- Migration: 005_budget_expense_enhancements.sql
-- Description: Penambahan versioning untuk optimistic locking dan constraint keunikan item pada expense_lines

-- 1. Tambah kolom version pada expense_lines dan budget_docs
ALTER TABLE expense_lines ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE budget_docs ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- 2. Tambah constraint keunikan per doc dan item pada expense_lines
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_expense_lines_doc_item'
    ) THEN
        ALTER TABLE expense_lines ADD CONSTRAINT uq_expense_lines_doc_item UNIQUE (doc_id, item_id);
    END IF;
END $$;

-- 3. Indeks performa untuk query dokumen dan agregasi baris
CREATE INDEX IF NOT EXISTS idx_expense_lines_doc_id ON expense_lines (doc_id);
CREATE INDEX IF NOT EXISTS idx_expense_lines_item_id ON expense_lines (item_id);

