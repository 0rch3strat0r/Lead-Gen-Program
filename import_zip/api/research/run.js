// Vercel API (CommonJS) → loads ESM backend via dynamic import
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    // Import compiled ESM backend (ensure TS compiles to backend/dist)
    const { runDeepResearch } = await import('../../backend/dist/services/research/engine.js');
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { companyUrl = '', companyName = '', notes = '' } = body;

    const result = await runDeepResearch({ companyUrl, companyName, notes });
    res.status(200).json({
      jobId: result.jobId || null,
      summary: result.summary || '',
      findings: result.findings || [],
      meta: result.meta || {}
    });
  } catch (err) {
    console.error('research/run error', err);
    res.status(500).json({ error: 'Research run failed', details: (err && err.message) || String(err) });
  }
};
