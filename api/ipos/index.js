/**
 * Vercel API route: query IPO filings from PostgreSQL.
 * GET /api/ipos?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&form_type=S-1|424B4|...&company_name=...&cik=...
 * All query params are optional. Default date range: ingestion range (2025-01-01 to 2026-01-31).
 */
import { query } from '../../lib/db.js';

const DEFAULT_DATE_FROM = '2025-01-01';
const DEFAULT_DATE_TO = '2026-01-31';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Deployed environments (e.g. Vercel): require DATABASE_URL so filings can load when opened from any device.
  if (!process.env.DATABASE_URL) {
    res.setHeader('Content-Type', 'application/json');
    res.status(503).end(
      JSON.stringify({
        error: 'DATABASE_URL not set',
        filings: [],
        _hint:
          'Set DATABASE_URL in your deployment environment (e.g. Vercel → Project Settings → Environment Variables) so filings load when the app is opened from this URL.',
      })
    );
    return;
  }

  const dateFrom = req.query.dateFrom ?? DEFAULT_DATE_FROM;
  const dateTo = req.query.dateTo ?? DEFAULT_DATE_TO;
  const formType = req.query.form_type?.trim() || null;
  const companyName = req.query.company_name?.trim() || null;
  const cik = req.query.cik?.trim() || null;

  try {
    let sql = `
      SELECT cik, company_name, form_type, filing_date, accession_number, accession_no_dash, sec_filename, sec_url, created_at
      FROM ipo_filings
      WHERE filing_date BETWEEN $1::date AND $2::date
    `;
    const params = [dateFrom, dateTo];
    let n = 3;

    if (formType) {
      sql += ` AND form_type = $${n}`;
      params.push(formType);
      n += 1;
    }
    if (companyName) {
      sql += ` AND company_name ILIKE $${n}`;
      params.push(`%${companyName}%`);
      n += 1;
    }
    if (cik) {
      const cikNorm = cik.replace(/\D/g, '').padStart(10, '0');
      sql += ` AND REPLACE(LPAD(TRIM(cik), 10, '0'), ' ', '0') = $${n}`;
      params.push(cikNorm);
      n += 1;
    }

    sql += ` ORDER BY filing_date DESC`;

    const result = await query(sql, params);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).end(JSON.stringify({ filings: result.rows }));
  } catch (err) {
    console.error('[/api/ipos]', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).end(JSON.stringify({ error: 'Database error', detail: err.message }));
  }
}
