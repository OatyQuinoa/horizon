/**
 * Full filing text (raw submission .txt) from SEC EDGAR.
 * Format: https://www.sec.gov/Archives/edgar/data/{CIK_NO_LEADING_ZEROS}/{ACCESSION_NO_HYPHENS}/{ACCESSION_WITH_HYPHENS}.txt
 * The middle path segment is the accession number with hyphens removed.
 * GET /api/sec/full-filing?cik=0002100782&accession=0001193125-26-083190
 */
const SEC_USER_AGENT = 'Prospecti-InvestmentResearch/1.0 (contact@prospecti-app.com)';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const cik = String(req.query.cik || '').replace(/\D/g, '');
  const accession = String(req.query.accession || '').trim();
  if (!cik || !accession) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).end(JSON.stringify({ error: 'Missing cik or accession' }));
    return;
  }
  const cleanCik = cik.replace(/^0+/, '') || cik;
  const accNoHyphens = accession.replace(/-/g, '');
  const txtUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accNoHyphens}/${accession}.txt`;
  const headers = { 'User-Agent': SEC_USER_AGENT, Accept: 'text/plain' };

  try {
    const secRes = await fetch(txtUrl, { headers });
    if (!secRes.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(secRes.status).end(JSON.stringify({ error: 'Full filing not found' }));
      return;
    }
    const text = await secRes.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Full-Filing-Url', txtUrl);
    res.status(200).end(text);
  } catch (err) {
    console.error('SEC full-filing proxy error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(502).end(JSON.stringify({ error: 'Proxy error', detail: String(err) }));
  }
}
