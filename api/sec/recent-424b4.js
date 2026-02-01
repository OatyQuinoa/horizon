/**
 * Vercel serverless: proxy SEC browse-edgar Atom feed for 424B4 (final prospectus / IPO completed).
 * 424B4 is filed after pricing, right around the actual IPO — canonical "IPO happened" signal.
 * GET /api/sec/recent-424b4?count=80
 */
const SEC_USER_AGENT = 'AIIS-InvestmentResearch/1.0 (contact@aiis-research.com)';

function parseSecAtomFeed(xml, formLabel) {
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
    const formType = (categoryMatch && categoryMatch[1]) ? categoryMatch[1] : formLabel;
    const accessionMatch = id.match(/accession-number=([\w-]+)/i);
    const accessionNumber = accessionMatch ? accessionMatch[1] : id.replace(/^.*,/, '');
    // Title format: "424B4 - Company Name (CIK)" or "424B4 - Company Name (CIK) (Filer)"
    const titleCompanyMatch = title.match(/^424B4\s*[-–]\s*(.+?)\s*\((\d+)\)\s*(?:\(Filer\))?$/i)
      || title.match(/^([^(]+?)\s*\((\d+)\)\s*(?:\(Filer\))?$/i);
    const cik = titleCompanyMatch ? titleCompanyMatch[2].padStart(10, '0') : '';
    const companyName = titleCompanyMatch ? titleCompanyMatch[1].trim() : title.replace(/^424B4\s*[-–]\s*/i, '').replace(/\s*\(\d+\)\s*(?:\(Filer\))?$/, '').trim();
    const filingDate = updated ? updated.slice(0, 10) : '';
    filings.push({ cik, companyName, filingDate, formType, accessionNumber });
  }
  return { filings };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const count = Math.min(Number(req.query.count) || 80, 80);
  const atomUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=424B4&company=&dateb=&owner=exclude&start=0&count=${count}&output=atom`;
  try {
    const secRes = await fetch(atomUrl, {
      headers: {
        'User-Agent': SEC_USER_AGENT,
        Accept: 'application/atom+xml, application/xml, text/xml',
      },
    });
    const xml = await secRes.text();
    const json = parseSecAtomFeed(xml, '424B4');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify(json));
  } catch (err) {
    console.error('SEC recent-424b4 proxy error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(502).end(JSON.stringify({ error: 'Proxy error', detail: String(err) }));
  }
}
