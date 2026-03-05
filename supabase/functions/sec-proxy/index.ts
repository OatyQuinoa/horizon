/**
 * Supabase Edge Function: SEC EDGAR proxy.
 * Deploy and set VITE_SEC_PROXY_URL to this function's URL for production.
 *
 * Deploy: supabase functions deploy sec-proxy
 * Then: VITE_SEC_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/sec-proxy
 */
const SEC_USER_AGENT = 'Prospecti-InvestmentResearch/1.0 (contact@prospecti-app.com)';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^.*\/sec-proxy/, '') || url.pathname;

  try {
    if (pathname.includes('api/sec/search') || pathname.endsWith('search')) {
      const dateFrom = url.searchParams.get('dateFrom') ?? '';
      const dateTo = url.searchParams.get('dateTo') ?? '';
      const from = Math.max(0, Number(url.searchParams.get('from') ?? url.searchParams.get('start') ?? 0));
      const size = Math.min(400, Math.max(1, Number(url.searchParams.get('size') ?? url.searchParams.get('count') ?? 400)));
      const layer = url.searchParams.get('layer') ?? 'pipeline';
      const formsQuery = layer === 'confirmation' ? 'forms:424B4' : 'forms:(S-1 OR "S-1/A" OR F-1 OR "F-1/A")';
      const searchUrl = 'https://efts.sec.gov/LATEST/search-index';
      const bodyJson = { q: formsQuery, dateRange: 'custom', startdt: dateFrom, enddt: dateTo, from, size };
      const res = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'User-Agent': SEC_USER_AGENT, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(bodyJson),
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
      });
    }

    const submissionsMatch = pathname.match(/api\/sec\/submissions\/CIK(\d+)$/) ?? pathname.match(/CIK(\d+)$/);
    if (submissionsMatch) {
      const cik = submissionsMatch[1].padStart(10, '0');
      const submissionsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
      const res = await fetch(submissionsUrl, {
        headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(e) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
