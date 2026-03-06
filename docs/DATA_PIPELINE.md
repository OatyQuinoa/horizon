# IPO Data Pipeline

The app uses a **database-backed** architecture so that SEC.gov is only queried during scheduled ingestion, not on every page load.

## Architecture

```
SEC EDGAR full-index (master.idx)
        ↓
Scheduled ingestion script
        ↓
PostgreSQL (e.g. Vercel Postgres)
        ↓
GET /api/ipos
        ↓
Frontend (Dashboard)
```

## 1. Database

- **Schema:** `scripts/schema.sql`
- **Setup:** Run the schema against your Postgres instance (e.g. Vercel Postgres).
  ```bash
  psql $DATABASE_URL -f scripts/schema.sql
  ```

## 2. Environment

Set in your environment (e.g. Vercel project settings or `.env`):

```
DATABASE_URL=postgresql://...
```

## 3. Ingestion

The ingestion script downloads SEC quarterly index files, parses IPO-related forms (S-1, S-1/A, 424B4), and inserts into the database.

- **Date range:** 2025-01-01 through 2026-01-31
- **Quarters:** 2025 QTR1–QTR4, 2026 QTR1
- **Duplicate handling:** `ON CONFLICT (accession_number) DO NOTHING`

Run (with `DATABASE_URL` set):

```bash
npm run db:ingest
```

Schedule this (e.g. cron or Vercel Cron) to keep the database updated.

## 4. API

- **Route:** `GET /api/ipos`
- **Query params:** `dateFrom`, `dateTo`, `form_type`, `company_name`, `cik` (all optional)
- **Default date range:** 2025-01-01 to 2026-01-31

## 5. Frontend

The Dashboard fetches IPO listings from `/api/ipos` only. No direct SEC requests are made for the listing; company detail and prospectus editor may still use the SEC proxy for that specific filing.

## Local development

- **Production:** Vercel serves `/api/ipos` and connects to your Postgres.
- **Local:** Use `vercel dev` to run API routes locally with `DATABASE_URL`, or point the app at a deployed API.
