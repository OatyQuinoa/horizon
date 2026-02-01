/**
 * SEC EDGAR IPO filing service
 *
 * Dual-layer model:
 * - Pipeline (intent): S-1, S-1/A, F-1, F-1/A — "IPO may happen"
 * - Confirmation (completed): 424B4 — "IPO did happen"
 *
 * Fetches via app proxy (/api/sec/*). Strategy: try full-text search first;
 * if 0 results or error, use RSS/Atom feeds. Correlates by CIK to classify status.
 */

import { constructCompanySearchUrl, isSoftwareCompany as isSoftwareSic, padCik } from '@/lib/sec-api';

const API_BASE = '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** IPO status: pipeline = intent/filing, completed = 424B4 filed (IPO priced) */
export type IpoStatus = 'pipeline' | 'completed';

export interface RecentFiling {
  id: string;
  cik: string;
  companyName: string;
  filingDate: string;
  formType: string;
  accessionNumber: string;
  secIndexUrl: string;
  /** Pipeline = S-1/F-1 intent; Completed = 424B4 filed */
  ipoStatus?: IpoStatus;
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
// Fetch IPO filings: pipeline (S-1/F-1) + confirmation (424B4) + correlation
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[SEC IPO]';

/**
 * Fetch IPO-related filings with dual-layer model:
 * - Pipeline: S-1, S-1/A, F-1, F-1/A (intent)
 * - Confirmation: 424B4 (completed)
 * Correlates by CIK to set ipoStatus: 'pipeline' | 'completed'.
 */
export async function fetchIPOFilings(daysBack: number): Promise<RecentFiling[]> {
  const { dateFrom, dateTo } = getDateRange(daysBack);
  console.log(`${LOG_PREFIX} fetchIPOFilings(daysBack=${daysBack}) → dateFrom=${dateFrom}, dateTo=${dateTo}`);

  const [pipelineList, completedList] = await Promise.all([
    fetchPipelineFilings(dateFrom, dateTo),
    fetchCompletedIPOs(dateFrom, dateTo),
  ]);

  const merged: RecentFiling[] = [];
  const seen = new Set<string>();

  for (const f of completedList) {
    const key = `${f.cik}-${f.accessionNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...f, ipoStatus: 'completed' as const });
  }
  for (const f of pipelineList) {
    const key = `${f.cik}-${f.accessionNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...f, ipoStatus: 'pipeline' as const });
  }

  merged.sort((a, b) => (b.filingDate || '').localeCompare(a.filingDate || ''));
  console.log(`${LOG_PREFIX} Merged: ${merged.length} total (${completedList.length} completed, ${pipelineList.length} pipeline)`);
  return merged;
}

/**
 * Fetch pipeline filings (S-1, S-1/A, F-1, F-1/A). Backward-compatible entry point.
 */
export async function fetchRecentS1Filings(daysBack: number): Promise<RecentFiling[]> {
  return fetchIPOFilings(daysBack);
}

async function fetchPipelineFilings(dateFrom: string, dateTo: string): Promise<RecentFiling[]> {
  const searchList = await fetchViaSearch(dateFrom, dateTo, 'pipeline');
  if (searchList.length > 0) {
    return searchList.map((f) => ({ ...f, secIndexUrl: constructCompanySearchUrl(f.cik, f.formType || 'S-1') }));
  }
  const [s1List, f1List] = await Promise.all([fetchViaRecentForm('S-1'), fetchViaRecentForm('F-1')]);
  const combined = [...s1List, ...f1List].filter((f) => isDateInRange(f.filingDate, dateFrom, dateTo));
  return combined;
}

async function fetchCompletedIPOs(dateFrom: string, dateTo: string): Promise<RecentFiling[]> {
  const searchList = await fetchViaSearch(dateFrom, dateTo, 'confirmation');
  if (searchList.length > 0) {
    return searchList.map((f) => ({ ...f, secIndexUrl: constructCompanySearchUrl(f.cik, '424B4') }));
  }
  const list = await fetchViaRecent424B4();
  return list.filter((f) => isDateInRange(f.filingDate, dateFrom, dateTo));
}

async function fetchViaSearch(dateFrom: string, dateTo: string, layer: 'pipeline' | 'confirmation' = 'pipeline'): Promise<RecentFiling[]> {
  const url = `${API_BASE}/api/sec/search?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&layer=${layer}`;
  console.log(`${LOG_PREFIX} GET ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`${LOG_PREFIX} Search (${layer}) failed: ${res.status}`);
      return [];
    }
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
        secIndexUrl: constructCompanySearchUrl(cik, form),
      });
    }
    return list;
  } catch (e) {
    console.warn(`${LOG_PREFIX} Search (${layer}) request failed:`, e);
    return [];
  }
}

async function fetchViaRecentForm(formType: 'S-1' | 'F-1'): Promise<RecentFiling[]> {
  const endpoint = formType === 'S-1' ? 'recent-s1' : 'recent-f1';
  const url = `${API_BASE}/api/sec/${endpoint}?count=80`;
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
        formType: f.formType || formType,
        accessionNumber: f.accessionNumber || '',
        secIndexUrl: constructCompanySearchUrl(cik, f.formType || formType),
      };
    });
  } catch {
    return [];
  }
}

async function fetchViaRecent424B4(): Promise<RecentFiling[]> {
  const url = `${API_BASE}/api/sec/recent-424b4?count=80`;
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
        formType: f.formType || '424B4',
        accessionNumber: f.accessionNumber || '',
        secIndexUrl: constructCompanySearchUrl(cik, '424B4'),
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
 * Parse SEC-style id (e.g. "0001843724-0001193125-23-219891") into cik and optional accession.
 */
function parseSecId(id: string): { cik: string; accessionNumber: string } | null {
  const parts = id.split('-');
  if (parts.length < 2) return null;
  const first = parts[0];
  if (!/^\d{10}$/.test(first)) return null;
  return {
    cik: first,
    accessionNumber: parts.slice(1).join('-'),
  };
}

/** Company-like object built from SEC data (for detail page when not in mock) */
export interface SecCompany {
  id: string;
  cik: string;
  name: string;
  ticker: string;
  sector: string;
  filingDate: string;
  s1Link: string;
  accessionNumber: string;
  sicCode?: string;
  sicDescription?: string;
}

/**
 * Fetch full company data from SEC by id (cik-accession format).
 * Returns company with the actual filing date from the submissions API.
 */
export async function fetchCompanyById(id: string): Promise<SecCompany | null> {
  const parsed = parseSecId(id);
  if (!parsed) return null;
  const { cik, accessionNumber } = parsed;
  const padded = padCik(cik);
  const url = `${API_BASE}/api/sec/submissions/CIK${padded}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const name = data?.name ?? 'Unknown';
    const sic = data?.sic ?? null;
    const sicDescription = data?.sicDescription ?? null;
    const tickers = Array.isArray(data?.tickers) ? data.tickers : [];
    const accNums = data?.filings?.recent?.accessionNumber ?? [];
    const forms = data?.filings?.recent?.form ?? [];
    const filingDates = data?.filings?.recent?.filingDate ?? [];
    const accNorm = accessionNumber.replace(/-/g, '');
    let idx = accNums.findIndex((a: string) => (a || '') === accessionNumber);
    if (idx < 0) idx = accNums.findIndex((a: string) => (a || '').replace(/-/g, '') === accNorm);
    if (idx < 0) return null;
    const filingDate = filingDates[idx] ?? '';
    const accFromApi = accNums[idx] ?? accessionNumber;
    const formFromApi = forms[idx] ?? 'S-1';
    return {
      id,
      cik: padded,
      name,
      ticker: tickers[0] ?? '',
      sector: sicDescription ?? '—',
      filingDate,
      s1Link: constructCompanySearchUrl(padded, formFromApi),
      accessionNumber: accFromApi,
      sicCode: sic != null ? String(sic) : undefined,
      sicDescription: sicDescription != null ? String(sicDescription) : undefined,
    };
  } catch {
    return null;
  }
}

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
