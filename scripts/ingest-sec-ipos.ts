#!/usr/bin/env node
/**
 * SEC EDGAR IPO ingestion script.
 * Downloads quarterly master.idx files, parses IPO-related rows (S-1, S-1/A, 424B4),
 * and inserts into PostgreSQL with ON CONFLICT (accession_number) DO NOTHING.
 *
 * Prerequisites: DATABASE_URL in .env or environment, schema applied (scripts/schema.sql).
 * Usage: npm run db:ingest
 */
import 'dotenv/config';
import pg from 'pg';
import https from 'https';

const SEC_USER_AGENT = 'Prospectus-InvestmentResearch/1.0 (contact@prospectus-app.com)';
const SEC_ARCHIVES_BASE = 'https://www.sec.gov/Archives/';
/** Header line that marks start of data (SEC may add trailing space). */
const INDEX_HEADER_START = 'CIK|Company Name|Form Type|Date Filed|Filename';
const ALLOWED_FORMS = new Set(['S-1', 'S-1/A', '424B4']);

const QUARTERS: [number, number][] = [
  [2025, 1],
  [2025, 2],
  [2025, 3],
  [2025, 4],
  [2026, 1],
];

interface ParsedRow {
  cik: string;
  company_name: string;
  form_type: string;
  filing_date: string;
  filename: string;
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': SEC_USER_AGENT } },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`${url} returned ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      }
    );
    req.on('error', reject);
  });
}

/**
 * Find the line index of the table header, then parse data rows.
 * SEC format: header text, then "CIK|Company Name|Form Type|Date Filed|Filename", then one row per line.
 */
function parseMasterIdx(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/);
  let dataStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === INDEX_HEADER_START || trimmed.startsWith(INDEX_HEADER_START)) {
      dataStartIndex = i + 1;
      break;
    }
  }
  if (dataStartIndex < 0) {
    return [];
  }

  const rows: ParsedRow[] = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 5) continue;
    const [cik, company_name, form_type, filing_date, filename] = parts;
    if (!cik || !form_type || !filing_date || !filename) continue;
    if (!/^\d+$/.test(cik)) continue;
    rows.push({
      cik,
      company_name: company_name || 'Unknown',
      form_type,
      filing_date: filing_date.slice(0, 10),
      filename,
    });
  }
  return rows;
}

/**
 * From index filename (e.g. edgar/data/2100782/0001193125-25-012345.txt):
 * - accession_number: 0001193125-25-012345
 * - accession_no_dash: 000119312525012345
 * - sec_url: https://www.sec.gov/Archives/edgar/data/2100782/0001193125-25-012345.txt
 */
function deriveFromFilename(filename: string): {
  accession_number: string;
  accession_no_dash: string;
  sec_filename: string;
  sec_url: string;
} {
  const base = filename.trim();
  const lastSlash = base.lastIndexOf('/');
  const basename = lastSlash >= 0 ? base.slice(lastSlash + 1) : base;
  const accession_number = basename.replace(/\.txt$/i, '');
  const accession_no_dash = accession_number.replace(/-/g, '');
  const sec_url = base.startsWith('http') ? base : `${SEC_ARCHIVES_BASE}${base}`;
  return {
    accession_number,
    accession_no_dash,
    sec_filename: base,
    sec_url,
  };
}

async function main(): Promise<void> {
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
      let text: string;
      try {
        text = await fetchText(url);
      } catch (err) {
        console.warn(`Failed to fetch ${url}:`, (err as Error).message);
        continue;
      }

      const rows = parseMasterIdx(text);
      const filtered = rows.filter((r) => ALLOWED_FORMS.has(r.form_type));
      console.log(`  Parsed ${rows.length} rows, ${filtered.length} IPO filings (S-1, S-1/A, 424B4)`);

      for (const r of filtered) {
        const { accession_number, accession_no_dash, sec_filename, sec_url } = deriveFromFilename(r.filename);
        try {
          const result = await client.query(
            `INSERT INTO ipo_filings (cik, company_name, form_type, filing_date, accession_number, accession_no_dash, sec_filename, sec_url)
             VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8)
             ON CONFLICT (accession_number) DO NOTHING`,
            [r.cik, r.company_name, r.form_type, r.filing_date, accession_number, accession_no_dash, sec_filename, sec_url]
          );
          if (result.rowCount && result.rowCount > 0) totalInserted += 1;
          else totalSkipped += 1;
        } catch (e) {
          const err = e as pg.DatabaseError;
          if (err.code === '23505') totalSkipped += 1;
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
