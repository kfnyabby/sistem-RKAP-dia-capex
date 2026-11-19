-- Migrasi 010: Workflow Approval, Submission Access, dan Notifikasi (Fase 5)
-- 1. Constraint keunikan submission_access per period, unit, doc_type untuk operasi upsert
-- 2. Indeks performa untuk riwayat status dokumen, komentar baris, dan notifikasi
-- 3. Pengaturan sistem terkait auto-reopen dan reminder

-- 1. Indeks keunikan submission_access
CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_access_period_unit_type 
ON submission_access(period_id, unit_id, doc_type);

-- 2. Indeks performa
CREATE INDEX IF NOT EXISTS idx_doc_status_history_doc 
ON doc_status_history(doc_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_line_comments_lookup 
ON line_comments(doc_id, line_type, line_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC);

-- 3. Pengaturan sistem
INSERT INTO settings (key, value, description)
VALUES (
  'auto_reopen_on_return',
  'true',
  'Otomatis membuka akses unit (source AUTO_RETURN) saat dokumen dikembalikan setelah pengisian ditutup'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description)
VALUES (
  'reminder_days',
  '[3, 1]',
  'Jumlah hari sebelum deadline untuk mengirimkan notifikasi pengingat pengisian'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description)
VALUES (
  'accounting_contact',
  '"Bagian Akuntansi Kantor Pusat (ext. 102 / akuntansi@ciptanirmala.com)"',
  'Kontak bantuan Akuntansi yang ditampilkan saat pengajuan anggaran ditutup'
)
ON CONFLICT (key) DO NOTHING;
