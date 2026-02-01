import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Company } from '@/types';

interface CompaniesContextValue {
  secFilings: Company[];
  setSecFilings: (filings: Company[]) => void;
}

const CompaniesContext = createContext<CompaniesContextValue | null>(null);

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [secFilings, setSecFilingsState] = useState<Company[]>([]);
  const setSecFilings = useCallback((filings: Company[]) => {
    setSecFilingsState(filings);
  }, []);

  return (
    <CompaniesContext.Provider value={{ secFilings, setSecFilings }}>
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
