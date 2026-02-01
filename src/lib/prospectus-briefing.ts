/**
 * Prospectus Briefing Analyzer
 *
 * Distills the prospectus without distortion. Pairs verbatim excerpts with mechanically
 * derived observations—patterns, unusual emphasis, omissions. Every insight tethered
 * to actual text. No interpretation beyond the filing.
 */

export interface BriefingSection {
  heading: string;
  excerpts: Array<{
    quote: string;
    observation: string;
  }>;
}

export interface BriefingMetrics {
  conditionalPhrases: { phrase: string; count: number }[];
  conditionalTotal: number;
  definitiveTotal: number;
  conditionalRatio: number;
  sectionWordCounts: { name: string; words: number; note?: string }[];
  notablyUnderdeveloped: Array<{ section: string; note: string }>;
}

export interface ProspectusBriefing {
  companyName: string;
  cik: string;
  accessionNumber: string;
  filingDate: string;
  formType: string;
  generatedAt: string;
  summary: string;
  sections: BriefingSection[];
  metrics: BriefingMetrics;
}

const CONDITIONAL = /\b(we\s+)?(may|might|could|would|should|intend|expect|believe|anticipate|seek|plan|aim)\b/gi;
const DEFINITIVE = /\b(we\s+)?(have|has|had|do|does|did|generate|generated|operate|operates|provide|provides)\b/gi;

// Section patterns: (Item X. )?Section Name — order matters for matching
const SECTION_PATTERNS = [
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Prospectus\s+Summary)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Risk\s+Factors)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Use\s+of\s+Proceeds)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Our\s+Business|Business)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Management['’]?s\s+Discussion|Selected\s+Financial)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Capitalization|Dilution)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Description\s+of\s+Securities)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Underwriting)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Legal\s+Matters|Experts)\s*[\n:.]/gi,
  /(?:^|\n)\s*(?:Item\s+\d+[A-Z]?\.\s*)?(Where\s+You\s+Can\s+Find)\s*[\n:.]/gi,
  /(?:^|\n)\s*(Offering)\s*[\n:.]/gi,
  /(?:^|\n)\s*(RISK\s+FACTORS)\s*\n/g,
  /(?:^|\n)\s*(USE\s+OF\s+PROCEEDS)\s*\n/g,
];

const BOILERPLATE_PATTERNS = [
  /^\s*\d+\s+[a-f0-9-]+\.htm\s+/i,
  /^\s*PROSPECTUS\s+PROSPECTUS\s*/i,
  /^\s*Filed\s+Pursuant\s+to\s+Rule\s+424/i,
  /^\s*Registration\s+No\.\s+\d+/i,
  /^\s*\$\s*[\d,]+(?:\.\d+)?\s*(?:million|billion)?/i,
  /^\s*Table\s+of\s+Contents\s*$/i,
  /^\s*[ivxlcdm]+\s*\./i,
  /^\s*\(\d+\)\s*$/,
  /^\s*page\s+\d+/i,
];

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body?.innerText ?? '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripBoilerplate(text: string): string {
  const lines = text.split('\n');
  let started = false;
  let skipChars = 0;
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const isBoilerplate = BOILERPLATE_PATTERNS.some((p) => p.test(line));
    const isShortMetadata = line.length < 60 && /[\d-]{10}|\.htm|333-|Rule\s+424/i.test(line);
    if (isBoilerplate || (i < 5 && isShortMetadata)) {
      skipChars += lines[i].length + 1;
    } else if (line.length >= 80 && /[a-z]/.test(line) && !/^[\d\s$.,]+$/.test(line)) {
      started = true;
      break;
    }
  }
  if (!started) skipChars = 0;
  return text.slice(skipChars).trim();
}

function normalizeSectionName(name: string): string {
  const n = name.toUpperCase();
  if (n === 'RISK FACTORS') return 'Risk Factors';
  if (n === 'USE OF PROCEEDS') return 'Use of Proceeds';
  if (n.includes('BUSINESS')) return 'Our Business';
  return name.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
}

function extractSections(text: string): Array<{ name: string; content: string; start: number }> {
  const cleaned = stripBoilerplate(text);
  const sections: Array<{ name: string; content: string; start: number }> = [];

  type Match = { name: string; index: number };
  const matches: Match[] = [];

  const sectionNames = [
    'Prospectus Summary', 'Risk Factors', 'Use of Proceeds', 'Our Business',
    "Management's Discussion", 'Capitalization', 'Dilution', 'Description of Securities',
    'Underwriting', 'Legal Matters', 'Where You Can Find', 'Offering',
    'Risk Factors', 'Use of Proceeds',
  ];
  for (let i = 0; i < SECTION_PATTERNS.length; i++) {
    const r = new RegExp(SECTION_PATTERNS[i].source, SECTION_PATTERNS[i].flags);
    const displayName = sectionNames[i] ?? 'Section';
    let m: RegExpExecArray | null;
    while ((m = r.exec(cleaned)) !== null) {
      const matchedName = (m[1] ?? displayName).trim() || displayName;
      const name = normalizeSectionName(matchedName);
      const idx = m.index;
      const existing = matches.find((x) => Math.abs(x.index - idx) < 30);
      if (!existing) matches.push({ name, index: idx });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
    let content = cleaned.slice(start, end);
    const firstNewline = content.indexOf('\n');
    if (firstNewline > 0 && firstNewline < 120) content = content.slice(firstNewline).trim();
    if (content.length > 150) {
      sections.push({ name: matches[i].name, content, start });
    }
  }

  if (sections.length === 0 && cleaned.length > 500) {
    sections.push({
      name: 'Summary',
      content: cleaned.slice(0, 20000),
      start: 0,
    });
  }

  return sections;
}

function extractSubstantiveExcerpt(content: string, maxLen: number = 280): string {
  const paras = content.split(/\n\n+/);
  for (const p of paras) {
    const clean = p.replace(/\s+/g, ' ').trim();
    if (clean.length < 60) continue;
    if (BOILERPLATE_PATTERNS.some((pat) => pat.test(clean))) continue;
    if (clean.length <= maxLen) return clean;
    const idx = clean.indexOf('.', Math.min(maxLen, clean.length - 1));
    if (idx > maxLen / 2) return clean.slice(0, idx + 1).trim();
    return clean.slice(0, maxLen).trim() + '…';
  }
  const flat = content.replace(/\n+/g, ' ').trim();
  if (flat.length > 80) {
    const idx = flat.indexOf('.', 200);
    return idx > 100 ? flat.slice(0, idx + 1) : flat.slice(0, maxLen) + '…';
  }
  return '';
}

function countInText(text: string, regex: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  const r = new RegExp(regex.source, regex.flags);
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) {
    const phrase = (m[2] || m[0]).toLowerCase();
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return counts;
}

function deriveObservation(
  sectionName: string,
  content: string,
  excerpt: string,
  allSections: Array<{ name: string; content: string }>
): string {
  const words = content.split(/\s+/).length;
  const conditionalInSection = (content.match(CONDITIONAL) ?? []).length;
  const totalWords = allSections.reduce((a, s) => a + s.content.split(/\s+/).length, 0);
  const avgWords = allSections.length > 0 ? totalWords / allSections.length : 0;

  const observations: string[] = [];

  if (sectionName.toLowerCase().includes('risk')) {
    if (conditionalInSection > 50) observations.push('Heavy use of conditional phrasing (may, could, might) throughout.');
    else if (conditionalInSection > 20) observations.push('Moderate conditional phrasing.');
  }

  if (sectionName.toLowerCase().includes('use of proceeds')) {
    const hasPercentages = /\d+\s*%|percent|allocation/i.test(content);
    const hasSpecifics = /\$\s*[\d,]+|million|proceeds/i.test(content);
    if (!hasPercentages && excerpt.length > 100)
      observations.push('No specific allocation percentages quoted; unusually vague relative to typical disclosures.');
    else if (hasSpecifics) observations.push('Specific dollar amounts or allocation described in the filing.');
  }

  if (words < 200 && avgWords > 500) observations.push('Unusually brief relative to other sections.');
  if (words > 3000) observations.push('Extensive disclosure in this section.');

  return observations.length > 0
    ? observations.join(' ')
    : `Verbatim from the Prospectus. Length and structure mechanically reported below.`;
}

export function analyzeProspectus(
  html: string,
  meta: { companyName: string; cik: string; accessionNumber: string; filingDate: string; formType: string }
): ProspectusBriefing {
  const rawText = stripHtml(html);
  const text = stripBoilerplate(rawText);
  const sections = extractSections(rawText);

  const conditionalCounts = countInText(text, CONDITIONAL);
  const conditionalTotal = [...conditionalCounts.values()].reduce((a, b) => a + b, 0);
  const definitiveTotal = (text.match(DEFINITIVE) ?? []).length;
  const ratio = definitiveTotal > 0 ? conditionalTotal / definitiveTotal : 0;

  const sectionWordCounts = sections.map((s) => {
    const words = s.content.split(/\s+/).length;
    const totalWords = text.split(/\s+/).length;
    const pct = totalWords > 0 ? (words / totalWords) * 100 : 0;
    let note: string | undefined;
    if (['Risk Factors'].some((n) => s.name.includes(n)) && pct < 3) note = 'Unusually brief';
    else if (['Risk Factors'].some((n) => s.name.includes(n)) && pct > 25) note = 'Extensive';
    return { name: s.name, words, note };
  });

  const expectedSections = [
    'Risk Factors',
    'Use of Proceeds',
    'Business',
    'Capitalization',
    'Dilution',
    'Underwriting',
  ];
  const notablyUnderdeveloped: BriefingMetrics['notablyUnderdeveloped'] = [];
  for (const expected of expectedSections) {
    const found = sections.find((s) => s.name.toUpperCase().includes(expected.toUpperCase()));
    if (!found) {
      notablyUnderdeveloped.push({ section: expected, note: 'Not located as a distinct section in the filing.' });
    } else {
      const words = found.content.split(/\s+/).length;
      if (words < 150)
        notablyUnderdeveloped.push({
          section: expected,
          note: `Present but brief (${words} words).`,
        });
    }
  }

  const briefingSections: BriefingSection[] = [];
  for (const sec of sections.slice(0, 10)) {
    const excerpt = extractSubstantiveExcerpt(sec.content, 280);
    if (!excerpt) continue;
    const observation = deriveObservation(sec.name, sec.content, excerpt, sections);
    briefingSections.push({
      heading: sec.name,
      excerpts: [{ quote: excerpt, observation }],
    });
  }

  const summary = `This briefing extracts verbatim passages from the Prospectus filed by ${meta.companyName} (CIK ${meta.cik}, Accession ${meta.accessionNumber}). Conditional phrasing (may, expect, intend) appears ${conditionalTotal} times; definitive phrasing (have, do, generate) appears ${definitiveTotal} times—a ratio of ${ratio.toFixed(2)}. Each section below pairs a direct quote with mechanically derived observations.`;

  return {
    ...meta,
    generatedAt: new Date().toISOString(),
    summary,
    sections: briefingSections,
    metrics: {
      conditionalPhrases: [...conditionalCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([phrase, count]) => ({ phrase, count })),
      conditionalTotal,
      definitiveTotal,
      conditionalRatio: ratio,
      sectionWordCounts,
      notablyUnderdeveloped,
    },
  };
}
