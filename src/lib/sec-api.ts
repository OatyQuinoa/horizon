/**
 * SEC EDGAR API Integration
 * 
 * This module provides utilities for fetching IPO-related data from the SEC EDGAR system.
 * Following SEC compliance requirements:
 * - User-Agent header required on all requests
 * - Rate limit: 10 requests per second
 * - Proper URL construction for various SEC endpoints
 */

// SEC API Configuration
const SEC_CONFIG = {
  userAgent: 'AIIS-InvestmentResearch/1.0 (research@aiis-demo.com)',
  rateLimit: 100, // ms between requests
  baseUrls: {
    submissions: 'https://data.sec.gov/submissions',
    archives: 'https://www.sec.gov/Archives/edgar/data',
    browse: 'https://www.sec.gov/cgi-bin/browse-edgar',
    rss: 'https://www.sec.gov/cgi-bin/browse-edgar',
  },
  softwareSicCodes: ['7370', '7371', '7372', '7373', '7374', '7375', '7376', '7377', '7378', '7379'],
};

// Types for SEC API responses
export interface SECSubmission {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  stateOfIncorporation: string;
  fiscalYearEnd: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
}

export interface SECFilingEntry {
  cik: string;
  filingDate: string;
  filingUrl: string;
  formType: string;
  title: string;
}

/**
 * Pad CIK to 10 digits with leading zeros
 */
export function padCik(cik: string | number): string {
  return String(cik).padStart(10, '0');
}

/**
 * Remove leading zeros from CIK for URL paths
 */
export function cleanCik(cik: string): string {
  return cik.replace(/^0+/, '');
}

/**
 * Construct SEC EDGAR filing URL
 */
export function constructFilingUrl(cik: string, accessionNumber: string, document?: string): string {
  const cleanedCik = cleanCik(cik);
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  
  if (document) {
    return `${SEC_CONFIG.baseUrls.archives}/${cleanedCik}/${accessionNoDashes}/${document}`;
  }
  
  return `${SEC_CONFIG.baseUrls.archives}/${cleanedCik}/${accessionNoDashes}`;
}

/**
 * Construct SEC EDGAR company search URL
 */
export function constructCompanySearchUrl(cik: string, formType: string = 'S-1'): string {
  const paddedCik = padCik(cik);
  return `${SEC_CONFIG.baseUrls.browse}?action=getcompany&CIK=${paddedCik}&type=${formType}&dateb=&owner=exclude&count=40`;
}

/**
 * Construct SEC submissions API URL
 */
export function constructSubmissionsUrl(cik: string): string {
  const paddedCik = padCik(cik);
  return `${SEC_CONFIG.baseUrls.submissions}/CIK${paddedCik}.json`;
}

/**
 * Construct RSS feed URL for S-1 filings
 */
export function constructRssFeedUrl(count: number = 40): string {
  return `${SEC_CONFIG.baseUrls.rss}?action=getcurrent&CIK=&type=S-1&company=&dateb=&owner=exclude&start=0&count=${count}&output=atom`;
}

/**
 * Check if a SIC code belongs to software companies
 */
export function isSoftwareCompany(sicCode: string): boolean {
  return SEC_CONFIG.softwareSicCodes.includes(sicCode);
}

/**
 * Fetch company submission data from SEC API
 * Note: This requires CORS to be handled (use a proxy in production)
 */
export async function fetchCompanySubmissions(cik: string): Promise<SECSubmission | null> {
  const url = constructSubmissionsUrl(cik);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': SEC_CONFIG.userAgent,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch submissions for CIK ${cik}: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching submissions for CIK ${cik}:`, error);
    return null;
  }
}

/**
 * Parse currency values from S-1 HTML content
 * Handles formats like: $1,234.5, $(500.0), 1234567
 */
export function parseCurrencyValue(text: string): number | null {
  if (!text) return null;
  
  // Remove dollar signs, commas, spaces
  let cleaned = text.replace(/[$,\s]/g, '');
  
  // Check for parentheses (negative values)
  const isNegative = /\(.*\)/.test(cleaned);
  cleaned = cleaned.replace(/[()]/g, '');
  
  // Parse to float
  const value = parseFloat(cleaned);
  
  if (isNaN(value)) return null;
  
  return isNegative ? -value : value;
}

/**
 * Format large numbers for display (e.g., 1500000 -> "$1.5M")
 */
export function formatLargeNumber(value: number | undefined, prefix: string = '$'): string {
  if (value === undefined || value === null) return 'N/A';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e9) {
    return `${sign}${prefix}${(absValue / 1e9).toFixed(1)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}${prefix}${(absValue / 1e6).toFixed(1)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}${prefix}${(absValue / 1e3).toFixed(0)}K`;
  }
  
  return `${sign}${prefix}${absValue.toFixed(0)}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Extract accession number from SEC filing URL
 */
export function extractAccessionNumber(url: string): string | null {
  // Pattern matches accession numbers like: 0001193125-23-219566
  const pattern = /(\d{10}-\d{2}-\d{6})/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * Extract CIK from SEC URL or ID
 */
export function extractCik(text: string): string | null {
  // Pattern matches 10-digit CIKs
  const pattern = /CIK[=:]?\s*(\d{10})/i;
  const match = text.match(pattern);
  
  if (match) return match[1];
  
  // Try to match just a 10-digit number
  const numPattern = /(\d{10})/;
  const numMatch = text.match(numPattern);
  
  return numMatch ? numMatch[1] : null;
}

/**
 * Rate-limited delay helper
 */
export function delay(ms: number = SEC_CONFIG.rateLimit): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { SEC_CONFIG };
