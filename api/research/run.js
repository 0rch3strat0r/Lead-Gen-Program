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

    const { getSupabase } = await import('../../backend/src/services/db.js');
    const supabase = getSupabase();

    // Enforce per-tenant daily cap and concurrency
    const cap = Number(process.env.DAILY_RESEARCH_CAP_PER_TENANT || 50);
    const maxRunning = Number(process.env.MAX_CONCURRENT_RESEARCH_JOBS || 3);

    // Count last 24h
    const { data: countData, error: countErr } = await supabase
      .rpc('count_research_jobs_24h', { p_client_id: clientId })
      .select();
    // If RPC is not defined, fallback to select
    let last24h = 0;
    if (!countErr && Array.isArray(countData) && countData.length && typeof countData[0] === 'number') {
      last24h = countData[0];
    } else {
      const { data: lastData, error: lastErr } = await supabase
        .from('research_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
      if (lastErr) throw lastErr;
      last24h = (lastData && lastData.length) ? lastData.length : (lastData === null ? 0 : 0);
    }
    if (last24h >= cap) return res.status(429).json({ error: 'daily cap reached' });

    // Count running
    const { count: runningCount, error: runErr } = await supabase
      .from('research_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'running');
    if (runErr) throw runErr;
    if ((runningCount || 0) >= maxRunning) return res.status(429).json({ error: 'too many concurrent research jobs' });

    // Create job as running
    const { data: created, error: createErr } = await supabase
      .from('research_jobs')
      .insert([{ client_id: clientId, ext_job_id: null, payload: body, result: null, status: 'running' }])
      .select()
      .single();
    if (createErr) throw createErr;

    const { runDeepResearch } = await import('../../backend/src/services/research/engine.js');
    const result = await runDeepResearch({ companyUrl, companyName, notes });

    // Mark done
    await supabase
      .from('research_jobs')
      .update({ status: 'done', result, ext_job_id: result.jobId })
      .eq('id', created.id);

    return res.status(200).json(result);
  } catch (err) {
    try {
      const clientId = (req.headers['x-client-id']) || process.env.DEFAULT_CLIENT_ID || '';
      const { getSupabase } = await import('../../backend/src/services/db.js');
      const supabase = getSupabase();
      await supabase
        .from('research_jobs')
        .update({ status: 'error' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);
    } catch {}
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}