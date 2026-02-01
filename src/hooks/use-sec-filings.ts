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
  fetchCompanyByCik,
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

/**
 * Hook to fetch and manage SEC filing data
 *
 * @param daysBack - Number of days to look back for filings (default: 30)
 * @param sectorFilter - Sector filter: 'all' | 'software' | 'healthcare' | 'financial' | etc.
 */
export function useSecFilings(
  daysBack: number = 30,
  sectorFilter: string = 'all'
): UseSecFilingsResult {
  const [filings, setFilings] = useState<Company[]>([]);
  const [recentFilings, setRecentFilings] = useState<RecentFiling[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'sec-api' | 'curated' | 'loading'>('loading');

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
        const filterBySector = sectorFilter !== 'all';
        const enriched: Array<RecentFiling & { sicCode?: string; sicDescription?: string }> = [];

        for (let i = 0; i < secFilings.length; i++) {
          const company = await fetchCompanyByCik(secFilings[i].cik);
          const sicCode = company?.sicCode ?? undefined;
          const sicDescription = company?.sicDescription ?? undefined;

          if (filterBySector && !sicMatchesSector(sicCode ?? null, sectorFilter)) continue;
          enriched.push({ ...secFilings[i], sicCode, sicDescription });

          if (i < secFilings.length - 1) {
            await new Promise((r) => setTimeout(r, 160));
          }
        }

        if (filterBySector) {
          console.log(`${LOG} useSecFilings: after sector filter: ${enriched.length} filings`);
        }
        setRecentFilings(enriched);

        const convertedFilings: Company[] = enriched.map((filing) => ({
          id: filing.id,
          cik: filing.cik,
          name: filing.companyName,
          ticker: '',
          sector: filing.sicDescription ? sectorLabel(filing.sicDescription) : (sectorFilter === 'software' ? 'Technology' : '—'),
          sicCode: filing.sicCode,
          sicDescription: filing.sicDescription,
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
      setError('Live SEC data unavailable. Use npm run dev or npm run start so the proxy can reach SEC EDGAR.');
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, [daysBack, sectorFilter]);

  useEffect(() => {
    fetchFilings();
  }, [fetchFilings]);

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
      return 'Live from SEC EDGAR';
    case 'curated':
      return 'Curated IPO data';
    case 'loading':
      return 'Loading...';
  }
}

export { formatFilingDate, getRelativeDate };
