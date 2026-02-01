/**
 * Prospectus Briefing Analyzer
 *
 * Extracts linguistic patterns from SEC prospectus HTML to produce a verifiable briefing.
 * Every insight is anchored to verbatim quotations. No external facts or inferred intent.
 * Trust signal: selection, not synthesis.
 */

export interface BriefingSection {
  heading: string;
  excerpts: Array<{
    quote: string;
    observation: string;
    context?: string;
  }>;
}

export interface BriefingMetrics {
  conditionalPhrases: { phrase: string; count: number }[];
  conditionalTotal: number;
  definitiveTotal: number;
  conditionalRatio: number;
  sectionWordCounts: { name: string; words: number; note?: string }[];
  minimallyAddressed: string[];
}

export interface ProspectusBriefing {
  companyName: string;
  cik: string;
  accessionNumber: string;
  filingDate: string;
  formType: string;
  generatedAt: string;
  sections: BriefingSection[];
  metrics: BriefingMetrics;
}

const CONDITIONAL_PATTERNS = /\b(we\s+)?(may|might|could|would|should|intend|expect|believe|anticipate|seek|plan|aim)\b/gi;
const DEFINITIVE_PATTERNS = /\b(we\s+)?(have|has|had|do|does|did|generate|generated|operate|operates|provide|provides)\b/gi;

const KNOWN_SECTIONS = [
  'Risk Factors',
  'Use of Proceeds',
  'Business',
  'Management',
  'Financial',
  'Capitalization',
  'Dilution',
  'Description of Securities',
  'Underwriting',
  'Legal Matters',
  'Experts',
  'Where You Can Find',
  'Prospectus Summary',
  'Our Business',
  'Selected Financial',
  'Offering',
];

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body?.innerText ?? '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractSections(text: string): Array<{ name: string; content: string }> {
  const sections: Array<{ name: string; content: string }> = [];
  const lines = text.split(/\n+/);
  let currentSection = 'Preamble';
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isHeader = KNOWN_SECTIONS.some(
      (s) => trimmed.toUpperCase().includes(s.toUpperCase()) && trimmed.length < 120
    );
    if (isHeader && trimmed.length < 80) {
      if (currentContent.length > 0) {
        sections.push({ name: currentSection, content: currentContent.join(' ').trim() });
      }
      currentSection = trimmed;
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }
  if (currentContent.length > 0) {
    sections.push({ name: currentSection, content: currentContent.join(' ').trim() });
  }
  return sections.filter((s) => s.content.length > 50);
}

function countPhrases(text: string, regex: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  let m: RegExpExecArray | null;
  const r = new RegExp(regex.source, regex.flags);
  while ((m = r.exec(text)) !== null) {
    const phrase = (m[2] || m[0]).toLowerCase();
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return counts;
}

function extractExcerpt(text: string, maxLen: number = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const idx = clean.lastIndexOf('.', maxLen);
  return (idx > maxLen / 2 ? clean.slice(0, idx + 1) : clean.slice(0, maxLen) + '…').trim();
}

export function analyzeProspectus(
  html: string,
  meta: { companyName: string; cik: string; accessionNumber: string; filingDate: string; formType: string }
): ProspectusBriefing {
  const text = stripHtml(html);
  const sections = extractSections(text);

  const conditionalCounts = countPhrases(text, CONDITIONAL_PATTERNS);
  const conditionalTotal = [...conditionalCounts.values()].reduce((a, b) => a + b, 0);
  const definitiveMatches = text.match(DEFINITIVE_PATTERNS) ?? [];
  const definitiveTotal = definitiveMatches.length;

  const sectionWordCounts = sections.map((s) => {
    const words = s.content.split(/\s+/).length;
    const totalWords = text.split(/\s+/).length;
    const pct = totalWords > 0 ? (words / totalWords) * 100 : 0;
    let note: string | undefined;
    if (['Risk Factors', 'Business'].includes(s.name) && pct < 5) note = 'Unusually brief';
    else if (['Risk Factors'].includes(s.name) && pct > 30) note = 'Extensive';
    return { name: s.name, words, note };
  });

  const sectionsWithContent = sections.filter((s) => s.content.length > 100);
  const minimallyAddressed = KNOWN_SECTIONS.filter(
    (known) => !sectionsWithContent.some((s) => s.name.toUpperCase().includes(known.toUpperCase()))
  );

  const briefingSections: BriefingSection[] = [];

  for (const sec of sectionsWithContent.slice(0, 8)) {
    const excerpts: BriefingSection['excerpts'] = [];
    const firstExcerpt = extractExcerpt(sec.content, 250);
    if (firstExcerpt) {
      excerpts.push({
        quote: firstExcerpt,
        observation:
          sec.name === 'Risk Factors'
            ? 'Verbatim from Risk Factors. Length and structure are mechanically reported below.'
            : sec.name === 'Use of Proceeds'
              ? 'Verbatim from Use of Proceeds. No inference beyond the text.'
              : `Verbatim excerpt from ${sec.name}.`,
      });
    }
    if (excerpts.length > 0) {
      briefingSections.push({ heading: sec.name, excerpts });
    }
  }

  const conditionalPhrases = [...conditionalCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([phrase, count]) => ({ phrase, count }));

  return {
    ...meta,
    generatedAt: new Date().toISOString(),
    sections: briefingSections,
    metrics: {
      conditionalPhrases,
      conditionalTotal,
      definitiveTotal,
      conditionalRatio: definitiveTotal > 0 ? conditionalTotal / definitiveTotal : 0,
      sectionWordCounts,
      minimallyAddressed,
    },
  };
}
