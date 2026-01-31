/**
 * SEC EDGAR Filing Service
 * 
 * Fetches real S-1/IPO filings from SEC EDGAR using their public APIs.
 * 
 * Note: SEC EDGAR has CORS restrictions, so in a browser environment
 * we need to use a CORS proxy or server-side fetching. This service
 * is designed to work with a proxy prefix.
 */

import { Company } from '@/types';

// SEC EDGAR full-text search API
const SEC_EFTS_BASE = 'https://efts.sec.gov/LATEST/search-index';
const SEC_DATA_BASE = 'https://data.sec.gov';
const SEC_ARCHIVES_BASE = 'https://www.sec.gov/Archives/edgar/data';

// CORS proxy for client-side requests (you can replace with your own proxy)
const CORS_PROXY = 'https://corsproxy.io/?';

// Software-related SIC codes
const SOFTWARE_SIC_CODES = [
  '7370', '7371', '7372', '7373', '7374', '7375', '7376', '7377', '7378', '7379'
];

export interface SECSearchResult {
  _id: string;
  _source: {
    ciks: string[];
    display_names: string[];
    form: string;
    file_date: string;
    file_num: string[];
    root_form: string;
    adsh: string;
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
 * Fetch recent S-1 filings from SEC EDGAR full-text search
 * 
 * @param daysBack - Number of days to look back (default: 14 for "past two weeks")
 * @param formTypes - Array of form types to search for
 */
export async function fetchRecentS1Filings(
  daysBack: number = 14,
  formTypes: string[] = ['S-1', 'S-1/A']
): Promise<RecentFiling[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  
  const dateFrom = startDate.toISOString().split('T')[0];
  const dateTo = endDate.toISOString().split('T')[0];
  
  // SEC EDGAR full-text search API query
  const searchParams = new URLSearchParams({
    dateRange: 'custom',
    startdt: dateFrom,
    enddt: dateTo,
    forms: formTypes.join(','),
    // Only return 100 most recent
  });
  
  // Use the SEC EDGAR search API
  const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=*&dateRange=custom&startdt=${dateFrom}&enddt=${dateTo}&forms=${formTypes.join(',')}&from=0&size=100`;
  
  try {
    // Note: This will fail due to CORS in browser. 
    // In production, you'd use a server-side proxy or edge function
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(searchUrl)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AIIS-Research/1.0',
      },
    });
    
    if (!response.ok) {
      console.error('SEC search failed:', response.status);
      return [];
    }
    
    const data: SECSearchResponse = await response.json();
    
    return data.hits.hits.map((hit, index) => ({
      id: hit._id || String(index),
      cik: formatCik(hit._source.ciks[0]),
      companyName: hit._source.display_names[0] || 'Unknown Company',
      filingDate: hit._source.file_date,
      formType: hit._source.form,
      accessionNumber: hit._source.adsh,
      filingUrl: constructFilingUrl(hit._source.ciks[0], hit._source.adsh),
      secIndexUrl: constructSecIndexUrl(hit._source.ciks[0]),
    }));
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
    return [];
  }
}

/**
 * Alternative: Fetch company data from SEC submissions endpoint
 * This is more reliable but requires knowing the CIK in advance
 */
export async function fetchCompanyByCik(cik: string): Promise<Partial<Company> | null> {
  const paddedCik = formatCik(cik);
  const url = `${SEC_DATA_BASE}/submissions/CIK${paddedCik}.json`;
  
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AIIS-Research/1.0',
      },
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
