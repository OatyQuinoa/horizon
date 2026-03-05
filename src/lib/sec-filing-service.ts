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

import { constructCompanySearchUrl, constructFullFilingTextUrl, isSoftwareCompany as isSoftwareSic, padCik } from '@/lib/sec-api';

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
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocal = `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`;
  const fromLocal = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
  return { dateFrom: fromLocal, dateTo: toLocal };
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
  const [searchList, s1List, f1List] = await Promise.all([
    fetchViaSearch(dateFrom, dateTo, 'pipeline'),
    fetchViaRecentForm('S-1'),
    fetchViaRecentForm('F-1'),
  ]);
  const byKey = new Map<string, RecentFiling>();
  const add = (f: RecentFiling) => {
    const key = `${f.cik}-${f.accessionNumber}`;
    if (!byKey.has(key)) byKey.set(key, { ...f, secIndexUrl: constructCompanySearchUrl(f.cik, f.formType || 'S-1') });
  };
  for (const f of searchList) add({ ...f, secIndexUrl: constructCompanySearchUrl(f.cik, f.formType || 'S-1') });
  for (const f of s1List) if (isDateInRange(f.filingDate, dateFrom, dateTo)) add(f);
  for (const f of f1List) if (isDateInRange(f.filingDate, dateFrom, dateTo)) add(f);
  return Array.from(byKey.values()).sort((a, b) => (b.filingDate || '').localeCompare(a.filingDate || ''));
}

async function fetchCompletedIPOs(dateFrom: string, dateTo: string): Promise<RecentFiling[]> {
  const searchList = await fetchViaSearch(dateFrom, dateTo, 'confirmation');
  const from424B4 = await fetchViaRecent424B4();
  const fallback = from424B4.filter((f) => isDateInRange(f.filingDate, dateFrom, dateTo));
  const byKey = new Map<string, RecentFiling>();
  for (const f of fallback) {
    byKey.set(`${f.cik}-${f.accessionNumber}`, { ...f, secIndexUrl: constructCompanySearchUrl(f.cik, '424B4') });
  }
  for (const f of searchList) {
    byKey.set(`${f.cik}-${f.accessionNumber}`, { ...f, secIndexUrl: constructCompanySearchUrl(f.cik, '424B4') });
  }
  return Array.from(byKey.values()).sort((a, b) => (b.filingDate || '').localeCompare(a.filingDate || ''));
}

const SEARCH_PAGE_SIZE = 400;

function parseSearchHits(hits: unknown[], layer: 'pipeline' | 'confirmation'): RecentFiling[] {
  const list: RecentFiling[] = [];
  for (const hit of hits) {
    const src = (hit as { _source?: Record<string, unknown> })?._source;
    if (!src) continue;
    const ciks = src.ciks as string[] | undefined;
    const cik = ciks?.[0] ? String(ciks[0]).padStart(10, '0') : '';
    const fileDate = (src.file_date as string) ?? '';
    const form = ((src.form as string) ?? 'S-1').trim();
    const accessionNumber = (src.accession_number as string) ?? (src.adsh as string) ?? '';
    const displayNames = src.display_names as string[] | undefined;
    const companyName = displayNames?.[0] ?? 'Unknown';
    if (!cik) continue;
    const formType = layer === 'confirmation' ? '424B4' : form;
    list.push({
      id: `${cik}-${accessionNumber || fileDate}`,
      cik,
      companyName,
      filingDate: fileDate,
      formType,
      accessionNumber,
      secIndexUrl: constructCompanySearchUrl(cik, formType),
    });
  }
  return list;
}

async function fetchViaSearch(dateFrom: string, dateTo: string, layer: 'pipeline' | 'confirmation' = 'pipeline'): Promise<RecentFiling[]> {
  const byKey = new Map<string, RecentFiling>();
  for (let from = 0; from < 800; from += SEARCH_PAGE_SIZE) {
    const url = `${API_BASE}/api/sec/search?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}&layer=${layer}&from=${from}&size=${SEARCH_PAGE_SIZE}`;
    console.log(`${LOG_PREFIX} GET ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`${LOG_PREFIX} Search (${layer}) failed: ${res.status}`);
        break;
      }
      const data = await res.json();
      const hits = data?.hits?.hits ?? [];
      const total = (data?.hits?.total as { value?: number })?.value ?? data?.hits?.total;
      if (typeof total === 'number' && process.env.NODE_ENV === 'development') {
        console.log(`${LOG_PREFIX} Search ${layer} page from=${from}: total=${total}, returned=${hits.length}`);
      }
      const list = parseSearchHits(hits, layer);
      if (list.length === 0) break;
      for (const f of list) byKey.set(`${f.cik}-${f.accessionNumber}`, f);
      if (hits.length < SEARCH_PAGE_SIZE) break; // last page
    } catch (e) {
      console.warn(`${LOG_PREFIX} Search (${layer}) request failed:`, e);
      break;
    }
  }
  return Array.from(byKey.values()).sort((a, b) => (b.filingDate || '').localeCompare(a.filingDate || ''));
}

async function fetchViaRecentForm(formType: 'S-1' | 'F-1'): Promise<RecentFiling[]> {
  const endpoint = formType === 'S-1' ? 'recent-s1' : 'recent-f1';
  const url = `${API_BASE}/api/sec/${endpoint}?count=200`;
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
  const url = `${API_BASE}/api/sec/recent-424b4?count=200`;
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
  filingDates?: {
    s1FilingDate?: string;
    registrationDate?: string;
    prospectusFilingDate?: string;
  };
  s1Link: string;
  accessionNumber: string;
  /** Primary document filename from SEC (e.g. ea0270193-03.htm) for direct prospectus URL */
  primaryDocument?: string;
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
    const primaryDocs = data?.filings?.recent?.primaryDocument ?? [];
    const accNorm = accessionNumber.replace(/-/g, '');
    let idx = accNums.findIndex((a: string) => (a || '') === accessionNumber);
    if (idx < 0) idx = accNums.findIndex((a: string) => (a || '').replace(/-/g, '') === accNorm);
    if (idx < 0) return null;
    const filingDate = filingDates[idx] ?? '';
    const accFromApi = accNums[idx] ?? accessionNumber;
    const formFromApi = forms[idx] ?? 'S-1';
    const primaryDoc = (primaryDocs[idx] ?? '').trim();

    const filingDatesOut: SecCompany['filingDates'] = {};
    let s1Earliest: string | null = null;
    let prospectusLatest: string | null = null;
    for (let i = 0; i < (forms?.length ?? 0); i++) {
      const f = String(forms[i] ?? '').toUpperCase();
      const d = (filingDates[i] ?? '').slice(0, 10);
      if (!d) continue;
      if (f === 'S-1' || f === 'S-1/A') {
        if (!s1Earliest || d < s1Earliest) s1Earliest = d;
      }
      if (f === '424B4') {
        if (!prospectusLatest || d > prospectusLatest) prospectusLatest = d;
      }
    }
    if (s1Earliest) filingDatesOut.s1FilingDate = s1Earliest;
    if (prospectusLatest) filingDatesOut.prospectusFilingDate = prospectusLatest;
    if (formFromApi === '424B4') filingDatesOut.prospectusFilingDate = filingDate.slice(0, 10);

    return {
      id,
      cik: padded,
      name,
      ticker: tickers[0] ?? '',
      sector: sicDescription ?? '—',
      filingDate,
      filingDates: Object.keys(filingDatesOut).length > 0 ? filingDatesOut : undefined,
      s1Link: constructCompanySearchUrl(padded, formFromApi),
      accessionNumber: accFromApi,
      primaryDocument: primaryDoc && /\.(htm|html)$/i.test(primaryDoc) ? primaryDoc : undefined,
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
// Full filing text (raw .txt) — reliable programmatic access to prospectus content
// ---------------------------------------------------------------------------

/**
 * URL for the full filing text (.txt) on SEC EDGAR.
 * The middle path segment is the accession number with hyphens removed.
 * Example: CIK 0002100782, accession 0001193125-26-083190
 *   → .../data/2100782/000119312526083190/0001193125-26-083190.txt
 */
export { constructFullFilingTextUrl } from '@/lib/sec-api';

/**
 * Fetch the full filing text (raw submission .txt) for a given CIK and accession number.
 * Uses the app proxy /api/sec/full-filing. The .txt contains the entire submission;
 * use parseFullFilingHtml to extract the main HTML document for display.
 */
export async function fetchFullFilingText(cik: string, accessionNumber: string): Promise<string | null> {
  const cleanCik = String(cik).replace(/\D/g, '').replace(/^0+/, '') || cik;
  const accession = accessionNumber.trim();
  if (!accession) return null;
  const url = `${API_BASE}/api/sec/full-filing?cik=${encodeURIComponent(cleanCik)}&accession=${encodeURIComponent(accession)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) throw new Error('RATE_LIMIT');
      if (res.status === 404) throw new Error('NOT_FOUND');
      throw new Error(`HTTP_${res.status}`);
    }
    return await res.text();
  } catch (e) {
    if (e instanceof Error && (e.message === 'RATE_LIMIT' || e.message === 'NOT_FOUND' || e.message.startsWith('HTTP_'))) throw e;
    throw new Error('NETWORK_ERROR');
  }
}

/** Parsed document from SEC full filing .txt */
export interface ParsedFilingDocument {
  type: string;
  sequence: string;
  filename: string;
  text: string;
  isHtml: boolean;
}

/**
 * Parse SEC full submission .txt into document blocks.
 * Uses indexOf for large content to avoid regex backtracking. Extracts <DOCUMENT> blocks and <TYPE>, <TEXT>.
 */
export function parseFullFilingDocuments(raw: string): ParsedFilingDocument[] {
  const docs: ParsedFilingDocument[] = [];
  const docStartTag = '<DOCUMENT>';
  const docEndTag = '</DOCUMENT>';
  let start = 0;
  while (true) {
    const docStart = raw.indexOf(docStartTag, start);
    if (docStart === -1) break;
    const docEnd = raw.indexOf(docEndTag, docStart + docStartTag.length);
    if (docEnd === -1) break;
    const block = raw.slice(docStart + docStartTag.length, docEnd);
    const typeMatch = block.match(/<TYPE>([^<]*)<\/TYPE>/i);
    const seqMatch = block.match(/<SEQUENCE>([^<]*)<\/SEQUENCE>/i);
    const fileMatch = block.match(/<FILENAME>([^<]*)<\/FILENAME>/i);
    const textOpen = block.indexOf('<TEXT>');
    const textClose = textOpen >= 0 ? block.indexOf('</TEXT>', textOpen + 6) : -1;
    const type = (typeMatch?.[1] ?? '').trim();
    const sequence = (seqMatch?.[1] ?? '').trim();
    const filename = (fileMatch?.[1] ?? '').trim();
    let text = textOpen >= 0 && textClose > textOpen
      ? block.slice(textOpen + 6, textClose).trim()
      : '';
    if (!text) {
      start = docEnd + docEndTag.length;
      continue;
    }
    const isHtml = /<\s*(html|body|div|table|p)\s[\s>]/i.test(text) || text.trimStart().startsWith('<!');
    docs.push({ type, sequence, filename, text, isHtml });
    start = docEnd + docEndTag.length;
  }
  return docs;
}

/**
 * Extract the best HTML document from parsed SEC filing for prospectus display.
 * Prefers 424B4 or S-1 type; falls back to first substantial HTML document, then largest HTML-like block.
 */
export function extractMainProspectusHtml(docs: ParsedFilingDocument[]): string | null {
  const preferTypes = ['424B4', '424B3', 'S-1', 'S-1/A', 'F-1', 'F-1/A'];
  for (const form of preferTypes) {
    const found = docs.find((d) => d.type.toUpperCase() === form && (d.isHtml || d.text.length > 2000) && d.text.length > 500);
    if (found) return found.text;
  }
  const firstHtml = docs.find((d) => (d.isHtml || d.text.length > 2000) && d.text.length > 500);
  if (firstHtml) return firstHtml.text;
  const bySize = docs.filter((d) => d.text.length > 500).sort((a, b) => b.text.length - a.text.length);
  return bySize[0]?.text ?? null;
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
