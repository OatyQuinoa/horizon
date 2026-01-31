/**
 * SEC EDGAR Filing Service
 *
 * Fetches real S-1/IPO filings from SEC EDGAR via a server-side proxy.
 * SEC APIs (efts.sec.gov, data.sec.gov) do not allow CORS; all requests
 * go through /api/sec/* (Vite dev proxy or production server).
 *
 * For production with Supabase: set VITE_SEC_PROXY_URL to your Edge Function URL.
 */

import { Company } from '@/types';

const SEC_ARCHIVES_BASE = 'https://www.sec.gov/Archives/edgar/data';

/** Base URL for SEC proxy: same-origin /api/sec in dev and with Node server, or Supabase Edge Function URL */
function getSecApiBase(): string {
  return (import.meta.env.VITE_SEC_PROXY_URL as string) || '';
}

// Software-related SIC codes
const SOFTWARE_SIC_CODES = [
  '7370', '7371', '7372', '7373', '7374', '7375', '7376', '7377', '7378', '7379'
];

export interface SECSearchResult {
  _id: string;
  _source: {
    ciks: string[];
    display_names?: string[];
    entity?: string;
    form: string;
    file_date: string;
    file_num?: string[];
    root_form?: string;
    adsh?: string;
    accession_number?: string;
    sequence?: string;
    file_description?: string;
  };
}

export interface SECSearchResponse {
  hits: {
    hits: SECSearchResult[];
    total: {
      value: number;
    };
  };
}

export interface RecentFiling {
  id: string;
  cik: string;
  companyName: string;
  filingDate: string;
  formType: string;
  accessionNumber: string;
  filingUrl: string;
  secIndexUrl: string;
}

/**
 * Format CIK with leading zeros (10 digits)
 */
function formatCik(cik: string): string {
  return cik.padStart(10, '0');
}

/**
 * Construct SEC filing URL from CIK and accession number
 */
function constructFilingUrl(cik: string, accessionNumber: string): string {
  const cleanCik = cik.replace(/^0+/, '');
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  return `${SEC_ARCHIVES_BASE}/${cleanCik}/${accessionNoDashes}`;
}

/**
 * Construct SEC company search URL
 */
function constructSecIndexUrl(cik: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=S-1&dateb=&owner=exclude&count=40`;
}

/**
 * Fetch recent S-1 filings from SEC EDGAR via proxy (last N days).
 *
 * @param daysBack - Number of days to look back (default: 30 for "within a month")
 * @param formTypes - Array of form types to search for
 */
export async function fetchRecentS1Filings(
  daysBack: number = 30,
  formTypes: string[] = ['S-1', 'S-1/A']
): Promise<RecentFiling[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const dateFrom = startDate.toISOString().split('T')[0];
  const dateTo = endDate.toISOString().split('T')[0];

  const base = getSecApiBase();
  const searchUrl = `${base}/api/sec/search?dateFrom=${dateFrom}&dateTo=${dateTo}`;

  try {
    const response = await fetch(searchUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.error('SEC search failed:', response.status);
      return [];
    }

    const data: SECSearchResponse = await response.json();
    const hits = data.hits?.hits ?? [];

    return hits.map((hit, index) => {
      const src = hit._source;
      const cik = src.ciks?.[0] ?? '';
      const accessionNumber = src.adsh ?? src.accession_number ?? hit._id ?? String(index);
      const companyName = src.display_names?.[0] ?? src.entity ?? 'Unknown Company';
      return {
        id: hit._id || String(index),
        cik: formatCik(cik),
        companyName,
        filingDate: src.file_date,
        formType: src.form,
        accessionNumber,
        filingUrl: constructFilingUrl(cik, accessionNumber),
        secIndexUrl: constructSecIndexUrl(cik),
      };
    });
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
    return [];
  }
}

/**
 * Fetch company data from SEC submissions API via proxy.
 */
export async function fetchCompanyByCik(cik: string): Promise<Partial<Company> | null> {
  const paddedCik = formatCik(cik);
  const base = getSecApiBase();
  const url = `${base}/api/sec/submissions/CIK${paddedCik}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Find the most recent S-1 filing
    const filings = data.filings?.recent || {};
    const forms = filings.form || [];
    const filingDates = filings.filingDate || [];
    const accessionNumbers = filings.accessionNumber || [];
    
    let s1Index = -1;
    for (let i = 0; i < forms.length; i++) {
      if (forms[i] === 'S-1' || forms[i] === 'S-1/A') {
        s1Index = i;
        break;
      }
    }
    
    return {
      cik: paddedCik,
      name: data.name,
      sicCode: data.sic,
      sicDescription: data.sicDescription,
      sector: mapSicToSector(data.sic),
      filingDate: s1Index >= 0 ? filingDates[s1Index] : undefined,
      accessionNumber: s1Index >= 0 ? accessionNumbers[s1Index] : undefined,
      s1Link: constructSecIndexUrl(cik),
    };
  } catch (error) {
    console.error('Error fetching company data:', error);
    return null;
  }
}

/**
 * Map SIC code to a friendly sector name
 */
function mapSicToSector(sicCode: string): string {
  const sicMap: Record<string, string> = {
    '7370': 'Computer Software',
    '7371': 'Computer Programming',
    '7372': 'Enterprise Software',
    '7373': 'Systems Integration',
    '7374': 'Data Processing',
    '7375': 'Information Services',
    '7376': 'Computer Facilities',
    '7377': 'Computer Rentals',
    '7378': 'Computer Maintenance',
    '7379': 'Computer Services',
    '3674': 'Semiconductors',
    '3571': 'Computer Hardware',
    '3572': 'Storage Devices',
    '4813': 'Telecommunications',
    '4822': 'Telegraph/Communications',
    '7311': 'Advertising Services',
    '7361': 'Employment Services',
    '7363': 'Help Supply Services',
    '5961': 'E-commerce',
    '6022': 'Fintech/Banking',
    '6211': 'Fintech/Securities',
    '8731': 'R&D Services',
  };
  
  return sicMap[sicCode] || 'Technology';
}

/**
 * Check if a company is in the software/tech sector based on SIC code
 */
export function isSoftwareCompany(sicCode: string): boolean {
  return SOFTWARE_SIC_CODES.includes(sicCode);
}

/**
 * Get a human-readable relative date string
 */
export function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return 'Last month';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format filing date for display
 */
export function formatFilingDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export { SOFTWARE_SIC_CODES };
