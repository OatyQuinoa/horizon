/**
 * Vercel serverless: proxy SEC company submissions (SIC, tickers, name).
 * GET /api/sec/submissions/CIK0001318605 (or CIK1318605)
 */
const SEC_USER_AGENT = 'Prospecti-InvestmentResearch/1.0 (contact@prospecti-app.com)';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const raw = req.query.cik ?? '';
  const digits = String(raw).replace(/\D/g, '');
  const padded = digits.padStart(10, '0');
  if (!padded) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).end(JSON.stringify({ error: 'Invalid CIK' }));
    return;
  }
  const submissionsUrl = `https://data.sec.gov/submissions/CIK${padded}.json`;
  try {
    const secRes = await fetch(submissionsUrl, {
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
    console.error('SEC submissions proxy error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(502).end(JSON.stringify({ error: 'Proxy error', detail: String(err) }));
  }
}
