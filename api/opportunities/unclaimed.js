export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const userId = (req.headers['x-user-id']);
    if (!userId) return res.status(401).json({ error: 'missing x-user-id' });

    const { getUser } = await import('../../backend/src/services/users.js');
    const user = await getUser(userId);
    if (!user) return res.status(403).json({ error: 'unknown user' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    const { supabase } = await import('../../backend/src/services/supabase.js');
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('client_id', user.client_id)
      .eq('status', 'unclaimed')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return res.status(200).json({ opportunities: data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}