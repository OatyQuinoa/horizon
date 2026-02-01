/**
 * Vercel serverless: proxy SEC full-text search for IPO-related filings.
 * GET /api/sec/search?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&layer=pipeline|confirmation
 *
 * layer=pipeline  → S-1, S-1/A, F-1, F-1/A (intent / registration)
 * layer=confirmation → 424B4 (final prospectus / IPO completed)
 * layer=all or omit → pipeline only (default)
 */
const SEC_USER_AGENT = 'Prospecti-InvestmentResearch/1.0 (contact@prospecti-app.com)';

const LAYER_QUERIES = {
  pipeline: 'forms:(S-1 OR "S-1/A" OR F-1 OR "F-1/A")',
  confirmation: 'forms:424B4',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const dateFrom = req.query.dateFrom ?? '';
  const dateTo = req.query.dateTo ?? '';
  const layer = req.query.layer ?? 'pipeline';
  const formsQuery = LAYER_QUERIES[layer] ?? LAYER_QUERIES.pipeline;
  const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(formsQuery)}&dateRange=custom&startdt=${dateFrom}&enddt=${dateTo}&from=0&size=100`;
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
