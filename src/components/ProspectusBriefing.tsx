/**
 * Prospectus Briefing — Verifiable extraction from SEC filings.
 * Every insight anchored to verbatim quotations. No external facts or inferred intent.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { ProspectusBriefing } from '@/lib/prospectus-briefing';
import { formatFilingDate } from '@/lib/sec-filing-service';

interface ProspectusBriefingProps {
  companyName: string;
  cik: string;
  accessionNumber: string;
  filingDate: string;
  formType?: string;
  onError?: (msg: string) => void;
}

export default function ProspectusBriefingCard({
  companyName,
  cik,
  accessionNumber,
  filingDate,
  formType = '424B4',
  onError,
}: ProspectusBriefingProps) {
  const [briefing, setBriefing] = useState<ProspectusBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateBriefing = async () => {
    if (!accessionNumber || !cik) {
      onError?.('Missing accession number or CIK');
      return;
    }
    setIsLoading(true);
    setBriefing(null);
    try {
      const res = await fetch(
        `/api/sec/prospectus?cik=${encodeURIComponent(cik)}&accession=${encodeURIComponent(accessionNumber)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Fetch failed: ${res.status}`);
      }
      const html = await res.text();
      const { analyzeProspectus } = await import('@/lib/prospectus-briefing');
      const b = analyzeProspectus(html, {
        companyName,
        cik,
        accessionNumber,
        filingDate,
        formType,
      });
      setBriefing(b);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to generate briefing');
      setBriefing(null);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBriefing = () => {
    if (!briefing) return;
    const html = renderBriefingHtml(briefing);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prospectus-Briefing-${companyName.replace(/\s+/g, '-')}-${briefing.accessionNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Prospectus Briefing
        </h3>
        {!briefing ? (
          <Button onClick={generateBriefing} disabled={isLoading} size="sm">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating…
              </>
            ) : (
              'Generate Briefing'
            )}
          </Button>
        ) : (
          <Button onClick={downloadBriefing} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Briefing
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Extracts linguistic patterns from the prospectus. Every insight is anchored to verbatim quotations from the filing.
      </p>
      {briefing && (
        <div className="border border-border rounded-lg p-5 bg-card/30 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Conditional / Definitive ratio:</span>{' '}
              {briefing.metrics.conditionalRatio.toFixed(2)}
            </div>
            <div>
              <span className="text-muted-foreground">Conditional phrases:</span>{' '}
              {briefing.metrics.conditionalTotal} (e.g. “may”, “expect”)
            </div>
          </div>
          {briefing.sections.slice(0, 3).map((sec, i) => (
            <div key={i}>
              <h4 className="font-medium text-foreground mb-1">{sec.heading}</h4>
              {sec.excerpts.slice(0, 1).map((ex, j) => (
                <blockquote key={j} className="pl-3 border-l-2 border-muted text-muted-foreground italic">
                  "{ex.quote}"
                </blockquote>
              ))}
            </div>
          ))}
          {briefing.metrics.minimallyAddressed.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-1">Minimally addressed</h4>
              <p className="text-muted-foreground text-xs">
                {briefing.metrics.minimallyAddressed.join(', ')}
              </p>
            </div>
          )}
          <Button onClick={downloadBriefing} size="sm" variant="ghost" className="mt-2">
            <Download className="w-3 h-3 mr-1" />
            Download full briefing (HTML)
          </Button>
        </div>
      )}
    </div>
  );
}

function renderBriefingHtml(b: ProspectusBriefing): string {
  const sectionsHtml = b.sections
    .map(
      (sec) =>
        `<section>
  <h3>${sec.heading}</h3>
  ${sec.excerpts
    .map(
      (ex) =>
        `<blockquote>"${ex.quote.replace(/"/g, '&quot;')}"</blockquote>
  <p class="observation">${ex.observation}</p>`
    )
    .join('\n  ')}
</section>`
    )
    .join('\n');

  const metricsHtml = `
  <h3>Linguistic metrics</h3>
  <ul>
    <li>Conditional phrases (may, intend, expect): ${b.metrics.conditionalTotal}</li>
    <li>Definitive phrases (have, do, generate): ${b.metrics.definitiveTotal}</li>
    <li>Ratio: ${b.metrics.conditionalRatio.toFixed(2)}</li>
  </ul>
  <h3>Section length (words)</h3>
  <ul>
    ${b.metrics.sectionWordCounts.map((s) => `<li>${s.name}: ${s.words}${s.note ? ` — ${s.note}` : ''}</li>`).join('\n    ')}
  </ul>
  ${b.metrics.minimallyAddressed.length > 0 ? `<p><strong>Minimally addressed or absent:</strong> ${b.metrics.minimallyAddressed.join(', ')}</p>` : ''}
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Prospectus Briefing — ${b.companyName}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-top: 2rem; margin-bottom: 0.5rem; }
    h3 { font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    blockquote { margin: 0.5rem 0; padding-left: 1rem; border-left: 3px solid #ccc; color: #444; font-style: italic; }
    .observation { font-size: 0.9rem; color: #555; margin-top: 0.25rem; }
    ul { margin: 0.5rem 0; padding-left: 1.5rem; }
    .meta { font-size: 0.8rem; color: #666; margin-bottom: 2rem; }
    .disclaimer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.75rem; color: #888; }
  </style>
</head>
<body>
  <h1>Prospectus Briefing</h1>
  <p class="meta">${b.companyName} · CIK ${b.cik} · ${b.formType} · Accession ${b.accessionNumber} · Filed ${formatFilingDate(b.filingDate)}</p>
  <p class="meta">Generated ${new Date(b.generatedAt).toLocaleString()} · All excerpts verbatim from the filing.</p>

  <h2>Excerpts by section</h2>
  ${sectionsHtml}

  <h2>Metrics</h2>
  ${metricsHtml}

  <p class="disclaimer">This document introduces no analysis beyond the filing itself. All quoted material is extracted verbatim. No external facts or inferred intent have been added.</p>
</body>
</html>`;
}
