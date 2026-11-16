-- Migrasi 003: Penghapusan tabel user_roles dan investment_types
-- Role sudah dinormalisasi ke kolom users.role ('pic', 'manager', 'akuntansi')
-- Baris investasi merujuk langsung ke investment_categories(id) via category_id

-- 1. Hapus kolom dan relasi investment_type_id dari investment_lines
ALTER TABLE investment_lines DROP COLUMN IF EXISTS investment_type_id CASCADE;

-- 2. Hapus tabel investment_types
DROP TABLE IF EXISTS investment_types CASCADE;

-- 3. Hapus tabel user_roles
DROP TABLE IF EXISTS user_roles CASCADE;

