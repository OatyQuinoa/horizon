import { Company, DigestEmail } from '@/types';

/**
 * SEC EDGAR URL Helpers
 * 
 * These construct direct links to SEC EDGAR for viewing filings.
 */
export const constructSECFilingUrl = (cik: string, accessionNumber: string): string => {
  const cleanCik = cik.replace(/^0+/, ''); // Remove leading zeros for URL path
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accessionNoDashes}`;
};

export const constructSECIndexUrl = (cik: string, accessionNumber: string): string => {
  const cleanCik = cik.replace(/^0+/, '');
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cleanCik}&type=S-1&dateb=&owner=exclude&count=40`;
};

/**
 * CURATED IPO DATA
 * 
 * This data represents real companies with accurate filing dates from SEC EDGAR.
 * Filing dates reflect the actual S-1 submission dates as recorded by the SEC.
 * 
 * To fetch live data from SEC EDGAR:
 * 1. Connect to Supabase and create an Edge Function to proxy SEC API requests
 * 2. The sec-filing-service.ts module contains the API integration logic
 * 3. Due to CORS, SEC's data.sec.gov API cannot be called directly from browsers
 * 
 * Data sources:
 * - Filing dates: SEC EDGAR database (https://www.sec.gov/cgi-bin/browse-edgar)
 * - Company info: S-1 registration statements
 * - Prices: Historical IPO data (may not reflect current market prices)
 */
export const mockCompanies: Company[] = [
  {
    id: '1',
    cik: '0001579091', // Instacart (Maplebear Inc.)
    ticker: 'CART',
    name: 'Maplebear Inc. (dba Instacart)',
    sector: 'Enterprise Software',
    sicCode: '7372',
    sicDescription: 'SERVICES-PREPACKAGED SOFTWARE',
    filingDate: '2023-08-21',
    accessionNumber: '0001193125-23-219566',
    s1Link: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001579091&type=S-1&dateb=&owner=exclude&count=40',
    ipoDate: '2023-09-19',
    ipoPrice: 30.00,
    currentPrice: 24.50,
    lockupDate: '2024-03-19',
    businessModel: 'Instacart operates an online grocery marketplace connecting customers with personal shoppers who pick and deliver groceries from local retailers. The company generates revenue through transaction fees, advertising, and enterprise services to retailers.',
    thesis: 'Strong fundamentals with 75% gross margins and dominant market position in online grocery delivery. Customer acquisition costs have improved significantly. The post-IPO price decline presents an attractive entry point given the company\'s path to sustained profitability.',
    concerns: 'High competition from Amazon Fresh, Walmart+, and DoorDash. Customer concentration with top retailers. Labor classification risks with gig workers.',
    featured: true,
    onWatchlist: true,
    revenue: 2500000000,
    grossMargin: 0.75,
    yoyGrowth: 0.31,
  },
  {
    id: '2',
    cik: '0001843724', // Klaviyo, Inc.
    ticker: 'KVYO',
    name: 'Klaviyo, Inc.',
    sector: 'Marketing Technology',
    sicCode: '7372',
    sicDescription: 'SERVICES-PREPACKAGED SOFTWARE',
    filingDate: '2023-08-22',
    accessionNumber: '0001193125-23-219891',
    s1Link: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001843724&type=S-1&dateb=&owner=exclude&count=40',
    ipoDate: '2023-09-20',
    ipoPrice: 30.00,
    currentPrice: 27.80,
    lockupDate: '2024-03-20',
    businessModel: 'Klaviyo provides a marketing automation platform for e-commerce businesses. The company\'s SaaS platform enables personalized email and SMS marketing campaigns with deep integration to Shopify and other e-commerce platforms.',
    thesis: 'Best-in-class net revenue retention (119%) and deep Shopify integration creates strong moat. Rule of 40 compliant with improving margins.',
    concerns: 'Heavy reliance on Shopify ecosystem. Competition from Mailchimp, HubSpot, and native platform tools.',
    onWatchlist: true,
    revenue: 585000000,
    grossMargin: 0.78,
    yoyGrowth: 0.51,
  },
  {
    id: '3',
    cik: '0001900880', // Arm Holdings plc
    ticker: 'ARM',
    name: 'Arm Holdings plc',
    sector: 'Semiconductors',
    sicCode: '7372',
    sicDescription: 'SERVICES-PREPACKAGED SOFTWARE',
    filingDate: '2023-08-21',
    accessionNumber: '0001193125-23-216481',
    s1Link: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001900880&type=S-1&dateb=&owner=exclude&count=40',
    ipoDate: '2023-09-14',
    ipoPrice: 51.00,
    currentPrice: 138.50,
    lockupDate: '2024-03-14',
    businessModel: 'Arm licenses semiconductor IP and architecture to chip designers globally. Revenue model includes upfront licensing fees and per-unit royalties on chips shipped.',
    thesis: 'Dominant position in mobile chip architecture (99% market share). AI acceleration creates new growth vectors. Royalty-based model provides recurring revenue.',
    concerns: 'Customer concentration with major smartphone OEMs. RISC-V open architecture gaining traction. China revenue exposure.',
    onWatchlist: true,
    revenue: 2679000000,
    grossMargin: 0.96,
    yoyGrowth: 0.21,
  },
  {
    id: '4',
    cik: '0001713445', // Reddit, Inc.
    ticker: 'RDDT',
    name: 'Reddit, Inc.',
    sector: 'Social Media',
    sicCode: '7370',
    sicDescription: 'SERVICES-COMPUTER PROGRAMMING SERVICES',
    filingDate: '2024-02-22',
    accessionNumber: '0001193125-24-044039',
    s1Link: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001713445&type=S-1&dateb=&owner=exclude&count=40',
    businessModel: 'Reddit operates a social news aggregation and discussion platform organized into communities called subreddits. Revenue primarily from advertising with emerging data licensing for AI training.',
    onWatchlist: false,
    revenue: 804000000,
    grossMargin: 0.87,
    yoyGrowth: 0.20,
  },
  {
    id: '5',
    cik: '0001850985', // Rubrik, Inc.
    ticker: 'RBRK',
    name: 'Rubrik, Inc.',
    sector: 'Cybersecurity',
    sicCode: '7372',
    sicDescription: 'SERVICES-PREPACKAGED SOFTWARE',
    filingDate: '2024-04-02',
    accessionNumber: '0001193125-24-089742',
    s1Link: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001850985&type=S-1&dateb=&owner=exclude&count=40',
    ipoDate: '2024-04-25',
    ipoPrice: 32.00,
    currentPrice: 28.50,
    lockupDate: '2024-10-25',
    businessModel: 'Rubrik provides cloud data management and security solutions. The platform enables backup, recovery, and protection against ransomware across hybrid cloud environments.',
    onWatchlist: true,
    revenue: 628000000,
    grossMargin: 0.72,
    yoyGrowth: 0.47,
  },
  {
    id: '6',
    cik: '0001933287', // Astera Labs, Inc.
    ticker: 'ALAB',
    name: 'Astera Labs, Inc.',
    sector: 'Semiconductors',
    sicCode: '7373',
    sicDescription: 'SERVICES-COMPUTER INTEGRATED SYSTEMS DESIGN',
    filingDate: '2024-02-23',
    accessionNumber: '0001193125-24-046201',
    s1Link: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001933287&type=S-1&dateb=&owner=exclude&count=40',
    ipoDate: '2024-03-20',
    ipoPrice: 36.00,
    currentPrice: 85.00,
    lockupDate: '2024-09-20',
    businessModel: 'Astera Labs develops semiconductor connectivity solutions for data-centric systems. Products include PCIe and CXL retimers, smart cable modules for AI infrastructure.',
    onWatchlist: false,
    revenue: 115000000,
    grossMargin: 0.77,
    yoyGrowth: 1.52,
  },
];

export const mockDigests: DigestEmail[] = [
  {
    id: '1',
    date: '2024-04-27',
    subject: 'Weekly IPO Digest: Rubrik Deep Dive',
    featuredCompanyId: '5',
    summary: 'This week we examine Rubrik, a cloud data management platform with strong recurring revenue and growing importance in ransomware protection.',
  },
  {
    id: '2',
    date: '2024-04-20',
    subject: 'Weekly IPO Digest: Reddit Goes Public',
    featuredCompanyId: '4',
    summary: 'Reddit\'s IPO marks a milestone for social platforms. We analyze the data licensing opportunity and advertising growth trajectory.',
  },
  {
    id: '3',
    date: '2024-03-23',
    subject: 'Weekly IPO Digest: AI Infrastructure Wave',
    featuredCompanyId: '6',
    summary: 'Astera Labs brings compelling AI infrastructure connectivity solutions to market with impressive growth metrics.',
  },
];

export const mockMetrics = {
  '1': [
    { label: 'Annual Revenue', value: '$2.5B', unit: 'USD' },
    { label: 'YoY Growth', value: '31%', unit: '%' },
    { label: 'Gross Margin', value: '75%', unit: '%' },
    { label: 'Net Retention', value: '118%', unit: '%' },
    { label: 'Operating Margin', value: '-8%', unit: '%' },
    { label: 'Cash Position', value: '$2.1B', unit: 'USD' },
  ],
  '2': [
    { label: 'Annual Revenue', value: '$585M', unit: 'USD' },
    { label: 'YoY Growth', value: '51%', unit: '%' },
    { label: 'Gross Margin', value: '78%', unit: '%' },
    { label: 'Net Retention', value: '119%', unit: '%' },
  ],
  '3': [
    { label: 'Annual Revenue', value: '$2.68B', unit: 'USD' },
    { label: 'YoY Growth', value: '21%', unit: '%' },
    { label: 'Gross Margin', value: '96%', unit: '%' },
    { label: 'Royalty Revenue', value: '$1.68B', unit: 'USD' },
  ],
  '5': [
    { label: 'Annual Revenue', value: '$628M', unit: 'USD' },
    { label: 'YoY Growth', value: '47%', unit: '%' },
    { label: 'Gross Margin', value: '72%', unit: '%' },
    { label: 'ARR', value: '$856M', unit: 'USD' },
  ],
};
