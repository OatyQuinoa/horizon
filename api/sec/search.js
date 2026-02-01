/**
 * Vercel serverless: proxy SEC full-text search for S-1/S-1A filings.
 * GET /api/sec/search?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */
const SEC_USER_AGENT = 'AIIS-InvestmentResearch/1.0 (contact@aiis-research.com)';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const dateFrom = req.query.dateFrom ?? '';
  const dateTo = req.query.dateTo ?? '';
  const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent('forms:(S-1 OR "S-1/A")')}&dateRange=custom&startdt=${dateFrom}&enddt=${dateTo}&from=0&size=100`;
  try {
    const secRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': SEC_USER_AGENT,
        Accept: 'application/json',
      },
    });
    const body = await secRes.text();
    res.status(secRes.status).setHeader(
      'Content-Type',
      secRes.headers.get('Content-Type') || 'application/json'
    );
    res.end(body);
  } catch (err) {
    console.error('SEC search proxy error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(502).end(JSON.stringify({ error: 'Proxy error', detail: String(err) }));
  }
}
