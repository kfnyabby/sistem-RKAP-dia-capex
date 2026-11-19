-- Migrasi 007: Realization & Journal Enhancements (Fase 6)
-- Menambahkan kolom progres dan metrik pada import_batches, metadata baris pada journal_lines,
-- serta tabel realization_errors untuk pelacakan baris unmapped/unmatched.

-- 1. Penambahan kolom pada import_batches
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'replace_month';
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS file_path VARCHAR(500);
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS progress_percent INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS rows_read INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS rows_expense INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS rows_investment INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS rows_skipped INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS rows_without_unit INT DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS read_seconds NUMERIC(10,2) DEFAULT 0;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS raw_summary JSONB;

-- 2. Penambahan kolom dan indeks pada journal_lines
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS raw_unit VARCHAR(255);
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS raw_coa_code VARCHAR(100);
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS raw_coa_name VARCHAR(255);
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'PREVIEW';

CREATE INDEX IF NOT EXISTS idx_journal_lines_batch_id ON journal_lines(batch_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_sub_journal_id ON journal_lines(sub_journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_unit_coa_date ON journal_lines(unit_id, coa_id, trx_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_status ON journal_lines(status);

-- 3. Pembuatan tabel realization_errors
CREATE TABLE IF NOT EXISTS realization_errors (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    sub_journal_id VARCHAR(100),
    row_number INT,
    error_type VARCHAR(50) NOT NULL, -- UNMAPPED_UNIT, NO_UNIT, UNMATCHED_ITEM, UNKNOWN_COA, HEADER_ERROR, SYSTEM_ERROR
    raw_data JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realization_errors_batch_id ON realization_errors(batch_id);
CREATE INDEX IF NOT EXISTS idx_realization_errors_type ON realization_errors(error_type);
