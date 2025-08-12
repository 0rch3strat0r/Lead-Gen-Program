export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { companyUrl = '', companyName = '', notes = '' } = body;

    const clientId = (req.headers['x-client-id']) || process.env.DEFAULT_CLIENT_ID || '';
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