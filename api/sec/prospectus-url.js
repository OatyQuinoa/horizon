/**
 * Resolve the prospectus document URL from the SEC filing index.
 * GET /api/sec/prospectus-url?cik=0002081536&accession=0001213900-26-010324
 * Returns: { url: "https://www.sec.gov/Archives/edgar/data/..." }
 */
const SEC_USER_AGENT = 'Prospecti-InvestmentResearch/1.0 (contact@prospecti-app.com)';

function parseIndexForProspectus(html, baseUrl) {
  const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const matches = [...html.matchAll(linkRegex)];
  const htmLinks = matches.filter((m) => {
    const href = (m[1] || '').toLowerCase();
    const text = (m[2] || '').toLowerCase();
    const isHtm = href.endsWith('.htm') || href.endsWith('.html') || text.endsWith('.htm') || text.endsWith('.html');
    const isIndex = /index\.htm|index\.html/i.test(href) || /index\.htm|index\.html/i.test(text);
    const isCompleteTxt = /\.txt$/i.test(href);
    return isHtm && !isIndex && !isCompleteTxt;
  });
  const prospectus424 = htmLinks.find((m) => /424b4|424b/i.test(m[1]) || /424b4|424b/i.test(m[2]));
  const prospectusDesc = htmLinks.find((m) => /prospectus|424b|s-1\.htm|f-1\.htm/i.test(m[2]));
  const first = prospectus424 ?? prospectusDesc ?? htmLinks[0];
  if (!first) return null;
  const href = first[1].trim();
  return href.startsWith('http') ? href : new URL(href, baseUrl).href;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const cik = String(req.query.cik || '').replace(/\D/g, '').padStart(10, '0');
  const accession = String(req.query.accession || '').trim();
  if (!cik || !accession) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).end(JSON.stringify({ error: 'Missing cik or accession' }));
    return;
  }
  const accNoDashes = accession.replace(/-/g, '');
  const cleanCik = cik.replace(/^0+/, '') || cik;
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accNoDashes}/${accession}-index.htm`;
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accNoDashes}/`;
  const headers = { 'User-Agent': SEC_USER_AGENT, Accept: 'text/html,application/xhtml+xml' };

  try {
    const indexRes = await fetch(indexUrl, { headers });
    if (!indexRes.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(indexRes.status).end(JSON.stringify({ error: 'Filing index not found' }));
      return;
    }
    const indexHtml = await indexRes.text();
    let prospectusUrl = parseIndexForProspectus(indexHtml, baseUrl);
    if (!prospectusUrl) {
      prospectusUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accNoDashes}/${accession}-index.htm`;
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).end(JSON.stringify({ url: prospectusUrl }));
  } catch (err) {
    console.error('SEC prospectus-url error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(502).end(JSON.stringify({ error: 'Proxy error', detail: String(err) }));
  }
}
