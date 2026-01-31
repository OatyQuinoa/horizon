/**
 * Production server: serves Vite build and proxies SEC EDGAR API.
 * Run after build: npm run build && node server/index.js
 * SEC requires User-Agent and rate limit; we use 150ms between requests.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const SEC_USER_AGENT = 'AIIS-InvestmentResearch/1.0 (contact@aiis-research.com)';
const MIN_REQUEST_INTERVAL_MS = 150;
const DIST = path.join(__dirname, '..', 'dist');

let lastRequestTime = 0;

function parseSecAtomFeed(xml) {
  const filings = [];
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

function rateLimitedFetch(url, init = {}) {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    const delay = elapsed < MIN_REQUEST_INTERVAL_MS ? MIN_REQUEST_INTERVAL_MS - elapsed : 0;
    const doFetch = () => {
      lastRequestTime = Date.now();
      fetch(url, {
        ...init,
        headers: {
          'User-Agent': SEC_USER_AGENT,
          Accept: 'application/json',
          ...(init.headers || {}),
        },
      })
        .then(resolve)
        .catch(reject);
    };
    if (delay > 0) setTimeout(doFetch, delay);
    else doFetch();
  });
}

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

function serveStatic(filePath, res) {
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url || '/', `http://localhost`);
  const pathname = parsed.pathname;

  if (req.method === 'GET' && pathname.startsWith('/api/sec/')) {
    try {
      if (pathname.startsWith('/api/sec/search')) {
        const dateFrom = parsed.searchParams.get('dateFrom') || '';
        const dateTo = parsed.searchParams.get('dateTo') || '';
        const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent('forms:(S-1 OR "S-1/A")')}&dateRange=custom&startdt=${dateFrom}&enddt=${dateTo}&from=0&size=100`;
        const secRes = await rateLimitedFetch(searchUrl);
        const body = await secRes.text();
        res.writeHead(secRes.status, { 'Content-Type': secRes.headers.get('Content-Type') || 'application/json' });
        res.end(body);
        return;
      }
      if (pathname.startsWith('/api/sec/recent-s1')) {
        const count = Math.min(Number(parsed.searchParams.get('count')) || 80, 80);
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
      const submissionsMatch = pathname.match(/^\/api\/sec\/submissions\/CIK(\d+)$/);
      if (submissionsMatch) {
        const cik = submissionsMatch[1].padStart(10, '0');
        const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
        const secRes = await rateLimitedFetch(submissionsUrl);
        const body = await secRes.text();
        res.writeHead(secRes.status, { 'Content-Type': secRes.headers.get('Content-Type') || 'application/json' });
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
    return;
  }

  let filePath = path.join(DIST, pathname === '/' ? 'index.html' : pathname);
  if (!pathname.includes('.')) filePath = path.join(DIST, 'index.html');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(DIST, 'index.html');
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveStatic(filePath, res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

const PORT = process.env.PORT || 4173;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('SEC proxy: /api/sec/search, /api/sec/recent-s1, /api/sec/submissions/CIK*');
});
