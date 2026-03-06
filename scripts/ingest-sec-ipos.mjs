#!/usr/bin/env node
/**
 * SEC EDGAR IPO ingestion script.
 * Downloads quarterly master.idx files, parses IPO-related rows (S-1, S-1/A, 424B4),
 * filters by date range 2025-01-01 to 2026-01-31, and upserts into PostgreSQL.
 *
 * Prerequisites: DATABASE_URL set, schema applied (scripts/schema.sql).
 * Usage: node scripts/ingest-sec-ipos.mjs
 */

import pg from 'pg';
import https from 'https';

const SEC_USER_AGENT = 'Prospecti-InvestmentResearch/1.0 (contact@prospecti-app.com)';
const DATE_FROM = '2025-01-01';
const DATE_TO = '2026-01-31';
const ALLOWED_FORMS = new Set(['S-1', 'S-1/A', '424B4']);
const BASE_ARCHIVES = 'https://www.sec.gov/Archives/edgar/';

const QUARTERS = [
  [2025, 1],
  [2025, 2],
  [2025, 3],
  [2025, 4],
  [2026, 1],
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': SEC_USER_AGENT },
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`${url} returned ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
  });
}

/**
 * Parse master.idx content. Format: CIK|Company Name|Form Type|Date Filed|Filename
 * First 11 lines are header; then one row per line.
 */
function parseMasterIdx(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split('|');
    if (parts.length < 5) continue;
    const [cik, companyName, formType, dateFiled, filename] = parts.map((p) => p.trim());
    if (!cik || !formType || !dateFiled || !filename) continue;
    if (!/^\d+$/.test(cik)) continue; // skip header (CIK is numeric)
    rows.push({ cik, companyName: companyName || 'Unknown', formType, dateFiled, filename });
  }
  return rows;
}

/**
 * From index filename (e.g. edgar/data/2100782/0001193125-25-012345.txt) derive:
 * - accession_number: 0001193125-25-012345
 * - accession_no_dash: 000119312525012345
 * - sec_url: https://www.sec.gov/Archives/edgar/edgar/data/2100782/0001193125-25-012345.txt
 */
function deriveFromFilename(filename) {
  let base = filename.trim();
  if (base.startsWith('edgar/')) base = base.slice(6); // avoid double edgar/ in URL
  const lastSlash = base.lastIndexOf('/');
  const basename = lastSlash >= 0 ? base.slice(lastSlash + 1) : base;
  const accessionNumber = basename.replace(/\.txt$/i, '');
  const accessionNoDash = accessionNumber.replace(/-/g, '');
  const secUrl = base.startsWith('http') ? base : `${BASE_ARCHIVES}${base}`;
  return { accessionNumber, accessionNoDash, secUrl, secFilename: basename };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  let totalInserted = 0;
  let totalSkipped = 0;

  try {
    for (const [year, qtr] of QUARTERS) {
      const url = `https://www.sec.gov/Archives/edgar/full-index/${year}/QTR${qtr}/master.idx`;
      console.log(`Fetching ${url} ...`);
      let text;
      try {
        text = await fetchText(url);
      } catch (err) {
        console.warn(`Failed to fetch ${url}:`, err.message);
        continue;
      }

      const rows = parseMasterIdx(text);
      const filtered = rows.filter((r) => {
        if (!ALLOWED_FORMS.has(r.formType)) return false;
        const d = r.dateFiled.slice(0, 10);
        return d >= DATE_FROM && d <= DATE_TO;
      });

      console.log(`  Parsed ${rows.length} rows, ${filtered.length} IPO filings in date range`);

      for (const r of filtered) {
        const { accessionNumber, accessionNoDash, secUrl, secFilename } = deriveFromFilename(r.filename);
        try {
          const result = await client.query(
            `INSERT INTO ipo_filings (cik, company_name, form_type, filing_date, accession_number, accession_no_dash, sec_filename, sec_url)
             VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8)
             ON CONFLICT (accession_number) DO NOTHING`,
            [r.cik, r.companyName, r.formType, r.dateFiled.slice(0, 10), accessionNumber, accessionNoDash, secFilename, secUrl]
          );
          if (result.rowCount > 0) totalInserted += 1;
          else totalSkipped += 1;
        } catch (e) {
          if (e.code === '23505') totalSkipped += 1; // unique violation
          else throw e;
        }
      }
    }

    console.log(`Done. Inserted: ${totalInserted}, skipped (duplicates): ${totalSkipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
