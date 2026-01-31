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
import { RecentFiling, fetchRecentS1Filings, formatFilingDate, getRelativeDate } from '@/lib/sec-filing-service';

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
 * @param daysBack - Number of days to look back for filings (default: 14)
 * @param softwareOnly - Whether to filter only software/tech companies
 */
export function useSecFilings(
  daysBack: number = 14,
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
      // Try to fetch from SEC API first
      const secFilings = await fetchRecentS1Filings(daysBack);
      
      if (secFilings.length > 0) {
        // Successfully fetched from SEC
        setRecentFilings(secFilings);
        
        // Convert to Company format for display
        const convertedFilings: Company[] = secFilings.map((filing, index) => ({
          id: filing.id,
          cik: filing.cik,
          name: filing.companyName,
          sector: 'Technology', // Will be enriched with company lookup
          filingDate: filing.filingDate,
          accessionNumber: filing.accessionNumber,
          s1Link: filing.secIndexUrl,
          onWatchlist: false,
        }));
        
        setFilings(convertedFilings);
        setDataSource('sec-api');
        setLastUpdated(new Date());
      } else {
        // Fallback to curated mock data
        console.log('SEC API unavailable, using curated data');
        setFilings(mockCompanies);
        setDataSource('curated');
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch SEC filings:', err);
      // Fallback to mock data on error
      setFilings(mockCompanies);
      setDataSource('curated');
      setError('Using curated data - live SEC feed unavailable');
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
