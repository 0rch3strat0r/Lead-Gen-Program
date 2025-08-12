export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const clientId = (req.headers['x-client-id']) || process.env.DEFAULT_CLIENT_ID || '';
    if (!clientId) return res.status(400).json({ error: 'missing client_id' });

    const { title, url, source, regionCode, keywords } = (typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{}));
    if (!title || !url) return res.status(400).json({ error: 'missing title or url' });

    const { createOrGetOpportunity } = await import('../../backend/src/services/opportunities.js');
    const opp = await createOrGetOpportunity({ clientId, title, url, source, regionCode, keywords });
    return res.status(200).json({ opportunity: opp });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}