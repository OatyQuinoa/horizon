#!/usr/bin/env node
/**
 * SEC EDGAR IPO ingestion script.
 * Downloads quarterly master.idx files, parses IPO-related rows (S-1, S-1/A, 424B4),
 * and inserts into PostgreSQL. Loads .env if present.
 * Prerequisites: DATABASE_URL in .env or environment, schema applied (scripts/schema.sql).
 * Usage: node scripts/ingest-sec-ipos.mjs  or  npm run db:ingest
 */
import 'dotenv/config';
import pg from 'pg';
import https from 'https';

const SEC_USER_AGENT = 'Prospectus-InvestmentResearch/1.0 (contact@prospectus-app.com)';
const ALLOWED_FORMS = new Set(['S-1', 'S-1/A', '424B4']);
const SEC_ARCHIVES_BASE = 'https://www.sec.gov/Archives/';
const INDEX_HEADER_START = 'CIK|Company Name|Form Type|Date Filed|Filename';

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
 * Parse master.idx content. Skip lines until table header appears, then one row per line.
 * Format: CIK|Company Name|Form Type|Date Filed|Filename
 */
function parseMasterIdx(text) {
  const lines = text.split(/\r?\n/);
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === INDEX_HEADER_START || trimmed.startsWith(INDEX_HEADER_START)) {
      dataStartIndex = i + 1;
      break;
    }
  }
  if (dataStartIndex < 0) return [];

  const rows = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 5) continue;
    const [cik, companyName, formType, dateFiled, filename] = parts;
    if (!cik || !formType || !dateFiled || !filename) continue;
    if (!/^\d+$/.test(cik)) continue;
    rows.push({
      cik,
      companyName: companyName || 'Unknown',
      formType,
      dateFiled: dateFiled.slice(0, 10),
      filename,
    });
  }
  return rows;
}

/**
 * From index filename (e.g. edgar/data/2100782/0001193125-25-012345.txt) derive:
 * - accession_number: 0001193125-25-012345
 * - accession_no_dash: 000119312525012345
 * - sec_url: https://www.sec.gov/Archives/edgar/data/2100782/0001193125-25-012345.txt
 * - sec_filename: full path from index (edgar/data/...)
 */
function deriveFromFilename(filename) {
  const base = filename.trim();
  const lastSlash = base.lastIndexOf('/');
  const basename = lastSlash >= 0 ? base.slice(lastSlash + 1) : base;
  const accessionNumber = basename.replace(/\.txt$/i, '');
  const accessionNoDash = accessionNumber.replace(/-/g, '');
  const secUrl = base.startsWith('http') ? base : `${SEC_ARCHIVES_BASE}${base}`;
  return { accessionNumber, accessionNoDash, secUrl, secFilename: base };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const isSupabasePooler = connectionString.includes('pooler.supabase.com');
  const ssl = connectionString.includes('localhost')
    ? false
    : isSupabasePooler
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true };
  const pool = new pg.Pool({ connectionString, ssl });
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
      const filtered = rows.filter((r) => ALLOWED_FORMS.has(r.formType));

      console.log(`  Parsed ${rows.length} rows, ${filtered.length} IPO filings (S-1, S-1/A, 424B4)`);

      for (const r of filtered) {
        const { accessionNumber, accessionNoDash, secUrl, secFilename } = deriveFromFilename(r.filename);
        try {
          const result = await client.query(
            `INSERT INTO ipo_filings (cik, company_name, form_type, filing_date, accession_number, accession_no_dash, sec_filename, sec_url)
             VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8)
             ON CONFLICT (accession_number) DO NOTHING`,
            [r.cik, r.companyName, r.formType, r.dateFiled, accessionNumber, accessionNoDash, secFilename, secUrl]
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
