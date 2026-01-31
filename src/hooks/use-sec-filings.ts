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
    setIsLoading(true);
    setError(null);
    setDataSource('loading');

    try {
      // Try to fetch from SEC API via proxy
      let secFilings = await fetchRecentS1Filings(daysBack);

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
        }

        setRecentFilings(secFilings);

        const convertedFilings: Company[] = secFilings.map((filing) => ({
          id: filing.id,
          cik: filing.cik,
          name: filing.companyName,
          ticker: '',
          sector: softwareOnly ? 'Technology' : '—',
          filingDate: filing.filingDate,
          accessionNumber: filing.accessionNumber,
          s1Link: filing.secIndexUrl,
          onWatchlist: false,
        }));

        setFilings(convertedFilings);
        setDataSource('sec-api');
        setError(null);
        setLastUpdated(new Date());
      } else {
        // No filings in date range: show empty, never old mock data
        setFilings([]);
        setRecentFilings([]);
        setDataSource('sec-api');
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch SEC filings:', err);
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
