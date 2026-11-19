-- Migrasi 008: Penyempurnaan Tabel new_item_requests (Fase 3b)
-- 1. Mengubah tipe qty menjadi NUMERIC(14,2) agar konsisten dengan expense_lines
-- 2. Menambahkan kolom manual_handling_note untuk catatan jika dokumen bukan DRAFT saat penetapan COA
-- 3. Menambahkan kolom version untuk optimis concurrency / version tracking
-- 4. Membuat indeks performa untuk doc_id, unit_id, dan status

ALTER TABLE new_item_requests 
  ALTER COLUMN qty TYPE NUMERIC(14,2);

ALTER TABLE new_item_requests 
  ADD COLUMN IF NOT EXISTS manual_handling_note TEXT;

ALTER TABLE new_item_requests 
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_new_item_requests_doc_id ON new_item_requests(doc_id);
CREATE INDEX IF NOT EXISTS idx_new_item_requests_unit_id ON new_item_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_new_item_requests_status ON new_item_requests(status);
