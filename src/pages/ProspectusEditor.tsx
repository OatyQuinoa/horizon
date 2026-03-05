/**
 * Prospectus Editor: load SEC full filing .txt, render HTML cleanly, support highlights and comments.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Highlighter, MessageSquare } from 'lucide-react';
import {
  fetchFullFilingText,
  fetchCompanyById,
  parseFullFilingDocuments,
  extractMainProspectusHtml,
} from '@/lib/sec-filing-service';
import { useCompaniesOptional } from '@/context/CompaniesContext';
import { Company } from '@/types';
import { mockCompanies } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type EditorStatus = 'idle' | 'loading' | 'error' | 'ready';

interface Highlight {
  id: string;
  color: string;
}

interface Comment {
  highlightId: string;
  text: string;
}

/** Strip script and event handlers from HTML for safe display */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s on\w+\s*=\s*[^\s>]*/gi, '');
}

export default function ProspectusEditor() {
  const { id } = useParams<{ id: string }>();
  const ctx = useCompaniesOptional();
  const fromContext = ctx?.secFilings?.find((c) => c.id === id);
  const fromMock = mockCompanies.find((c) => c.id === id);
  const [company, setCompany] = useState<Company | null>(fromContext ?? fromMock ?? null);
  const [status, setStatus] = useState<EditorStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [html, setHtml] = useState<string>('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentFor, setShowCommentFor] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !/^\d{10}-[\d-]+$/.test(id)) return;
    if (fromContext || fromMock) {
      setCompany(fromContext ?? fromMock ?? null);
      return;
    }
    fetchCompanyById(id).then((sec) => {
      if (sec) setCompany(sec as unknown as Company);
    });
  }, [id, fromContext, fromMock]);

  useEffect(() => {
    if (!company) return;
    if (!company.cik || !company.accessionNumber) {
      setStatus('error');
      setErrorMessage('This company has no SEC accession number. Prospectus editor is not available.');
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    fetchFullFilingText(company.cik, company.accessionNumber)
      .then((raw) => {
        if (!raw || raw.length === 0) {
          setStatus('error');
          setErrorMessage('Filing not found. The SEC may not have this document, or the accession number may be invalid.');
          return;
        }
        try {
          const docs = parseFullFilingDocuments(raw);
          const mainHtml = extractMainProspectusHtml(docs);
          if (!mainHtml) {
            setStatus('error');
            setErrorMessage('No HTML prospectus document found in this filing. The file may be in an unexpected format.');
            return;
          }
          setHtml(sanitizeHtml(mainHtml));
          setStatus('ready');
        } catch {
          setStatus('error');
          setErrorMessage('Invalid or corrupted filing content. The document could not be parsed.');
        }
      })
      .catch((e: Error) => {
        setStatus('error');
        const msg = e?.message;
        if (msg === 'RATE_LIMIT') setErrorMessage('SEC rate limit reached. Please wait a moment and try again.');
        else if (msg === 'NOT_FOUND') setErrorMessage('Filing not found. Please check the CIK and accession number.');
        else if (msg === 'NETWORK_ERROR') setErrorMessage('Network error. Could not load the filing. Please check your connection and try again.');
        else if (msg?.startsWith('HTTP_')) setErrorMessage('The server could not return the filing. Please try again later.');
        else setErrorMessage('Could not load the prospectus. Please try again.');
      });
  }, [company?.cik, company?.accessionNumber]);

  const addHighlight = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      toast.error('Please select some text first');
      return;
    }
    const range = sel.getRangeAt(0);
    const id = `hl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const color = '#fef08a';
    try {
      const span = document.createElement('span');
      span.className = 'prospectus-highlight';
      span.dataset.highlightId = id;
      span.style.backgroundColor = color;
      span.style.borderRadius = '2px';
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      setHighlights((h) => [...h, { id, color }]);
      setShowCommentFor(id);
      setCommentDraft('');
    } catch {
      toast.error('Could not add highlight');
    }
  }, []);

  const saveComment = useCallback(() => {
    if (!showCommentFor) return;
    setComments((c) => {
      const rest = c.filter((x) => x.highlightId !== showCommentFor);
      if (!commentDraft.trim()) return rest;
      return [...rest, { highlightId: showCommentFor, text: commentDraft.trim() }];
    });
    setShowCommentFor(null);
    setCommentDraft('');
    toast.success('Comment saved');
  }, [showCommentFor, commentDraft]);

  useEffect(() => {
    if (status !== 'ready' || !contentRef.current) return;
    contentRef.current.querySelectorAll('.prospectus-highlight[data-highlight-id]').forEach((el) => {
      const id = el.getAttribute('data-highlight-id');
      const comment = id ? comments.find((c) => c.highlightId === id)?.text : null;
      (el as HTMLElement).title = comment ? `Comment: ${comment}` : 'Click Highlight then add a comment';
    });
  }, [comments, status]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-[1000px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={id ? `/company/${id}` : '/'}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Prospectus Editor
              {company?.name && (
                <span className="text-muted-foreground font-normal truncate max-w-[200px] sm:max-w-[300px]">
                  — {company.name}
                </span>
              )}
            </span>
          </div>
          {status === 'ready' && (
            <div ref={toolbarRef} className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addHighlight}
                className="gap-1.5"
              >
                <Highlighter className="w-3.5 h-3.5" />
                Highlight
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-6">
        {status === 'idle' && !company && id && /^\d{10}-[\d-]+$/.test(id) && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading company…</p>
          </div>
        )}
        {status === 'idle' && company && !company.accessionNumber && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center space-y-4">
            <p className="text-foreground font-medium">Prospectus not available</p>
            <p className="text-sm text-muted-foreground">This company has no SEC accession number.</p>
            <Link to={`/company/${id}`}><Button variant="outline">Return to company</Button></Link>
          </div>
        )}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading prospectus…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center space-y-4">
            <p className="text-foreground font-medium">Could not load prospectus</p>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Link to={id ? `/company/${id}` : '/'}>
              <Button variant="outline">Return to company</Button>
            </Link>
          </div>
        )}

        {status === 'ready' && html && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Select text and click Highlight to annotate.</span>
              {comments.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div
              ref={contentRef}
              className="prospectus-content rounded-lg border border-border bg-card p-6 sm:p-8 text-foreground leading-relaxed"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              <div
                className="prospectus-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
            {showCommentFor && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
                <div className="rounded-lg border border-border bg-card p-4 shadow-lg space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Comment for this highlight</label>
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Add a note…"
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCommentFor(null); setCommentDraft(''); }}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={saveComment}>
                      Save comment
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .prospectus-content table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        .prospectus-content th, .prospectus-content td { border: 1px solid var(--border); padding: 0.5em 0.75em; text-align: left; }
        .prospectus-content th { background: var(--muted); font-weight: 600; }
        .prospectus-content p { margin-bottom: 0.75em; }
        .prospectus-content h1, .prospectus-content h2, .prospectus-content h3 { margin-top: 1.25em; margin-bottom: 0.5em; }
        .prospectus-content .prospectus-highlight { cursor: pointer; }
      `}</style>
    </div>
  );
}
