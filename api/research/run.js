export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { companyUrl = '', companyName = '', notes = '' } = body;

    const clientId = (req.headers['x-client-id']) || process.env.DEFAULT_CLIENT_ID || '';
    const adminUserId = (req.headers['x-user-id']);
    if (!adminUserId) return res.status(401).json({ error: 'missing x-user-id' });
    const { getUser } = await import('../../backend/src/services/users.js');
    const user = await getUser(adminUserId);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'admin only' });

    const { runDeepResearch } = await import('../../backend/src/services/research/engine.js');
    const result = await runDeepResearch({ companyUrl, companyName, notes });

    if (clientId) {
      const { saveResearchJob } = await import('../../backend/src/services/research/jobs.js');
      await saveResearchJob({ clientId, extJobId: result.jobId, payload: body, result });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}