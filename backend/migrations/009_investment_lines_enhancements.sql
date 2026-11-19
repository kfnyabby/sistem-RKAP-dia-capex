-- Migrasi 009: Penyempurnaan Tabel investment_lines & Pengaturan Investasi (Fase 4)
-- 1. Menambahkan kolom version untuk optimistic locking (bentrok edit)
-- 2. Menambahkan indeks doc_id, category_id, dan priority_id
-- 3. Memasukkan pengaturan dasar penilaian ambang dan batas karakter teks investasi

ALTER TABLE investment_lines
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_investment_lines_doc_id ON investment_lines(doc_id);
CREATE INDEX IF NOT EXISTS idx_investment_lines_category_id ON investment_lines(category_id);
CREATE INDEX IF NOT EXISTS idx_investment_lines_priority_id ON investment_lines(priority_id);

-- Pengaturan dasar penilaian ambang batas investasi: 'unit_price' (default) atau 'line_total'
INSERT INTO settings (key, value, description)
VALUES (
  'investment_threshold_basis',
  '"unit_price"',
  'Dasar penilaian ambang batas investasi: unit_price atau line_total'
)
ON CONFLICT (key) DO NOTHING;

-- Batas maksimum karakter untuk 4 isian teks panjang investasi (default 300)
INSERT INTO settings (key, value, description)
VALUES (
  'investment_text_max_length',
  '300',
  'Batas maksimum karakter untuk 4 isian teks investasi'
)
ON CONFLICT (key) DO NOTHING;
