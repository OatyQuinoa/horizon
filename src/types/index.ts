export interface Company {
  id: string;
  cik: string; // SEC Central Index Key (10-digit, zero-padded)
  ticker: string;
  name: string;
  sector: string;
  sicCode?: string; // Standard Industrial Classification code
  sicDescription?: string;
  filingDate: string;
  s1Link: string; // Direct link to SEC EDGAR filing
  accessionNumber?: string; // SEC accession number for the filing
  ipoDate?: string;
  ipoPrice?: number;
  currentPrice?: number;
  lockupDate?: string;
  businessModel?: string;
  thesis?: string;
  concerns?: string;
  featured?: boolean;
  onWatchlist?: boolean;
  // Financial metrics from S-1
  revenue?: number;
  grossMargin?: number;
  rdSpend?: number;
  yoyGrowth?: number;
}

export interface Metric {
  label: string;
  value: string;
  unit?: string;
}

export interface DigestEmail {
  id: string;
  date: string;
  subject: string;
  featuredCompanyId: string;
  summary: string;
}

export type WatchlistCategory = 'opportunities' | 'monitoring';
