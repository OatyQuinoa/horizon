/**
 * PostgreSQL connection pool for API routes and ingestion script.
 * Set DATABASE_URL in environment (e.g. Vercel Postgres connection string).
 */
import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: true },
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}
