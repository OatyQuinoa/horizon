/**
 * Vite plugin: SEC EDGAR proxy for development.
 * Handles /api/sec/search and /api/sec/submissions/CIK* to bypass CORS.
 * SEC requires User-Agent and rate limit (10 req/sec); we use 150ms between requests.
 */
import type { Plugin } from 'vite';

const SEC_USER_AGENT = 'AIIS-InvestmentResearch/1.0 (contact@aiis-research.com)';
const MIN_REQUEST_INTERVAL_MS = 150;

let lastRequestTime = 0;

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

          // /api/sec/search?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
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
