-- Migration: 001_create_p0_tables.sql
-- Description: Inisialisasi 28 tabel P0 Sistem RKAP DIA CAPEX

-- 1. Tabel companies
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 2. Tabel org_groups
CREATE TABLE IF NOT EXISTS org_groups (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- instalasi / unit_bisnis
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 3. Tabel units
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    group_id INT REFERENCES org_groups(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    classification VARCHAR(100),
    revenue_coa_id INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_units_company_code UNIQUE (company_id, code)
);

-- 4. Tabel users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 5. Tabel user_roles
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- pic, manager, akuntansi
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_user_roles UNIQUE (user_id, role)
);

-- 6. Tabel user_unit_access
CREATE TABLE IF NOT EXISTS user_unit_access (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_user_unit UNIQUE (user_id, unit_id)
);

-- 7. Tabel coa_groups (Jenis COA)
CREATE TABLE IF NOT EXISTS coa_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 4.1, 4.2, 5.1, dst
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 8. Tabel coas
CREATE TABLE IF NOT EXISTS coas (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES coa_groups(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'biaya', -- biaya, investasi
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 9. Tabel items (Master Barang Logistik)
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    uom VARCHAR(50) NOT NULL,
    coa_id INT NOT NULL REFERENCES coas(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 10. Tabel item_company (Relasi & Legacy ID)
CREATE TABLE IF NOT EXISTS item_company (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    legacy_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_item_company UNIQUE (item_id, company_id)
);

-- 11. Tabel periods
CREATE TABLE IF NOT EXISTS periods (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PERSIAPAN', -- PERSIAPAN, PENGISIAN, VALIDASI, FINAL, DITUTUP
    fill_deadline DATE,
    review_deadline DATE,
    lock_date DATE,
    submission_state VARCHAR(20) NOT NULL DEFAULT 'BUKA', -- BUKA, TUTUP
    auto_close BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_period_company_year UNIQUE (company_id, year)
);

-- 12. Tabel item_prices (Harga per Perusahaan & Periode)
CREATE TABLE IF NOT EXISTS item_prices (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    period_id INT NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    price BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_item_prices UNIQUE (item_id, company_id, period_id)
);

-- 13. Tabel submission_access (Override Buka/Tutup per Unit)
CREATE TABLE IF NOT EXISTS submission_access (
    id SERIAL PRIMARY KEY,
    period_id INT NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL DEFAULT 'SEMUA', -- BIAYA, INVESTASI, SEMUA
    state VARCHAR(20) NOT NULL DEFAULT 'BUKA', -- BUKA, TUTUP
    deadline_override DATE,
    source VARCHAR(50) DEFAULT 'MANUAL', -- PERIOD, MANUAL, AUTO_RETURN
    reason TEXT,
    changed_by INT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 14. Tabel investment_types (Jenis Investasi Referensi)
CREATE TABLE IF NOT EXISTS investment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 15. Tabel investment_categories (Masa Manfaat & Akun Susut)
CREATE TABLE IF NOT EXISTS investment_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    useful_life_months INT NOT NULL,
    depreciation_coa_id INT REFERENCES coas(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 16. Tabel priorities (Prioritas Referensi)
CREATE TABLE IF NOT EXISTS priorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 17. Tabel budget_docs (Dokumen Anggaran)
CREATE TABLE IF NOT EXISTS budget_docs (
    id SERIAL PRIMARY KEY,
    period_id INT NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- BIAYA, INVESTASI
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, DIAJUKAN, DISETUJUI, DIKEMBALIKAN, FINAL
    total_amount BIGINT NOT NULL DEFAULT 0,
    submitted_by INT REFERENCES users(id),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_budget_doc UNIQUE (period_id, unit_id, type)
);

-- 18. Tabel expense_lines (Rincian Anggaran Biaya)
CREATE TABLE IF NOT EXISTS expense_lines (
    id SERIAL PRIMARY KEY,
    doc_id INT NOT NULL REFERENCES budget_docs(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(id),
    qty INT NOT NULL DEFAULT 0,
    price_snapshot BIGINT NOT NULL DEFAULT 0,
    amount BIGINT NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 19. Tabel investment_lines (Rincian Anggaran Investasi)
CREATE TABLE IF NOT EXISTS investment_lines (
    id SERIAL PRIMARY KEY,
    doc_id INT NOT NULL REFERENCES budget_docs(id) ON DELETE CASCADE,
    category_id INT REFERENCES investment_categories(id),
    investment_type_id INT REFERENCES investment_types(id),
    priority_id INT REFERENCES priorities(id),
    coa_id INT REFERENCES coas(id),
    name VARCHAR(255) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    price BIGINT NOT NULL DEFAULT 0,
    amount BIGINT NOT NULL DEFAULT 0,
    plan_month INT NOT NULL DEFAULT 1,
    useful_life_months INT NOT NULL DEFAULT 0,
    depreciation_amount BIGINT NOT NULL DEFAULT 0,
    strategic_objective TEXT,
    kpi TEXT,
    work_program TEXT,
    strategic_action TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 20. Tabel doc_status_history
CREATE TABLE IF NOT EXISTS doc_status_history (
    id SERIAL PRIMARY KEY,
    doc_id INT NOT NULL REFERENCES budget_docs(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    actor_id INT REFERENCES users(id),
    note TEXT,
    at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 21. Tabel line_comments (Komentar Validator)
CREATE TABLE IF NOT EXISTS line_comments (
    id SERIAL PRIMARY KEY,
    doc_id INT NOT NULL REFERENCES budget_docs(id) ON DELETE CASCADE,
    line_type VARCHAR(50) NOT NULL, -- expense, investment
    line_id INT NOT NULL,
    author_id INT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 22. Tabel new_item_requests (Permintaan Barang Baru)
CREATE TABLE IF NOT EXISTS new_item_requests (
    id SERIAL PRIMARY KEY,
    doc_id INT NOT NULL REFERENCES budget_docs(id) ON DELETE CASCADE,
    unit_id INT NOT NULL REFERENCES units(id),
    name VARCHAR(255) NOT NULL,
    spec TEXT,
    uom VARCHAR(50) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    est_price BIGINT NOT NULL DEFAULT 0,
    amount BIGINT NOT NULL DEFAULT 0,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, MENUNGGU_COA, COA_DITENTUKAN
    assigned_coa_id INT REFERENCES coas(id),
    assigned_by INT REFERENCES users(id),
    item_id INT REFERENCES items(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 23. Tabel import_batches (Histori Upload Jurnal/Master)
CREATE TABLE IF NOT EXISTS import_batches (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id),
    kind VARCHAR(50) NOT NULL, -- realisasi, master
    file_name VARCHAR(255) NOT NULL,
    period VARCHAR(50),
    uploaded_by INT REFERENCES users(id),
    rows_total INT NOT NULL DEFAULT 0,
    rows_used INT NOT NULL DEFAULT 0,
    rows_error INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING', -- PROCESSING, PREVIEW, CONFIRMED, ROLLED_BACK
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 24. Tabel unit_aliases (Pemetaan Nama Unit Jurnal)
CREATE TABLE IF NOT EXISTS unit_aliases (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT,
    CONSTRAINT uq_unit_alias UNIQUE (company_id, alias_name)
);

-- 25. Tabel journal_lines (Realisasi Buku Besar)
CREATE TABLE IF NOT EXISTS journal_lines (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    sub_journal_id VARCHAR(100) NOT NULL,
    journal_no VARCHAR(100),
    trx_date DATE NOT NULL,
    unit_id INT REFERENCES units(id),
    coa_id INT REFERENCES coas(id),
    debit BIGINT NOT NULL DEFAULT 0,
    credit BIGINT NOT NULL DEFAULT 0,
    description TEXT,
    item_id INT REFERENCES items(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 26. Tabel notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 27. Tabel audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_id INT REFERENCES users(id),
    entity VARCHAR(100) NOT NULL,
    entity_id INT,
    action VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- 28. Tabel settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT
);

-- Indeks Wajib
CREATE INDEX IF NOT EXISTS idx_units_company_code ON units(company_id, code);
CREATE INDEX IF NOT EXISTS idx_expense_lines_doc_item ON expense_lines(doc_id, item_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_sub_journal ON journal_lines(sub_journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_query ON journal_lines(unit_id, coa_id, trx_date);
CREATE INDEX IF NOT EXISTS idx_budget_docs_period_unit ON budget_docs(period_id, unit_id);

