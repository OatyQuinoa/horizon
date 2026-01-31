/**
 * SEC EDGAR S-1 filing service
 *
 * Fetches recent S-1/S-1A filings via app proxy (/api/sec/*).
 * Strategy: try full-text search first; if 0 results or error, use RSS/Atom feed (reliable).
 * No SIC filtering here — all sectors; optional software-only filter is applied in the hook.
 */

import { constructCompanySearchUrl, isSoftwareCompany as isSoftwareSic, padCik } from '@/lib/sec-api';

const API_BASE = '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecentFiling {
  id: string;
  cik: string;
  companyName: string;
  filingDate: string;
  formType: string;
  accessionNumber: string;
  secIndexUrl: string;
}

export interface CompanyEnrichment {
  name: string;
  sicCode: string | null;
  sicDescription: string | null;
  tickers: string[];
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getDateRange(daysBack: number): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - Math.max(1, daysBack));
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

function isDateInRange(dateStr: string, dateFrom: string, dateTo: string): boolean {
  if (!dateStr || dateStr.length < 10) return false;
  const d = dateStr.slice(0, 10);
  return d >= dateFrom && d <= dateTo;
}

// ---------------------------------------------------------------------------
// Fetch recent S-1 filings: search first, then RSS fallback
// ---------------------------------------------------------------------------

/**
 * Fetch recent S-1/S-1A filings. Tries SEC full-text search first; if 0 results or error,
 * uses the SEC browse-edgar Atom feed (reliable). Filters by date range (daysBack).
 */
export async function fetchRecentS1Filings(daysBack: number): Promise<RecentFiling[]> {
  const { dateFrom, dateTo } = getDateRange(daysBack);

  // 1) Try full-text search (may return 0 for some date ranges)
  const searchList = await fetchViaSearch(dateFrom, dateTo);
  if (searchList.length > 0) {
    return searchList;
  }

  // 2) Fallback: SEC Atom feed (reliable list of recent S-1)
  const rssList = await fetchViaRecentS1();
  return rssList.filter((f) => isDateInRange(f.filingDate, dateFrom, dateTo));
}

async function fetchViaSearch(dateFrom: string, dateTo: string): Promise<RecentFiling[]> {
  const url = `${API_BASE}/api/sec/search?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.hits?.hits ?? [];
    const list: RecentFiling[] = [];
    for (const hit of hits) {
      const src = hit?._source;
      if (!src) continue;
      const cik = (src.ciks && src.ciks[0]) ? String(src.ciks[0]).padStart(10, '0') : '';
      const fileDate = src.file_date ?? '';
      const form = src.form ?? 'S-1';
      const accessionNumber = src.accession_number ?? '';
      const companyName = (src.display_names && src.display_names[0]) ? src.display_names[0] : 'Unknown';
      if (!cik) continue;
      list.push({
        id: `${cik}-${accessionNumber || fileDate}`,
        cik,
        companyName,
        filingDate: fileDate,
        formType: form,
        accessionNumber,
        secIndexUrl: constructCompanySearchUrl(cik, 'S-1'),
      });
    }
    return list;
  } catch {
    return [];
  }
}

async function fetchViaRecentS1(): Promise<RecentFiling[]> {
  const url = `${API_BASE}/api/sec/recent-s1?count=80`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const filings = data?.filings ?? [];
    return filings.map((f: { cik: string; companyName: string; filingDate: string; formType: string; accessionNumber: string }) => {
      const cik = (f.cik || '').padStart(10, '0');
      return {
        id: `${cik}-${f.accessionNumber || f.filingDate}`,
        cik,
        companyName: f.companyName || 'Unknown',
        filingDate: f.filingDate || '',
        formType: f.formType || 'S-1',
        accessionNumber: f.accessionNumber || '',
        secIndexUrl: constructCompanySearchUrl(cik, 'S-1'),
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch company details (for SIC / sector and ticker)
// ---------------------------------------------------------------------------

/**
 * Fetch company data from SEC submissions API via proxy. Used for SIC filtering and display.
 */
export async function fetchCompanyByCik(cik: string): Promise<CompanyEnrichment | null> {
  const padded = padCik(cik);
  const url = `${API_BASE}/api/sec/submissions/CIK${padded}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const name = data?.name ?? '';
    const sic = data?.sic ?? null;
    const sicDescription = data?.sicDescription ?? null;
    const tickers = Array.isArray(data?.tickers) ? data.tickers : [];
    return {
      name,
      sicCode: sic != null ? String(sic) : null,
      sicDescription: sicDescription != null ? String(sicDescription) : null,
      tickers,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SIC / sector
// ---------------------------------------------------------------------------

export function isSoftwareCompany(sicCode: string): boolean {
  return isSoftwareSic(sicCode);
}

// ---------------------------------------------------------------------------
// Formatting (for UI)
// ---------------------------------------------------------------------------

export function formatFilingDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '—';
  const d = dateStr.slice(0, 10);
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mi = parseInt(m, 10) - 1;
  if (isNaN(mi) || mi < 0 || mi > 11) return d;
  return `${months[mi]} ${parseInt(day, 10)}, ${y}`;
}

export function getRelativeDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '—';
  const date = new Date(dateStr.slice(0, 10));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'Soon';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week(s) ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month(s) ago`;
  return `${Math.floor(diffDays / 365)} year(s) ago`;
}
