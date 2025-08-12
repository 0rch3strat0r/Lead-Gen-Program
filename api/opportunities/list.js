export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const clientId = (req.headers['x-client-id']) || process.env.DEFAULT_CLIENT_ID || '';
    if (!clientId) return res.status(400).json({ error: 'missing client_id' });
    const status = (req.query && req.query.status) || undefined;

    const { listOpportunities } = await import('../../backend/src/services/opportunities.js');
    const ops = await listOpportunities(clientId, status);
    return res.status(200).json({ opportunities: ops });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}