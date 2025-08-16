export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const userId = req.headers['x-user-id'];
    const clientId = req.headers['x-client-id'] || process.env.DEFAULT_CLIENT_ID || '';
    if (!userId) return res.status(401).json({ error: 'missing x-user-id' });
    if (!clientId) return res.status(400).json({ error: 'missing client_id' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'missing id' });

    const { getUser } = await import('../../backend/src/services/users.js');
    const actor = await getUser(String(userId));
    if (!actor) return res.status(401).json({ error: 'unknown user' });

    const { getSupabase } = await import('../../backend/src/services/db.js');
    const supabase = getSupabase();

    // Fetch opp and enforce tenant + permission
    const { data: opp, error: errFetch } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();
    if (errFetch) throw errFetch;
    if (!opp || opp.client_id !== actor.client_id || opp.client_id !== clientId) {
      return res.status(403).json({ error: 'forbidden: wrong tenant' });
    }
    const isAdmin = actor.role === 'admin';
    const isAssignee = opp.claimed_by && String(opp.claimed_by) === String(userId);
    if (!isAdmin && !isAssignee) return res.status(403).json({ error: 'forbidden' });

    const fields = {};
    ['stage','est_mvp_value','est_contract_value','agreed_mvp_value','agreed_contract_value'].forEach(k => {
      if (body[k] !== undefined) fields[k] = body[k];
    });
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

    const { data, error } = await supabase
      .from('opportunities')
      .update(fields)
      .eq('id', id)
      .eq('client_id', clientId)
      .select()
      .single();
    if (error) throw error;
    return res.status(200).json({ opportunity: data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}