/** IPO status: pipeline = S-1/F-1 intent, completed = 424B4 filed */
export type IpoStatus = 'pipeline' | 'completed';

/** Filing dates with distinct meanings for the IPO timeline */
export interface FilingDates {
  /** When the company submitted the initial S-1 registration statement (IPO intent) */
  s1FilingDate?: string;
  /** When the SEC formally declared the registration effective (regulatory milestone) */
  registrationDate?: string;
  /** When the final 424B4 prospectus was filed (actionable event; offering priced) */
  prospectusFilingDate?: string;
}

export interface Company {
  id: string;
  cik: string; // SEC Central Index Key (10-digit, zero-padded)
  ticker: string;
  name: string;
  sector: string;
  sicCode?: string; // Standard Industrial Classification code
  sicDescription?: string;
  filingDate: string;
  /** Distinct filing dates: S-1 (intent), registration (effective), prospectus (424B4) */
  filingDates?: FilingDates;
  s1Link: string; // Direct link to SEC EDGAR filing
  accessionNumber?: string; // SEC accession number for the filing
  /** Pipeline = intent; Completed = 424B4 filed (IPO priced) */
  ipoStatus?: IpoStatus;
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
