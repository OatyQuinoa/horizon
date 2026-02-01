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
      const prospectusUrl = res.headers.get('X-Prospectus-Url') ?? '';
      const { analyzeProspectus } = await import('@/lib/prospectus-briefing');
      const b = analyzeProspectus(html, {
        companyName,
        cik,
        accessionNumber,
        filingDate,
        formType,
        prospectusUrl,
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
    a.download = `Prospectus-Brief-${companyName.replace(/\s+/g, '-')}-${briefing.accessionNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Prospectus Brief
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
        Single-page summary with verbatim citations. Link to source, key excerpts, and supporting language metrics.
      </p>
      {briefing && (
        <div className="border border-border rounded-lg p-5 bg-card/30 space-y-4 text-sm">
          {briefing.prospectusUrl && (
            <a
              href={briefing.prospectusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline text-xs font-medium"
            >
              View prospectus on SEC.gov ↗
            </a>
          )}
          <p className="text-muted-foreground text-xs leading-relaxed">{briefing.overview}</p>
          {briefing.summary && (
            <div>
              <h4 className="font-medium text-foreground mb-1 text-sm">Prospectus Summary</h4>
              <p className="text-muted-foreground text-xs leading-relaxed italic">&quot;{briefing.summary}&quot;</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Language (supporting):</span>{' '}
              Ratio {briefing.metrics.conditionalRatio.toFixed(2)}
            </div>
            <div>
              <span className="text-muted-foreground">Hedging phrases:</span>{' '}
              {briefing.metrics.conditionalTotal}
            </div>
          </div>
          {briefing.sections.slice(0, 4).map((sec, i) => (
            <div key={i}>
              <h4 className="font-medium text-foreground mb-1">{sec.heading}</h4>
              {sec.excerpts.slice(0, 1).map((ex, j) => (
                <div key={j}>
                  <blockquote className="pl-3 border-l-2 border-muted text-muted-foreground italic">
                    &quot;{ex.quote}&quot;
                  </blockquote>
                  <p className="text-xs text-muted-foreground mt-1">{ex.observation}</p>
                </div>
              ))}
            </div>
          ))}
          {briefing.metrics.notablyUnderdeveloped.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-1">Notably Underdeveloped</h4>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {briefing.metrics.notablyUnderdeveloped.map((u, i) => (
                  <li key={i}>
                    <span className="font-medium">{u.section}</span>: {u.note}
                  </li>
                ))}
              </ul>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderBriefingHtml(b: ProspectusBriefing): string {
  const prospectusLinkHtml = b.prospectusUrl
    ? `<p class="meta"><a href="${escapeHtml(b.prospectusUrl)}" target="_blank" rel="noopener">View prospectus on SEC.gov</a></p>`
    : '';

  const sectionsHtml = b.sections
    .map(
      (sec) =>
        `<section>
  <h3>${escapeHtml(sec.heading)}</h3>
  ${sec.excerpts
    .map(
      (ex) =>
        `<blockquote>"${escapeHtml(ex.quote)}"</blockquote>
  <p class="observation">${escapeHtml(ex.observation)}</p>`
    )
    .join('\n  ')}
</section>`
    )
    .join('\n');

  const underdevelopedHtml =
    b.metrics.notablyUnderdeveloped.length > 0
      ? `
  <h3>Notably Underdeveloped</h3>
  <ul>
    ${b.metrics.notablyUnderdeveloped.map((u) => `<li><strong>${escapeHtml(u.section)}</strong>: ${escapeHtml(u.note)}</li>`).join('\n    ')}
  </ul>`
      : '';

  const languageHtml = `
  <h3>Language & structure (supporting)</h3>
  <ul>
    <li>Conditional phrases (may, intend, expect): ${b.metrics.conditionalTotal}</li>
    <li>Definitive phrases (have, do, generate): ${b.metrics.definitiveTotal}</li>
    <li>Ratio: ${b.metrics.conditionalRatio.toFixed(2)}</li>
  </ul>
  <h3>Section length (words)</h3>
  <ul>
    ${b.metrics.sectionWordCounts.map((s) => `<li>${escapeHtml(s.name)}: ${s.words}${s.note ? ` — ${escapeHtml(s.note)}` : ''}</li>`).join('\n    ')}
  </ul>
  ${underdevelopedHtml}
`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Prospectus Brief — ${escapeHtml(b.companyName)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-top: 2rem; margin-bottom: 0.5rem; }
    h3 { font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    .overview { color: #444; font-size: 0.95rem; margin: 1rem 0; }
    .meta { font-size: 0.8rem; color: #666; margin-bottom: 0.5rem; }
    .meta a { color: #0066cc; }
    blockquote { margin: 0.5rem 0; padding-left: 1rem; border-left: 3px solid #ccc; color: #444; font-style: italic; }
    .observation { font-size: 0.9rem; color: #555; margin-top: 0.25rem; }
    ul { margin: 0.5rem 0; padding-left: 1.5rem; }
    .disclaimer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.75rem; color: #888; }
  </style>
</head>
<body>
  <h1>Prospectus Brief</h1>
  <p class="meta">${escapeHtml(b.companyName)} · CIK ${b.cik} · ${b.formType} · Accession ${b.accessionNumber} · Filed ${formatFilingDate(b.filingDate)}</p>
  ${prospectusLinkHtml}
  <p class="meta">Generated ${new Date(b.generatedAt).toLocaleString()} · All excerpts verbatim from the filing.</p>

  <p class="overview">${escapeHtml(b.overview)}</p>
  ${b.summary ? `
  <h2>Prospectus Summary</h2>
  <blockquote>${escapeHtml(b.summary)}</blockquote>
  ` : ''}
  <h2>Key excerpts</h2>
  <p style="font-size:0.9rem;color:#666;">Verbatim citations with concise observations. Source text visible as evidence.</p>
  ${sectionsHtml}

  <h2>Supporting metrics</h2>
  ${languageHtml}

  <p class="disclaimer">This document introduces no analysis beyond the filing itself. All quoted material is extracted verbatim from the Prospectus. No external facts or inferred intent have been added.</p>
</body>
</html>`;
}
