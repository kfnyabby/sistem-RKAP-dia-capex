-- Migration: 002_create_session_and_auth_tables.sql
-- Description: Tabel session untuk connect-pg-simple dan penyesuaian kolom role pada users

-- 1. Tabel session untuk express-session (connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- 2. Pastikan kolom role ada pada tabel users (pic, manager, akuntansi)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'pic';

