#!/usr/bin/env node
/**
 * Check whether ipo_filings has been populated and where the database is.
 * Usage: DATABASE_URL='...' node scripts/check-ipo-db.mjs
 */

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

  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: true },
  });

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM ipo_filings');
    const count = countResult.rows[0]?.count ?? 0;
    console.log('ipo_filings row count:', count);

    if (count > 0) {
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
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
