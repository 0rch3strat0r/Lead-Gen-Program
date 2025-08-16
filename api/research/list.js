export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const clientId = (req.headers['x-client-id']) || process.env.DEFAULT_CLIENT_ID || '';
    if (!clientId) return res.status(400).json({ error: 'missing client_id' });

    const { listResearchJobs } = await import('../../backend/src/services/research/jobs.js');
    const jobs = await listResearchJobs(clientId);
    return res.status(200).json({ jobs });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}