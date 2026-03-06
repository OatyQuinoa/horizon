#!/usr/bin/env node
/**
 * Check whether ipo_filings has been populated and where the database is.
 * Loads .env from project root if present. Usage: npm run db:check
 */
import 'dotenv/config';
import pg from 'pg';

function maskConnectionString(url) {
  try {
    const u = new URL(url);
    const host = u.hostname || '(unknown)';
    const db = (u.pathname || '').replace(/^\//, '') || '(default)';
    return `${u.protocol}//***@${host}/${db}`;
  } catch {
    return '(invalid URL)';
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('DATABASE_URL is not set.');
    console.log('Set it to your PostgreSQL connection string (e.g. Vercel Postgres, Supabase, or local).');
    process.exit(1);
  }

  console.log('Database (masked):', maskConnectionString(connectionString));

  const isSupabasePooler = connectionString.includes('pooler.supabase.com');
  const ssl = connectionString.includes('localhost')
    ? false
    : isSupabasePooler
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true };
  const pool = new pg.Pool({ connectionString, ssl });

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM ipo_filings');
    const count = countResult.rows[0]?.count ?? 0;
    console.log('ipo_filings row count:', count);

    if (count > 0) {
      const quarters = [
        { label: '2025 QTR1', from: '2025-01-01', to: '2025-03-31' },
        { label: '2025 QTR2', from: '2025-04-01', to: '2025-06-30' },
        { label: '2025 QTR3', from: '2025-07-01', to: '2025-09-30' },
        { label: '2025 QTR4', from: '2025-10-01', to: '2025-12-31' },
      ];
      console.log('\n2025 quarters (from full-index 2025/QTR1–QTR4):');
      for (const q of quarters) {
        const r = await pool.query(
          'SELECT COUNT(*)::int AS n FROM ipo_filings WHERE filing_date BETWEEN $1::date AND $2::date',
          [q.from, q.to]
        );
        console.log(`  ${q.label}: ${r.rows[0].n} filings`);
      }
      const sample = await pool.query(
        `SELECT cik, company_name, form_type, filing_date, accession_number
         FROM ipo_filings ORDER BY filing_date DESC LIMIT 5`
      );
      console.log('\nSample rows (latest 5 by filing_date):');
      sample.rows.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.company_name} | ${r.form_type} | ${r.filing_date} | ${r.accession_number}`);
      });
      const byForm = await pool.query(
        `SELECT form_type, COUNT(*)::int AS n FROM ipo_filings GROUP BY form_type ORDER BY n DESC`
      );
      console.log('\nBy form_type:');
      byForm.rows.forEach((r) => console.log(`  ${r.form_type}: ${r.n}`));
    } else {
      console.log('\nNo rows in ipo_filings. Run: npm run db:ingest (with DATABASE_URL set).');
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('relation "ipo_filings" does not exist')) {
      console.log('Apply the schema first: psql $DATABASE_URL -f scripts/schema.sql');
    }
    if (err.message.includes('ENOTFOUND')) {
      try {
        const u = new URL(connectionString);
        if (u.hostname.startsWith('db.') && u.hostname.endsWith('.supabase.co')) {
          console.log('\nSupabase "Direct" host (db.*.supabase.co) often fails with ENOTFOUND on some networks.');
          console.log('Use the Pooler connection string instead: Supabase → Project Settings → Database → Connection string → URI (Session or Transaction mode).');
          console.log('Example: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres');
        }
      } catch (_) {}
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
