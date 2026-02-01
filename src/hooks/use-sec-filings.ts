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
  isSoftwareCompany,
  formatFilingDate,
  getRelativeDate,
} from '@/lib/sec-filing-service';

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
 * @param daysBack - Number of days to look back for filings (default: 30, within a month)
 * @param softwareOnly - Whether to filter only software/tech companies (used when enriching; all S-1 returned from SEC)
 */
export function useSecFilings(
  daysBack: number = 30,
  softwareOnly: boolean = true
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
    console.log(`${LOG} useSecFilings: fetching (daysBack=${daysBack}, softwareOnly=${softwareOnly})`);

    try {
      // Try to fetch from SEC API via proxy
      let secFilings = await fetchRecentS1Filings(daysBack);
      console.log(`${LOG} useSecFilings: SEC returned ${secFilings.length} filings`);

      if (secFilings.length > 0) {
        // Optionally filter to software/tech only (SIC 7370-7379) via Submissions API
        if (softwareOnly) {
          const filtered: RecentFiling[] = [];
          for (let i = 0; i < secFilings.length; i++) {
            const company = await fetchCompanyByCik(secFilings[i].cik);
            if (company?.sicCode && isSoftwareCompany(company.sicCode)) {
              filtered.push(secFilings[i]);
            }
            if (i < secFilings.length - 1) {
              await new Promise((r) => setTimeout(r, 160));
            }
          }
          secFilings = filtered;
          console.log(`${LOG} useSecFilings: after software filter: ${secFilings.length} filings`);
        }

        setRecentFilings(secFilings);

        const convertedFilings: Company[] = secFilings.map((filing) => ({
          id: filing.id,
          cik: filing.cik,
          name: filing.companyName,
          ticker: '',
          sector: softwareOnly ? 'Technology' : '—',
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
  }, [daysBack, softwareOnly]);

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
