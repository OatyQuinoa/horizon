#!/usr/bin/env node
/**
 * Apply scripts/schema.sql to the database (creates ipo_filings table).
 * Loads .env if present. Usage: npm run db:schema
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Set it in .env or the environment.');
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  const isSupabasePooler = connectionString.includes('pooler.supabase.com');
  const ssl = connectionString.includes('localhost')
    ? false
    : isSupabasePooler
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true };

  const pool = new pg.Pool({ connectionString, ssl });
  try {
    await pool.query(sql);
    console.log('Schema applied successfully. Table ipo_filings (and indexes) created.');
  } catch (err) {
    console.error('Error applying schema:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
