/**
 * Glossary: A layered knowledge system. Pocket field manual — not hype, not a compliance dump.
 * Searchable, calm, disciplined investor's companion.
 */

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import {
  GLOSSARY_TABS,
  searchEntries,
  readingMinutes,
  type GlossaryTabId,
  type GlossaryEntry,
} from '@/data/glossaryData';
import { Search, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const LIFECYCLE_STEPS = [
  'Private',
  'S-1 Filed',
  'SEC Review',
  'Amendments (S-1/A)',
  'Roadshow',
  'Pricing',
  '424B4 Filed',
  'Trading Begins',
  'Lock-Up Expiration',
  'First 10-Q',
  'First 10-K',
];

const FILING_TYPES_TABLE = [
  { form: 'S-1', purpose: 'Initial registration statement', timing: 'Before SEC review', care: 'Evolving disclosure; use 424B4 for final terms' },
  { form: 'S-1/A', purpose: 'Amendment to S-1', timing: 'During SEC review', care: 'Refines disclosure; 424B4 remains definitive' },
  { form: '424B4', purpose: 'Final prospectus', timing: 'After pricing', care: 'Definitive for dilution, use of proceeds, capital structure' },
  { form: '8-K', purpose: 'Material event', timing: 'Within days of event', care: 'Post-IPO developments appear here first' },
  { form: '10-Q', purpose: 'Quarterly report', timing: 'After each of Q1–Q3', care: 'Execution and guidance; test of IPO promises' },
  { form: '10-K', purpose: 'Annual report', timing: 'After fiscal year', care: 'Full audited disclosure; compare to IPO narrative' },
  { form: 'Form 4', purpose: 'Insider transactions', timing: 'Within days of trade', care: 'Insider buying/selling; alignment' },
  { form: 'DEF 14A', purpose: 'Proxy statement', timing: 'Before shareholder meetings', care: 'Governance, compensation, proposals' },
];

function EntryCard({
  entry,
  readingMins,
}: {
  entry: GlossaryEntry;
  readingMins: number;
}) {
  return (
    <AccordionItem value={entry.id} className="border-border">
      <AccordionTrigger className="py-3 text-left font-medium text-foreground hover:no-underline hover:text-foreground/90">
        {entry.title}
      </AccordionTrigger>
      <AccordionContent className="text-muted-foreground">
        <p className="leading-relaxed text-sm">{entry.content}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3 text-xs">
          <span className="text-muted-foreground/80">{readingMins} min read</span>
          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-muted-foreground/80">Related: {entry.relatedTerms.join(', ')}</span>
            </>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function Glossary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<GlossaryTabId>('overview');

  const searchResults = useMemo(() => searchEntries(searchQuery), [searchQuery]);
  const resultsByTab = useMemo(() => {
    const map = new Map<GlossaryTabId, GlossaryEntry[]>();
    for (const tab of GLOSSARY_TABS) {
      map.set(tab.id, searchResults.filter((e) => e.tabId === tab.id));
    }
    return map;
  }, [searchResults]);

  const hasSearch = searchQuery.trim().length > 0;
  const totalMatches = searchResults.length;

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BookOpen className="h-5 w-5" />
          <h1
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Glossary
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A disciplined investor’s companion. Understand the structure before evaluating the opportunity.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search glossary…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground"
            aria-label="Search glossary"
          />
        </div>
        {hasSearch && (
          <p className="text-xs text-muted-foreground">
            {totalMatches} {totalMatches === 1 ? 'entry' : 'entries'} match
          </p>
        )}
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as GlossaryTabId)}
        className="w-full"
      >
        <TabsList className="flex w-full flex-wrap justify-start gap-1 rounded-lg border border-border bg-muted/20 p-1.5 h-auto">
          {GLOSSARY_TABS.map((tab) => {
            const count = resultsByTab.get(tab.id)?.length ?? 0;
            const showTab = !hasSearch || count > 0;
            if (!showTab) return null;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                  !hasSearch && "sm:text-sm"
                )}
              >
                {tab.label}
                {hasSearch && count > 0 && (
                  <span className="ml-1.5 text-muted-foreground">({count})</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {GLOSSARY_TABS.map((tab) => {
          const entries = resultsByTab.get(tab.id) ?? [];
          const showContent = !hasSearch || entries.length > 0;
          if (!showContent) return null;

          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-6 focus-visible:outline-none">
              {/* Overview: short intro */}
              {tab.id === 'overview' && !hasSearch && (
                <div className="mb-6 rounded-lg border border-border bg-muted/10 p-4 text-sm text-muted-foreground leading-relaxed">
                  <p className="mb-2">
                    What is an IPO? Why do companies go public? Why does IPO investing carry unique risks and opportunities?
                  </p>
                  <p>
                    This glossary orients you to the lifecycle, filings, and metrics so you can interpret disclosure—not predict short-term price moves. Prospectus helps you interpret filings with a long-term lens. Keep it sober.
                  </p>
                </div>
              )}

              {/* IPO Lifecycle: horizontal timeline */}
              {tab.id === 'lifecycle' && !hasSearch && (
                <div className="mb-6 overflow-x-auto pb-2">
                  <div className="flex min-w-max gap-0">
                    {LIFECYCLE_STEPS.map((step, i) => (
                      <div key={step} className="flex items-center">
                        <div className="rounded border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground whitespace-nowrap">
                          {step}
                        </div>
                        {i < LIFECYCLE_STEPS.length - 1 && (
                          <div className="mx-0.5 h-px w-3 bg-border shrink-0" aria-hidden />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Private → S-1 Filed → SEC Review → Amendments (S-1/A) → Roadshow → Pricing → 424B4 Filed → Trading Begins → Lock-Up Expiration → First 10-Q → First 10-K
                  </p>
                </div>
              )}

              {/* Filing Types: table */}
              {tab.id === 'filing-types' && !hasSearch && (
                <div className="mb-6 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-3 py-2.5 font-medium text-foreground">Form</th>
                        <th className="px-3 py-2.5 font-medium text-foreground">Purpose</th>
                        <th className="px-3 py-2.5 font-medium text-foreground">Timing</th>
                        <th className="px-3 py-2.5 font-medium text-foreground">Why investors care</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FILING_TYPES_TABLE.map((row) => (
                        <tr key={row.form} className="border-b border-border/70 last:border-0">
                          <td className="px-3 py-2.5 font-medium text-foreground">{row.form}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{row.purpose}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{row.timing}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{row.care}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="border-t border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                    Prospectus primarily analyzes 424B4 filings because they contain final offering details.
                  </p>
                </div>
              )}

              {/* Accordion: entries for this tab */}
              {entries.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {entries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      readingMins={readingMinutes(entry.content)}
                    />
                  ))}
                </Accordion>
              ) : (
                !hasSearch && (
                  <p className="text-sm text-muted-foreground">
                    No entries in this section.
                  </p>
                )
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
        Understand the structure before evaluating the opportunity. Knowledge reduces impulse.
      </footer>
    </div>
  );
}
