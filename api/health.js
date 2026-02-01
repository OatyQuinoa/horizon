/**
 * Heartbeat endpoint to verify Vercel API routing works.
 * GET /api/health → { "status": "alive" }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({ status: 'alive' }));
}
