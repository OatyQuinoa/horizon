import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Company } from '@/types';
import { useSecFilings } from '@/hooks/use-sec-filings';

export type SecDataSource = 'sec-api' | 'curated' | 'loading';

/** Dashboard filter state: persisted across navigation (e.g. when returning from company detail). */
export interface DashboardFilters {
  /** Search: company name, ticker (prospectus text later) */
  searchQuery: string;
  /** IPO year from filing date: 'all' | '2025' | '2024' */
  ipoYear: string;
  /** Exchange if listed: 'all' | 'nyse' | 'nasdaq' (more data later) */
  exchange: string;
  timeFrame: string;
  sectorFilter: string;
  filingTypeFilter: string;
}

const DEFAULT_FILTERS: DashboardFilters = {
  searchQuery: '',
  ipoYear: '2025',
  exchange: 'all',
  timeFrame: 'all',
  sectorFilter: 'all',
  filingTypeFilter: 'all',
};

interface CompaniesContextValue {
  secFilings: Company[];
  setSecFilings: (filings: Company[]) => void;
  isLoading: boolean;
  error: string | null;
  dataSource: SecDataSource;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  /** Saved dashboard filters (time frame, sector, filing type). Persist when navigating away and back. */
  dashboardFilters: DashboardFilters;
  setDashboardFilters: (filters: Partial<DashboardFilters>) => void;
}

const CompaniesContext = createContext<CompaniesContextValue | null>(null);

/** Always-mounted loader: fetches SEC data once and keeps it in context so navigation does not refetch. */
function SecFilingsLoader({
  setSecFilings,
  setIsLoading,
  setError,
  setDataSource,
  setLastUpdated,
  refetchRef,
}: {
  setSecFilings: (f: Company[]) => void;
  setIsLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setDataSource: (v: SecDataSource) => void;
  setLastUpdated: (v: Date | null) => void;
  refetchRef: React.MutableRefObject<(() => Promise<void>) | undefined>;
}) {
  const { filings, isLoading, error, dataSource, lastUpdated, refetch } = useSecFilings(500, 'all');

  refetchRef.current = refetch;

  useEffect(() => {
    if (filings.length > 0) setSecFilings(filings);
  }, [filings, setSecFilings]);

  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  useEffect(() => {
    setError(error);
  }, [error, setError]);

  useEffect(() => {
    setDataSource(dataSource);
  }, [dataSource, setDataSource]);

  useEffect(() => {
    setLastUpdated(lastUpdated);
  }, [lastUpdated, setLastUpdated]);

  return null;
}

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [secFilings, setSecFilingsState] = useState<Company[]>([]);
  const [isLoading, setIsLoadingState] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  const [dataSource, setDataSourceState] = useState<SecDataSource>('loading');
  const [lastUpdated, setLastUpdatedState] = useState<Date | null>(null);
  const [dashboardFilters, setDashboardFiltersState] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const refetchRef = useRef<(() => Promise<void>) | undefined>();

  const setSecFilings = useCallback((filings: Company[]) => {
    setSecFilingsState((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      for (const f of filings) {
        byId.set(f.id, f);
      }
      return Array.from(byId.values()).sort((a, b) => (b.filingDate || '').localeCompare(a.filingDate || ''));
    });
  }, []);

  const setDashboardFilters = useCallback((updates: Partial<DashboardFilters>) => {
    setDashboardFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const refetch = useCallback(() => {
    return refetchRef.current?.() ?? Promise.resolve();
  }, []);

  return (
    <CompaniesContext.Provider
      value={{
        secFilings,
        setSecFilings,
        isLoading,
        error,
        dataSource,
        lastUpdated,
        refetch,
        dashboardFilters,
        setDashboardFilters,
      }}
    >
      <SecFilingsLoader
        setSecFilings={setSecFilings}
        setIsLoading={setIsLoadingState}
        setError={setErrorState}
        setDataSource={setDataSourceState}
        setLastUpdated={setLastUpdatedState}
        refetchRef={refetchRef}
      />
      {children}
    </CompaniesContext.Provider>
  );
}

export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) {
    throw new Error('useCompanies must be used within CompaniesProvider');
  }
  return ctx;
}

export function useCompaniesOptional(): CompaniesContextValue | null {
  return useContext(CompaniesContext);
}
