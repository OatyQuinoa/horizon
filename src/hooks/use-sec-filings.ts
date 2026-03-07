/**
 * React hook for fetching SEC EDGAR S-1 filings
 * 
 * Due to CORS restrictions with the SEC API in browser environments,
 * this hook provides two modes:
 * 1. Direct SEC API calls (works if CORS proxy is configured)
 * 2. Fallback to curated data from known recent IPOs
 */

import { useState, useEffect, useCallback } from 'react';
import { Company } from '@/types';
import { mockCompanies } from '@/data/mockData';
import {
  RecentFiling,
  fetchRecentS1Filings,
  formatFilingDate,
  getRelativeDate,
} from '@/lib/sec-filing-service';

/** SIC code range predicates for sector filtering */
function sicMatchesSector(sic: string | null | undefined, sector: string): boolean {
  if (!sic) return sector === 'all' || sector === 'other';
  const n = parseInt(sic.slice(0, 4), 10);
  if (isNaN(n)) return sector === 'all' || sector === 'other';
  if (sector === 'all') return true;
  const inNamedSector =
    (n >= 7370 && n <= 7379) ||
    ((n >= 8000 && n <= 8099) || (n >= 3840 && n <= 3859)) ||
    (n >= 6000 && n <= 6999) ||
    (n >= 5200 && n <= 5999) ||
    ((n >= 3500 && n <= 3999) || (n >= 2500 && n <= 2599)) ||
    ((n >= 1300 && n <= 1399) || (n >= 2900 && n <= 2999) || (n >= 1200 && n <= 1299)) ||
    (n >= 6500 && n <= 6599) ||
    (n >= 4800 && n <= 4899) ||
    (n >= 7000 && n <= 7999);
  if (sector === 'other') return !inNamedSector;
  switch (sector) {
    case 'software':
      return n >= 7370 && n <= 7379;
    case 'healthcare':
      return (n >= 8000 && n <= 8099) || (n >= 3840 && n <= 3859);
    case 'financial':
      return n >= 6000 && n <= 6999;
    case 'consumer':
      return n >= 5200 && n <= 5999;
    case 'industrial':
      return (n >= 3500 && n <= 3999) || (n >= 2500 && n <= 2599);
    case 'energy':
      return (n >= 1300 && n <= 1399) || (n >= 2900 && n <= 2999) || (n >= 1200 && n <= 1299);
    case 'realestate':
      return n >= 6500 && n <= 6599;
    case 'communications':
      return n >= 4800 && n <= 4899;
    case 'services':
      return n >= 7000 && n <= 7999 && (n < 7370 || n > 7379);
    default:
      return true;
  }
}

/** Map sicDescription to short sector label for display */
function sectorLabel(sicDescription: string | null | undefined): string {
  if (!sicDescription || sicDescription === '—') return '—';
  if (sicDescription.length > 24) return sicDescription.slice(0, 21) + '…';
  return sicDescription;
}

interface UseSecFilingsResult {
  filings: Company[];
  recentFilings: RecentFiling[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  dataSource: 'sec-api' | 'curated' | 'loading';
}

export interface UseSecFilingsOptions {
  /** When true, skip fetching on mount (e.g. use cached data from context). Refetch still works. */
  skipInitialFetch?: boolean;
}

/**
 * Hook to fetch and manage SEC filing data
 *
 * @param daysBack - Number of days to look back for filings (default: 30)
 * @param sectorFilter - Sector filter: 'all' | 'software' | 'healthcare' | 'financial' | etc.
 * @param options - Optional: skipInitialFetch to use cached data and avoid refetch on mount
 */
export function useSecFilings(
  daysBack: number = 30,
  sectorFilter: string = 'all',
  options?: UseSecFilingsOptions
): UseSecFilingsResult {
  const skipInitialFetch = options?.skipInitialFetch ?? false;
  const [filings, setFilings] = useState<Company[]>([]);
  const [recentFilings, setRecentFilings] = useState<RecentFiling[]>([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'sec-api' | 'curated' | 'loading'>(skipInitialFetch ? 'sec-api' : 'loading');

  const fetchFilings = useCallback(async () => {
    const LOG = '[SEC IPO]';
    setIsLoading(true);
    setError(null);
    setDataSource('loading');
    console.log(`${LOG} useSecFilings: fetching (daysBack=${daysBack}, sectorFilter=${sectorFilter})`);

    try {
      let secFilings = await fetchRecentS1Filings(daysBack);
      console.log(`${LOG} useSecFilings: SEC returned ${secFilings.length} filings`);

      if (secFilings.length > 0) {
        // Data is from /api/ipos (database); no SEC enrichment to avoid proxy calls
        const filterBySector = sectorFilter !== 'all';
        const enriched = secFilings.filter((filing) => {
          if (!filterBySector) return true;
          return sicMatchesSector(undefined, sectorFilter);
        });
        setRecentFilings(enriched);

        const convertedFilings: Company[] = enriched.map((filing) => ({
          id: filing.id,
          cik: filing.cik,
          name: filing.companyName,
          ticker: '',
          sector: '—',
          sicCode: undefined,
          sicDescription: undefined,
          filingDate: filing.filingDate,
          filingDates:
            filing.ipoStatus === 'completed'
              ? { prospectusFilingDate: filing.filingDate?.slice(0, 10) }
              : filing.ipoStatus === 'pipeline'
                ? { s1FilingDate: filing.filingDate?.slice(0, 10) }
                : undefined,
          accessionNumber: filing.accessionNumber,
          s1Link: filing.secIndexUrl,
          ipoStatus: filing.ipoStatus,
          onWatchlist: false,
        }));

        setFilings(convertedFilings);
        setDataSource('sec-api');
        setError(null);
        setLastUpdated(new Date());
        console.log(`${LOG} useSecFilings: set ${convertedFilings.length} companies for display`);
      } else {
        // No filings in date range: show empty, never old mock data
        console.log(`${LOG} useSecFilings: no filings in range; showing empty state`);
        setFilings([]);
        setRecentFilings([]);
        setDataSource('sec-api');
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(`${LOG} useSecFilings: fetch failed`, err);
      setFilings([]);
      setRecentFilings([]);
      setDataSource('curated');
      setError('IPO data unavailable. Ensure the database is connected and ingestion has run (npm run db:ingest).');
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [daysBack, sectorFilter]);

  useEffect(() => {
    if (skipInitialFetch) return;
    fetchFilings();
  }, [fetchFilings, skipInitialFetch]);

  return {
    filings,
    recentFilings,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchFilings,
    dataSource,
  };
}

/**
 * Get the display text for the data source
 */
export function getDataSourceLabel(source: 'sec-api' | 'curated' | 'loading'): string {
  switch (source) {
    case 'sec-api':
      return 'From database';
    case 'curated':
      return 'Unavailable';
    case 'loading':
      return 'Loading...';
  }
}

/** Format a Date as YYYY-MM-DD in local time (for consistent date-range filtering). */
function getLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Filing type filter: all, IPO-priced (424B4), or S-1 (pipeline). */
export type FilingTypeFilter = 'all' | 'completed' | 'pipeline';

/** Filter companies by date range, sector, filing type, and optional IPO year. Use with cached secFilings from context. */
export function filterFilingsForDisplay(
  companies: Company[],
  daysBack: number,
  sectorFilter: string,
  filingTypeFilter: FilingTypeFilter = 'all',
  ipoYear?: string
): Company[] {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - Math.max(1, daysBack));
  const dateFrom = getLocalDateStr(from);
  const dateTo = getLocalDateStr(to);
  const filtered = companies.filter((c) => {
    const d = (c.filingDate || '').slice(0, 10);
    if (!d || d.length < 10) return false;
    if (d < dateFrom || d > dateTo) return false;
    if (ipoYear && ipoYear !== 'all' && d.slice(0, 4) !== ipoYear) return false;
    if (filingTypeFilter !== 'all') {
      if (filingTypeFilter === 'completed' && c.ipoStatus !== 'completed') return false;
      if (filingTypeFilter === 'pipeline' && c.ipoStatus !== 'pipeline') return false;
    }
    return sicMatchesSector(c.sicCode ?? null, sectorFilter);
  });
  // Keep most recent first (SEC data may already be sorted; ensure consistency)
  return [...filtered].sort((a, b) => (b.filingDate || '').localeCompare(a.filingDate || ''));
}

export { formatFilingDate, getRelativeDate };
