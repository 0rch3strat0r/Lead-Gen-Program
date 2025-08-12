export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const clientId = (req.headers['x-client-id']) || process.env.DEFAULT_CLIENT_ID || '';
    if (!clientId) return res.status(400).json({ error: 'missing client_id' });

    const { id, userId } = (typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{}));
    if (!id || !userId) return res.status(400).json({ error: 'missing id or userId' });

    const { claimOpportunity } = await import('../../backend/src/services/opportunities.js');
    const opp = await claimOpportunity({ id, userId, clientId });
    return res.status(200).json({ opportunity: opp });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}