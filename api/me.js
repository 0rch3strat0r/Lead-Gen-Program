export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'missing x-user-id' });
    const { getUser } = await import('../backend/src/services/users.js');
    const user = await getUser(String(userId));
    if (!user) return res.status(401).json({ error: 'unknown user' });
    return res.status(200).json({ id: user.id, role: user.role, client_id: user.client_id });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}