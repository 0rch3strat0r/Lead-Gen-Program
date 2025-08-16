export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const adminUserId = req.headers['x-user-id'];
    const clientId = req.headers['x-client-id'] || process.env.DEFAULT_CLIENT_ID || '';
    if (!adminUserId) return res.status(401).json({ error: 'missing x-user-id' });
    if (!clientId) return res.status(400).json({ error: 'missing client_id' });

    const { id, assigneeUserId } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!id || !assigneeUserId) return res.status(400).json({ error: 'missing id or assigneeUserId' });

    const { getUser } = await import('../../backend/src/services/users.js');
    const admin = await getUser(String(adminUserId));
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'admin only' });

    const { getSupabase } = await import('../../backend/src/services/db.js');
    const supabase = getSupabase();

    // Ensure opp belongs to same tenant
    const { data: opp, error: errFetch } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();
    if (errFetch) throw errFetch;
    if (!opp || opp.client_id !== admin.client_id || opp.client_id !== clientId) {
      return res.status(403).json({ error: 'forbidden: wrong tenant' });
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update({ status: 'claimed', claimed_by: assigneeUserId, claimed_at: new Date().toISOString() })
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