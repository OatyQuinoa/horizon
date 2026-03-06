-- IPO filings table for database-backed architecture.
-- Run this against your PostgreSQL (e.g. Vercel Postgres) before ingestion.
-- Usage: psql $DATABASE_URL -f scripts/schema.sql

CREATE TABLE IF NOT EXISTS ipo_filings (
    id SERIAL PRIMARY KEY,
    cik TEXT NOT NULL,
    company_name TEXT NOT NULL,
    form_type TEXT NOT NULL,
    filing_date DATE NOT NULL,
    accession_number TEXT NOT NULL,
    accession_no_dash TEXT NOT NULL,
    sec_filename TEXT,
    sec_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_filings_accession ON ipo_filings(accession_number);
CREATE INDEX IF NOT EXISTS idx_ipo_form_type ON ipo_filings(form_type);
CREATE INDEX IF NOT EXISTS idx_ipo_filing_date ON ipo_filings(filing_date);
CREATE INDEX IF NOT EXISTS idx_ipo_cik ON ipo_filings(cik);
CREATE INDEX IF NOT EXISTS idx_ipo_company_name ON ipo_filings(company_name);

-- Optional: add unique constraint by accession (alternative to unique index)
-- ALTER TABLE ipo_filings ADD CONSTRAINT unique_accession UNIQUE (accession_number);
