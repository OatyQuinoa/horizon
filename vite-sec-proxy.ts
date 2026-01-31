/**
 * Vite plugin: SEC EDGAR proxy for development.
 * Handles /api/sec/search and /api/sec/submissions/CIK* to bypass CORS.
 * SEC requires User-Agent and rate limit (10 req/sec); we use 150ms between requests.
 */
import type { Plugin } from 'vite';

const SEC_USER_AGENT = 'AIIS-InvestmentResearch/1.0 (contact@aiis-research.com)';
const MIN_REQUEST_INTERVAL_MS = 150;

let lastRequestTime = 0;

/** Parse SEC browse-edgar Atom feed (S-1 recent filings) into JSON */
function parseSecAtomFeed(xml: string): { filings: Array<{ cik: string; companyName: string; filingDate: string; formType: string; accessionNumber: string }> } {
  const filings: Array<{ cik: string; companyName: string; filingDate: string; formType: string; accessionNumber: string }> = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const idMatch = block.match(/<id[^>]*>([\s\S]*?)<\/id>/i);
    const updatedMatch = block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const categoryMatch = block.match(/<category[^>]*label="([^"]+)"[^>]*\/?>/i);
    if (!titleMatch || !idMatch) continue;
    const title = (titleMatch[1] || '').replace(/<[^>]+>/g, '').trim();
    const id = (idMatch[1] || '').trim();
    const updated = (updatedMatch && updatedMatch[1]) ? updatedMatch[1].trim() : '';
    const formType = (categoryMatch && categoryMatch[1]) ? categoryMatch[1] : 'S-1';
    const accessionMatch = id.match(/accession-number=([\w-]+)/i);
    const accessionNumber = accessionMatch ? accessionMatch[1] : id.replace(/^.*,/, '');
    const titleCompanyMatch = title.match(/^(?:S-1\/?A?)\s*[-–]\s*(.+?)\s*\((\d+)\)\s*(?:\(Filer\))?$/i);
    const cik = titleCompanyMatch ? titleCompanyMatch[2].padStart(10, '0') : '';
    const companyName = titleCompanyMatch ? titleCompanyMatch[1].trim() : title.replace(/^(?:S-1\/?A?)\s*[-–]\s*/i, '').replace(/\s*\(\d+\)\s*(?:\(Filer\))?$/, '').trim();
    const filingDate = updated ? updated.slice(0, 10) : '';
    filings.push({ cik, companyName, filingDate, formType, accessionNumber });
  }
  return { filings };
}

async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    ...init,
    headers: {
      'User-Agent': SEC_USER_AGENT,
      Accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  });
}

export function secProxyPlugin(): Plugin {
  return {
    name: 'sec-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/sec/')) {
          next();
          return;
        }

        try {
          if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          // /api/sec/search?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD (full-text search; may return 0)
          const searchMatch = url.match(/^\/api\/sec\/search\?(.*)$/);
          if (searchMatch) {
            const params = new URLSearchParams(searchMatch[1]);
            const dateFrom = params.get('dateFrom') ?? '';
            const dateTo = params.get('dateTo') ?? '';
            const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent('forms:(S-1 OR "S-1/A")')}&dateRange=custom&startdt=${dateFrom}&enddt=${dateTo}&from=0&size=100`;
            const secRes = await rateLimitedFetch(searchUrl);
            const body = await secRes.text();
            res.writeHead(secRes.status, {
              'Content-Type': secRes.headers.get('Content-Type') ?? 'application/json',
            });
            res.end(body);
            return;
          }

          // /api/sec/recent-s1?count=80 — SEC browse-edgar Atom feed (reliable list of recent S-1/S-1/A)
          const recentS1Match = url.match(/^\/api\/sec\/recent-s1\?(.*)$/);
          if (recentS1Match) {
            const params = new URLSearchParams(recentS1Match[1]);
            const count = Math.min(Number(params.get('count')) || 80, 80);
            const atomUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=S-1&company=&dateb=&owner=exclude&start=0&count=${count}&output=atom`;
            const secRes = await rateLimitedFetch(atomUrl, {
              headers: { Accept: 'application/atom+xml, application/xml, text/xml' },
            });
            const xml = await secRes.text();
            const json = parseSecAtomFeed(xml);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(json));
            return;
          }

          // /api/sec/submissions/CIK0001318605 (or CIK1318605)
          const submissionsMatch = url.match(/^\/api\/sec\/submissions\/CIK(\d+)$/);
          if (submissionsMatch) {
            const cik = submissionsMatch[1].padStart(10, '0');
            const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
            const secRes = await rateLimitedFetch(submissionsUrl);
            const body = await secRes.text();
            res.writeHead(secRes.status, {
              'Content-Type': secRes.headers.get('Content-Type') ?? 'application/json',
            });
            res.end(body);
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        } catch (err) {
          console.error('SEC proxy error:', err);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error', detail: String(err) }));
        }
      });
    },
  };
}
