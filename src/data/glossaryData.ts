/**
 * Glossary content: structured for tabs, accordions, and keyword search.
 * Calm, factual tone. No gamification.
 */

export const GLOSSARY_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lifecycle', label: 'IPO Lifecycle' },
  { id: 'filing-types', label: 'Filing Types' },
  { id: 'sectors', label: 'Sectors & Industries' },
  { id: 'anatomy', label: 'Prospectus Anatomy' },
  { id: 'what-to-look-for', label: 'What to Look For' },
  { id: 'risk', label: 'Risk Landscape' },
  { id: 'behavioral', label: 'Behavioral Prudence' },
  { id: 'red-flags', label: 'Red Flags' },
  { id: 'metrics', label: 'Metrics & Valuation' },
  { id: 'advanced', label: 'Advanced Concepts' },
] as const;

export type GlossaryTabId = (typeof GLOSSARY_TABS)[number]['id'];

export interface GlossaryEntry {
  id: string;
  tabId: GlossaryTabId;
  title: string;
  content: string;
  relatedTerms?: string[];
}

/** Estimate reading time in minutes (≈ 200 words/min). */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** All entries for accordion + search. */
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // --- OVERVIEW ---
  {
    id: 'overview-what-is-ipo',
    tabId: 'overview',
    title: 'What is an IPO?',
    content:
      'An initial public offering (IPO) is the first sale of a company’s equity to the public. The company files registration documents with the SEC, undergoes review, and then sells shares to investors. After the IPO, the stock trades on an exchange. IPO investing carries unique risks: limited operating history, information asymmetry, and lock-up expirations that can affect supply.',
    relatedTerms: ['IPO Lifecycle', '424B4', 'S-1'],
  },
  {
    id: 'overview-why-go-public',
    tabId: 'overview',
    title: 'Why do companies go public?',
    content:
      'Companies go public to raise capital for growth, provide liquidity to early investors and employees, and establish a public currency for acquisitions. Going public also imposes ongoing disclosure and governance obligations. The decision reflects a trade-off between access to capital and the costs of being public.',
    relatedTerms: ['Use of Proceeds', 'Lock-Up Period'],
  },
  {
    id: 'overview-risks-opportunities',
    tabId: 'overview',
    title: 'Why IPO investing carries unique risks and opportunities',
    content:
      'IPOs often have limited trading history, no long-term public track record, and pricing that can reflect narrative optimism. Lock-up expirations can increase share supply. At the same time, early-stage public companies may offer exposure to growth that is harder to find in mature names. Understanding the structure and filings helps evaluate the opportunity rather than the hype.',
    relatedTerms: ['Risk Landscape', 'Behavioral Prudence'],
  },
  {
    id: 'overview-how-prospectus-helps',
    tabId: 'overview',
    title: 'How Prospectus helps interpret filings',
    content:
      'Prospectus helps you interpret SEC filings — not predict short-term price moves. The focus is on disclosure, capital structure, use of proceeds, and risk factors. The goal is to support long-term thinking and disciplined evaluation, not trading or speculation.',
    relatedTerms: ['Prospectus Anatomy', 'Filing Types'],
  },

  // --- IPO LIFECYCLE (steps as entries) ---
  {
    id: 'lifecycle-private',
    tabId: 'lifecycle',
    title: 'Private company',
    content:
      'The company operates as a private entity with no obligation to file public reports. Financials and risks are not visible to public investors. This stage ends when the company files a registration statement with the SEC.',
    relatedTerms: ['S-1', 'IPO Lifecycle'],
  },
  {
    id: 'lifecycle-s1-filed',
    tabId: 'lifecycle',
    title: 'S-1 filed',
    content:
      'The company files the initial S-1 registration statement. This is evolving disclosure: the document will be amended during SEC review. Key sections include business description, risk factors, use of proceeds, and financial statements. What it is: The first public disclosure of the offering. Why it matters: Establishes the baseline narrative; amendments will refine it.',
    relatedTerms: ['S-1', 'S-1/A', '424B4'],
  },
  {
    id: 'lifecycle-sec-review',
    tabId: 'lifecycle',
    title: 'SEC review',
    content:
      'The SEC reviews the filing and may issue comment letters. The company responds and may amend the S-1. What changes: Disclosure is refined; risks and financials are clarified. Why it matters: Review improves the quality of disclosure before the offering is priced.',
    relatedTerms: ['S-1/A', 'Filing Types'],
  },
  {
    id: 'lifecycle-amendments',
    tabId: 'lifecycle',
    title: 'Amendments (S-1/A)',
    content:
      'Each amendment is filed as an S-1/A. Amendments may update financials, risk factors, or offering terms. S-1 = evolving disclosure; the 424B4 will contain finalized terms. What changes: The document moves toward final form. Why it matters: For long-term analysis, the final 424B4 is the definitive source for offering terms and capital structure.',
    relatedTerms: ['S-1/A', '424B4'],
  },
  {
    id: 'lifecycle-roadshow',
    tabId: 'lifecycle',
    title: 'Roadshow',
    content:
      'Management presents the offering to institutional investors. Pricing is not yet set. What changes: Investor feedback may influence pricing and allocation. Why it matters: Retail investors see the result after pricing; the roadshow is part of the price-discovery process.',
    relatedTerms: ['Pricing', '424B4'],
  },
  {
    id: 'lifecycle-pricing',
    tabId: 'lifecycle',
    title: 'Pricing',
    content:
      'The company and underwriters set the offer price and share count. What changes: Final offering terms are locked in. Why it matters: The 424B4 filed after pricing reflects the actual deal—share count, price, and use of proceeds.',
    relatedTerms: ['424B4', 'Underwriting'],
  },
  {
    id: 'lifecycle-424b4',
    tabId: 'lifecycle',
    title: '424B4 filed',
    content:
      'The final prospectus is filed after pricing. It contains final share count, price, underwriting details, and updated financial data. This is the definitive document for ownership, dilution, and capital structure. Post-IPO filings (10-Q, 10-K, 8-K) begin the accountability phase.',
    relatedTerms: ['424B4', '10-Q', '10-K', '8-K'],
  },
  {
    id: 'lifecycle-trading',
    tabId: 'lifecycle',
    title: 'Trading begins',
    content:
      'Shares list on an exchange and trade publicly. Volatility is common in early sessions. What changes: Liquidity and price discovery move to the market. Why it matters: Long-term returns are not determined by first-day movement; discipline and time horizon matter.',
    relatedTerms: ['Behavioral Prudence', 'Lock-Up Period'],
  },
  {
    id: 'lifecycle-lockup',
    tabId: 'lifecycle',
    title: 'Lock-up expiration',
    content:
      'Typically 180 days after the offering, insiders may sell shares subject to lock-up. Expiration can increase supply and affect price. What changes: New liquidity in the form of insider selling. Why it matters: Lock-up expiry is a known structural event; position sizing and timeline should account for it.',
    relatedTerms: ['Lock-Up Period', 'Risk Landscape'],
  },
  {
    id: 'lifecycle-10q-10k',
    tabId: 'lifecycle',
    title: 'First 10-Q and 10-K',
    content:
      'The company files quarterly (10-Q) and annual (10-K) reports. This is the accountability phase: the real test of IPO promises begins here. Why it matters: IPO analysis does not stop at listing day; ongoing disclosure reveals execution and changes in risk.',
    relatedTerms: ['10-Q', '10-K', 'Filing Types'],
  },

  // --- FILING TYPES ---
  {
    id: 'filing-s1',
    tabId: 'filing-types',
    title: 'S-1',
    content:
      'Purpose: Initial registration statement for a domestic IPO. Discloses business, risks, financials, and proposed offering. Timing: Filed before SEC review; often amended. Why investors should care: Evolving disclosure; for final terms and capital structure, use the 424B4. Prospectus primarily analyzes 424B4 filings because they contain final offering details.',
    relatedTerms: ['S-1/A', '424B4', 'IPO Lifecycle'],
  },
  {
    id: 'filing-s1a',
    tabId: 'filing-types',
    title: 'S-1/A',
    content:
      'Purpose: Amendment to the S-1 during SEC review. Timing: Filed in response to comments or to update information. Why investors should care: Amendments refine disclosure; the latest S-1/A before pricing is the best pre-pricing view, but 424B4 remains definitive.',
    relatedTerms: ['S-1', '424B4'],
  },
  {
    id: 'filing-424b4',
    tabId: 'filing-types',
    title: '424B4',
    content:
      'Purpose: Final prospectus filed after pricing. Contains final share count, price, underwriting details, and updated financials. Timing: Filed when the offering is priced. Why investors should care: This is the definitive document for dilution, use of proceeds, and capital structure. Prospectus primarily analyzes 424B4 filings for this reason.',
    relatedTerms: ['S-1', 'Underwriting', 'Use of Proceeds'],
  },
  {
    id: 'filing-8k',
    tabId: 'filing-types',
    title: '8-K',
    content:
      'Purpose: Current report of material events. Timing: Filed within days of a material event. Why investors should care: Post-IPO developments—executive changes, acquisitions, results, impairments—often appear here first.',
    relatedTerms: ['10-Q', '10-K', 'Material events'],
  },
  {
    id: 'filing-10q',
    tabId: 'filing-types',
    title: '10-Q',
    content:
      'Purpose: Quarterly report. Unaudited financials and MD&A. Timing: Filed after each of the first three fiscal quarters. Why investors should care: The real test of IPO promises begins here; track execution and changes in guidance.',
    relatedTerms: ['10-K', '8-K', 'MD&A'],
  },
  {
    id: 'filing-10k',
    tabId: 'filing-types',
    title: '10-K',
    content:
      'Purpose: Annual report. Audited financials, full MD&A, risk factors. Timing: Filed after fiscal year end. Why investors should care: Most comprehensive annual disclosure; compare results to IPO narrative and use of proceeds.',
    relatedTerms: ['10-Q', 'MD&A', 'Risk Factors'],
  },
  {
    id: 'filing-form4',
    tabId: 'filing-types',
    title: 'Form 4 (insider trading)',
    content:
      'Purpose: Reports insider purchases and sales of company stock. Timing: Filed within a few business days of the transaction. Why investors should care: Reveals whether insiders are buying or selling; concentration and alignment with public shareholders.',
    relatedTerms: ['Lock-Up Period', 'Principal Stockholders'],
  },
  {
    id: 'filing-def14a',
    tabId: 'filing-types',
    title: 'DEF 14A (proxy statement)',
    content:
      'Purpose: Proxy materials for shareholder meetings—elections, compensation, proposals. Timing: Filed before annual or special meetings. Why investors should care: Governance, executive compensation, and shareholder proposals that affect long-term alignment.',
    relatedTerms: ['Principal Stockholders', 'Capital structure'],
  },

  // --- SECTORS & INDUSTRIES ---
  {
    id: 'sectors-macro',
    tabId: 'sectors',
    title: 'Sectors (macro categories)',
    content:
      'Broad categories: Technology, Healthcare, Financial Services, Energy, Industrials, Consumer, Real Estate, Communications, Materials. Industry classification affects risk profile and capital intensity. We do not rank sectors; we explain structural characteristics so you can evaluate how they apply to a given company.',
    relatedTerms: ['Industries', 'Risk Landscape'],
  },
  {
    id: 'sectors-industries',
    tabId: 'sectors',
    title: 'Industries (subcategories)',
    content:
      'Examples: Software (SaaS), Semiconductors, Biotechnology, Medical Devices, Renewable Energy, Payments, Marketplaces. Plus blank check / SPAC: a special-purpose acquisition company raises capital first, then seeks an acquisition target; risk profile differs from traditional IPOs. Industry classification affects risk profile and capital intensity.',
    relatedTerms: ['SPAC', 'Sectors'],
  },
  {
    id: 'sectors-spac',
    tabId: 'sectors',
    title: 'Blank check / SPAC',
    content:
      'A special purpose acquisition company (SPAC) raises capital in an IPO with no operating business, then seeks an acquisition target. The risk profile differs from traditional IPOs: deal structure, dilution from warrants and promote, and target selection matter. Explain structural characteristics rather than ranking.',
    relatedTerms: ['Industries', 'Dilution', 'Capital structure'],
  },

  // --- PROSPECTUS ANATOMY ---
  {
    id: 'anatomy-summary',
    tabId: 'anatomy',
    title: 'Prospectus Summary',
    content:
      'What’s here: High-level overview of the business, offering, and risks. What to extract: A quick orientation; always read the full risk factors and use of proceeds. Common misunderstanding: The summary is not a substitute for the rest of the document.',
    relatedTerms: ['Risk Factors', 'Use of Proceeds'],
  },
  {
    id: 'anatomy-risk-factors',
    tabId: 'anatomy',
    title: 'Risk Factors',
    content:
      'What’s here: Disclosure of material risks. What to extract: Are risks generic boilerplate or highly specific to the business? Specificity often signals thoughtful disclosure. Common misunderstanding: All companies list similar risks; the differentiation is in the details.',
    relatedTerms: ['Risk Landscape', 'Prospectus Summary'],
  },
  {
    id: 'anatomy-use-of-proceeds',
    tabId: 'anatomy',
    title: 'Use of Proceeds',
    content:
      'What’s here: How the company plans to use offering proceeds. What to extract: Is capital going to growth, debt repayment, or funding operating losses? Who is selling—the company or insiders? Common misunderstanding: Proceeds used to repay insiders warrant a closer look.',
    relatedTerms: ['Dilution', 'Red Flags'],
  },
  {
    id: 'anatomy-capitalization',
    tabId: 'anatomy',
    title: 'Capitalization',
    content:
      'What’s here: Capital structure before and after the offering—debt, equity, preferred. What to extract: Fully diluted share count, ownership concentration, and any preferred or dual-class structure. Common misunderstanding: Post-offering table is as-of a date; check for options and warrants.',
    relatedTerms: ['Dilution', 'Fully Diluted Shares'],
  },
  {
    id: 'anatomy-dilution',
    tabId: 'anatomy',
    title: 'Dilution',
    content:
      'What’s here: How much of the company is being sold; what percentage of the company public investors will own. What to extract: Percentage sold, who is selling (company vs. insiders). Why it matters for long-term durability: Ownership structure affects alignment and future dilution from options.',
    relatedTerms: ['Capitalization', 'Use of Proceeds', 'Fully Diluted Shares'],
  },
  {
    id: 'anatomy-mda',
    tabId: 'anatomy',
    title: 'Management Discussion & Analysis (MD&A)',
    content:
      'What’s here: Management’s explanation of results, trends, and liquidity. What to extract: How management explains performance and risk; consistency with risk factors. Common misunderstanding: MD&A is management’s view; compare to financial statements and subsequent filings.',
    relatedTerms: ['Financial Statements', '10-Q', '10-K'],
  },
  {
    id: 'anatomy-business',
    tabId: 'anatomy',
    title: 'Business',
    content:
      'What’s here: Description of the business model, competitive landscape, and strategy. What to extract: Revenue drivers, unit economics, and competitive moats. Common misunderstanding: Marketing language vs. measurable metrics; focus on what is disclosed with numbers.',
    relatedTerms: ['Revenue Quality', 'Gross Margin', 'What to Look For'],
  },
  {
    id: 'anatomy-financials',
    tabId: 'anatomy',
    title: 'Financial Statements',
    content:
      'What’s here: Audited (or reviewed) financial statements. What to extract: Revenue quality, margins, burn rate, and balance sheet strength. Common misunderstanding: GAAP vs. non-GAAP; understand adjustments and why they are made.',
    relatedTerms: ['Metrics & Valuation', 'MD&A', 'Burn Rate'],
  },
  {
    id: 'anatomy-principal-stockholders',
    tabId: 'anatomy',
    title: 'Principal Stockholders',
    content:
      'What’s here: Ownership of 5%+ holders and management. What to extract: Concentration, insider alignment, and who is selling in the offering. Common misunderstanding: Ownership is as of a date; check Form 4 for subsequent changes.',
    relatedTerms: ['Form 4', 'Dilution', 'Insider Ownership'],
  },
  {
    id: 'anatomy-underwriting',
    tabId: 'anatomy',
    title: 'Underwriting',
    content:
      'What’s here: Underwriters, fees, and allocation. What to extract: Cost of the offering and any over-allotment (greenshoe). Common misunderstanding: Underwriting fees are a cost to the company; over-allotment can affect share supply.',
    relatedTerms: ['424B4', 'Pricing'],
  },

  // --- WHAT TO LOOK FOR ---
  {
    id: 'look-revenue-quality',
    tabId: 'what-to-look-for',
    title: 'Revenue Quality',
    content:
      'Is revenue recurring? Concentrated in few customers? Growing through price or volume? This affects long-term durability. We avoid prescriptive language; we explain what each factor means so you can weigh it in context.',
    relatedTerms: ['Customer Concentration', 'Gross Margin', 'Business'],
  },
  {
    id: 'look-gross-margins',
    tabId: 'what-to-look-for',
    title: 'Gross Margins',
    content:
      'Does the business improve as it scales? Gross margin trend and level indicate pricing power and unit economics. This affects long-term durability.',
    relatedTerms: ['Revenue Quality', 'Operating Leverage', 'Financial Statements'],
  },
  {
    id: 'look-cash-runway',
    tabId: 'what-to-look-for',
    title: 'Cash Runway',
    content:
      'How long can the company operate at current burn rate before needing more capital? Runway affects dilution risk and strategic optionality. This affects long-term durability.',
    relatedTerms: ['Burn Rate', 'Use of Proceeds', 'Metrics & Valuation'],
  },
  {
    id: 'look-customer-concentration',
    tabId: 'what-to-look-for',
    title: 'Customer Concentration',
    content:
      'Does one or a few customers represent a large share of revenue? Concentration increases risk if a key customer leaves. This affects long-term durability.',
    relatedTerms: ['Revenue Quality', 'Risk Factors', 'Red Flags'],
  },
  {
    id: 'look-insider-ownership',
    tabId: 'what-to-look-for',
    title: 'Insider Ownership',
    content:
      'Who owns what after the offering? Are insiders selling in the offering? Alignment and concentration matter for governance. This affects long-term durability.',
    relatedTerms: ['Principal Stockholders', 'Form 4', 'Use of Proceeds'],
  },
  {
    id: 'look-debt-levels',
    tabId: 'what-to-look-for',
    title: 'Debt Levels',
    content:
      'What debt exists? How does it change after the offering? Debt affects flexibility and risk in downturns. This affects long-term durability.',
    relatedTerms: ['Capitalization', 'Use of Proceeds'],
  },
  {
    id: 'look-share-structure',
    tabId: 'what-to-look-for',
    title: 'Share Structure (dual-class?)',
    content:
      'Single-class or dual-class? Voting rights and control affect governance and alignment. This affects long-term durability.',
    relatedTerms: ['Capital Structure', 'Principal Stockholders', 'Advanced Concepts'],
  },
  {
    id: 'look-operating-leverage',
    tabId: 'what-to-look-for',
    title: 'Operating Leverage Potential',
    content:
      'Can margins expand as revenue grows? Fixed vs. variable cost structure. This affects long-term durability.',
    relatedTerms: ['Gross Margins', 'Metrics & Valuation'],
  },

  // --- RISK LANDSCAPE ---
  {
    id: 'risk-company',
    tabId: 'risk',
    title: 'Company-specific risk',
    content:
      'Execution, competitive position, and management. IPO risk is not synonymous with growth potential. We explain risks at multiple levels so you can assess how they apply.',
    relatedTerms: ['Risk Factors', 'Red Flags'],
  },
  {
    id: 'risk-industry',
    tabId: 'risk',
    title: 'Industry risk',
    content:
      'Regulation, cyclicality, and technological change. Industry classification affects risk profile. IPO risk is not synonymous with growth potential.',
    relatedTerms: ['Sectors & Industries', 'Risk Landscape'],
  },
  {
    id: 'risk-regulatory',
    tabId: 'risk',
    title: 'Regulatory risk',
    content:
      'Changes in law or enforcement that affect the business. IPO risk is not synonymous with growth potential.',
    relatedTerms: ['Risk Factors', 'SEC Review'],
  },
  {
    id: 'risk-capital-market',
    tabId: 'risk',
    title: 'Capital market risk',
    content:
      'Access to capital, cost of capital, and market conditions. IPO risk is not synonymous with growth potential.',
    relatedTerms: ['Liquidity risk', 'Behavioral Prudence'],
  },
  {
    id: 'risk-liquidity',
    tabId: 'risk',
    title: 'Liquidity risk',
    content:
      'Trading volume and bid-ask spread; ability to exit without moving price. IPO risk is not synonymous with growth potential.',
    relatedTerms: ['Trading begins', 'Lock-Up Period'],
  },
  {
    id: 'risk-lockup',
    tabId: 'risk',
    title: 'Lock-up expiration risk',
    content:
      'Supply increases when insiders can sell; price can be pressured. IPO risk is not synonymous with growth potential.',
    relatedTerms: ['Lock-Up Period', 'IPO Lifecycle'],
  },
  {
    id: 'risk-dilution',
    tabId: 'risk',
    title: 'Dilution risk',
    content:
      'Future issuance (options, follow-ons) can dilute existing shareholders. IPO risk is not synonymous with growth potential.',
    relatedTerms: ['Dilution', 'Fully Diluted Shares', 'Capitalization'],
  },

  // --- BEHAVIORAL PRUDENCE ---
  {
    id: 'behavior-first-day',
    tabId: 'behavioral',
    title: 'First-Day Pop vs Long-Term Return',
    content:
      'Short-term price movement is not long-term performance. IPO investing is not a race. This section sets culture: calm and rational.',
    relatedTerms: ['Time Horizon', 'Behavioral Prudence'],
  },
  {
    id: 'behavior-overconfidence',
    tabId: 'behavioral',
    title: 'Overconfidence in Narrative',
    content:
      'Narrative can be compelling; execution and numbers matter more over time. IPO investing is not a race. Tone: calm and rational.',
    relatedTerms: ['Prospectus Anatomy', 'Risk Factors'],
  },
  {
    id: 'behavior-recency',
    tabId: 'behavioral',
    title: 'Recency Bias',
    content:
      'Recent performance can overshadow long-term structure and risk. IPO investing is not a race. Tone: calm and rational.',
    relatedTerms: ['Behavioral Prudence', 'Time Horizon'],
  },
  {
    id: 'behavior-hot-market',
    tabId: 'behavioral',
    title: 'Hot Market Issuance',
    content:
      'Volume of IPOs and valuations can spike in speculative periods. Discipline in position sizing and selection matters. IPO investing is not a race. This differentiates from trading platforms.',
    relatedTerms: ['Red Flags', 'Position Sizing'],
  },
  {
    id: 'behavior-position-sizing',
    tabId: 'behavioral',
    title: 'Position Sizing',
    content:
      'Avoid overexposure to a single new listing. Concentration risk is real. IPO investing is not a race. Tone: calm and rational.',
    relatedTerms: ['Diversification', 'Risk Landscape'],
  },
  {
    id: 'behavior-time-horizon',
    tabId: 'behavioral',
    title: 'Time Horizon Discipline',
    content:
      'Realized returns often take years, not days. IPO investing is not a race. Tone: calm and rational.',
    relatedTerms: ['First-Day Pop', 'Lock-Up Period'],
  },
  {
    id: 'behavior-diversification',
    tabId: 'behavioral',
    title: 'Diversification',
    content:
      'Do not concentrate in a single IPO or sector. IPO investing is not a race. This differentiates your app from trading platforms.',
    relatedTerms: ['Position Sizing', 'Risk Landscape'],
  },

  // --- RED FLAGS ---
  {
    id: 'red-insider-selling',
    tabId: 'red-flags',
    title: 'Large insider selling in offering',
    content:
      'When a large portion of the offering is secondary (insiders selling), it can signal reduced alignment. We explain why it matters; we avoid scare tactics.',
    relatedTerms: ['Use of Proceeds', 'Principal Stockholders', 'Form 4'],
  },
  {
    id: 'red-proceeds-repay-insiders',
    tabId: 'red-flags',
    title: 'Heavy use of proceeds to repay insiders',
    content:
      'Proceeds used to repay insiders rather than fund growth warrant closer scrutiny. We explain why it matters; we avoid scare tactics.',
    relatedTerms: ['Use of Proceeds', 'Red Flags'],
  },
  {
    id: 'red-declining-margins',
    tabId: 'red-flags',
    title: 'Declining margins despite rising revenue',
    content:
      'Revenue growth with declining gross margin can indicate competition or mix shift. We explain why it matters; we avoid scare tactics.',
    relatedTerms: ['Gross Margins', 'Revenue Quality', 'What to Look For'],
  },
  {
    id: 'red-customer-concentration',
    tabId: 'red-flags',
    title: 'High customer concentration',
    content:
      'One or few customers representing a large share of revenue increases risk. We explain why it matters; we avoid scare tactics.',
    relatedTerms: ['Customer Concentration', 'Risk Factors'],
  },
  {
    id: 'red-related-party',
    tabId: 'red-flags',
    title: 'Excessive related-party transactions',
    content:
      'Transactions with insiders or related entities can create conflicts. We explain why it matters; we avoid scare tactics.',
    relatedTerms: ['Principal Stockholders', 'Use of Proceeds'],
  },
  {
    id: 'red-non-gaap',
    tabId: 'red-flags',
    title: 'Aggressive non-GAAP adjustments',
    content:
      'Heavy non-GAAP adjustments can obscure true profitability. Understand what is being adjusted and why. We explain why it matters; we avoid scare tactics.',
    relatedTerms: ['Financial Statements', 'Metrics & Valuation'],
  },
  {
    id: 'red-speculative-cycle',
    tabId: 'red-flags',
    title: 'Going public during peak speculative cycles',
    content:
      'Issuance during speculative peaks can reflect market timing rather than company readiness. We explain why it matters; we avoid scare tactics.',
    relatedTerms: ['Hot Market Issuance', 'Behavioral Prudence'],
  },

  // --- METRICS & VALUATION ---
  {
    id: 'metrics-mcap',
    tabId: 'metrics',
    title: 'Market Capitalization',
    content:
      'Share price × shares outstanding. The value the market places on the company’s equity. Formula: Price × Shares outstanding.',
    relatedTerms: ['Enterprise Value', 'Fully Diluted Shares'],
  },
  {
    id: 'metrics-ev',
    tabId: 'metrics',
    title: 'Enterprise Value',
    content:
      'Market cap + debt - cash. Represents the value of the entire business. Formula: EV = Market cap + Net debt.',
    relatedTerms: ['Market Capitalization', 'Price-to-Sales'],
  },
  {
    id: 'metrics-ps',
    tabId: 'metrics',
    title: 'Price-to-Sales',
    content:
      'Market cap divided by revenue. Often used for unprofitable companies. Understand whether revenue is recurring and what growth is assumed.',
    relatedTerms: ['Revenue Quality', 'Market Capitalization'],
  },
  {
    id: 'metrics-gross-margin',
    tabId: 'metrics',
    title: 'Gross Margin',
    content:
      'Revenue minus cost of goods sold, as a percentage of revenue. Indicates pricing power and unit economics. Formula: (Revenue - COGS) / Revenue.',
    relatedTerms: ['What to Look For', 'Operating Leverage'],
  },
  {
    id: 'metrics-burn-rate',
    tabId: 'metrics',
    title: 'Burn Rate',
    content:
      'Rate at which the company consumes cash (e.g. monthly or quarterly). Often used for unprofitable companies. Explain simply.',
    relatedTerms: ['Cash Runway', 'Use of Proceeds'],
  },
  {
    id: 'metrics-runway',
    tabId: 'metrics',
    title: 'Runway',
    content:
      'How long current cash will last at the current burn rate. Runway = Cash / Burn rate (in same time unit).',
    relatedTerms: ['Burn Rate', 'Cash Runway'],
  },
  {
    id: 'metrics-fully-diluted',
    tabId: 'metrics',
    title: 'Fully Diluted Shares',
    content:
      'Share count including options, warrants, and convertible securities. Use for per-share metrics and dilution analysis.',
    relatedTerms: ['Dilution', 'Capitalization', 'Option Overhang'],
  },
  {
    id: 'metrics-lockup-impact',
    tabId: 'metrics',
    title: 'Lock-up Expiry Impact',
    content:
      'Shares that become eligible to sell at lock-up expiration. Can affect supply and price. Explain simply.',
    relatedTerms: ['Lock-Up Period', 'Risk Landscape'],
  },

  // --- ADVANCED CONCEPTS ---
  {
    id: 'advanced-underpricing',
    tabId: 'advanced',
    title: 'Underpricing',
    content:
      'IPO offer price set below the price at which the stock trades initially. Can reflect information asymmetry or deliberate allocation strategy. This section builds authority.',
    relatedTerms: ['Pricing', 'First-Day Pop', 'BHAR'],
  },
  {
    id: 'advanced-bhar',
    tabId: 'advanced',
    title: 'BHAR (Buy-and-Hold Abnormal Return)',
    content:
      'Long-term return from holding an IPO relative to a benchmark. Used in academic research to measure IPO performance. This section builds authority.',
    relatedTerms: ['Underpricing', 'Time Horizon', 'Advanced Concepts'],
  },
  {
    id: 'advanced-cohort',
    tabId: 'advanced',
    title: 'Cohort Analysis',
    content:
      'Tracking a group of customers or users over time (e.g. retention, revenue by cohort). Common in SaaS and subscription businesses. This section builds authority.',
    relatedTerms: ['Revenue Quality', 'Business'],
  },
  {
    id: 'advanced-survivorship',
    tabId: 'advanced',
    title: 'Survivorship Bias',
    content:
      'Focusing on companies that survived or succeeded while ignoring those that failed. Can skew perception of IPO returns. This section builds authority.',
    relatedTerms: ['BHAR', 'Behavioral Prudence'],
  },
  {
    id: 'advanced-capital-structure',
    tabId: 'advanced',
    title: 'Capital Structure Complexity',
    content:
      'Preferred shares, convertibles, multiple classes, and options. Affects dilution and governance. This section builds authority.',
    relatedTerms: ['Dilution', 'Dual-Class Governance', 'Fully Diluted Shares'],
  },
  {
    id: 'advanced-dual-class',
    tabId: 'advanced',
    title: 'Dual-Class Governance',
    content:
      'Share classes with different voting rights. Founders or insiders may retain control with a minority of economic interest. This section builds authority.',
    relatedTerms: ['Share Structure', 'Principal Stockholders', 'Capital Structure'],
  },
  {
    id: 'advanced-option-overhang',
    tabId: 'advanced',
    title: 'Option Overhang',
    content:
      'Outstanding options and warrants that could dilute existing shareholders when exercised. Affects fully diluted share count. This section builds authority.',
    relatedTerms: ['Fully Diluted Shares', 'Dilution', 'Capitalization'],
  },
];

export function getEntriesByTab(tabId: GlossaryTabId): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter((e) => e.tabId === tabId);
}

export function searchEntries(query: string): GlossaryEntry[] {
  if (!query.trim()) return GLOSSARY_ENTRIES;
  const q = query.trim().toLowerCase();
  return GLOSSARY_ENTRIES.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.relatedTerms?.some((t) => t.toLowerCase().includes(q))
  );
}
