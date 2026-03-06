# IPO Data Pipeline

The app uses a **database-backed** architecture so that SEC.gov is only queried during scheduled ingestion, not on every page load.

## Data source (full-index, not daily-index)

Ingestion uses the **full-index** quarterly master files, not the daily-index:

- **Used:** `https://www.sec.gov/Archives/edgar/full-index/2025/QTR1/master.idx` (and QTR2–QTR4, 2026/QTR1)
- **Not used:** `https://www.sec.gov/Archives/edgar/daily-index/2025/` (daily index)

The full-index quarterly files contain all filings for that quarter; 2025 QTR1–QTR4 are ingested.

## Architecture

```
SEC EDGAR full-index (master.idx) — quarterly
        ↓
Ingestion script (scripts/ingest-sec-ipos.ts)
        ↓
PostgreSQL (DATABASE_URL)
        ↓
GET /api/ipos
        ↓
Frontend (Dashboard)
```

## 1. Database (where the data lives)

The IPO data is stored in **PostgreSQL** pointed to by the **`DATABASE_URL`** environment variable. The app does not bundle a database; you provide your own (e.g. Vercel Postgres, Supabase, Neon, or local Postgres).

- **Table:** `ipo_filings` (see `scripts/schema.sql`)
- **Schema:** `scripts/schema.sql`
- **Setup:** Run the schema against your Postgres instance:
  ```bash
  psql $DATABASE_URL -f scripts/schema.sql
  ```
- **Check that data exists:** Run the check script (uses same `DATABASE_URL`):
  ```bash
  npm run db:check
  ```
  This prints the database location (host masked), row count, and sample rows.

## 2. Environment — linking DATABASE_URL (Vercel + Supabase)

The app reads **one** variable: **`DATABASE_URL`**. That must be your **PostgreSQL connection string** (not the Supabase API URL).

### In Vercel (for deployed `/api/ipos`)

1. Open your project on [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. Add a variable:
   - **Name:** `DATABASE_URL`
   - **Value:** your Supabase PostgreSQL connection string (see below).
   - Apply to **Production**, **Preview**, and **Development** if you use them.
3. Redeploy so the new variable is applied.

### Getting the connection string from Supabase

1. In [Supabase](https://supabase.com): open your project → **Project Settings** (gear) → **Database**.
2. Under **Connection string**, choose **URI**.
3. **Use the Pooler URI** (Session mode or Transaction mode), not the Direct connection. The Direct host (`db.[project-ref].supabase.co`) often fails with `ENOTFOUND` on some networks; the pooler host (`aws-0-[region].pooler.supabase.com`) is more reliable.
4. Copy the pooler URI. It looks like:
   ```text
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your database password (the one you set for the `postgres` user, or from **Database** → **Reset database password** if needed).
6. For serverless (Vercel), Transaction mode (port **6543**) or Session mode (port **5432**) both work.

### Local development

Create a `.env` in the project root (see `.env.example`):

```bash
DATABASE_URL=postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Never commit `.env` (it’s in `.gitignore`). The app and scripts (`api/ipos`, `db:ingest`, `db:check`) all use `process.env.DATABASE_URL`.

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

## Deploy checklist

1. Set **DATABASE_URL** in Vercel (Project → Settings → Environment Variables) to your Supabase Pooler URI.
2. Apply schema once: run `npm run db:schema` locally with the same DATABASE_URL, or run the SQL in `scripts/schema.sql` via Supabase SQL Editor.
3. Ingest IPO data: run `npm run db:ingest` (or schedule it via cron). Verify with `npm run db:check` (reports 2025 QTR1–QTR4 counts).
4. Deploy the app. The Dashboard defaults to **All (2025–2026)** so users see the full ingested range; they can switch to Week/Month/Quarterly/Yearly.
