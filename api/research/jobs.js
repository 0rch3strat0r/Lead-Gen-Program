export default async function handler(_req, res) {
  try {
    // TODO: integrate with Supabase jobs if needed
    return res.status(200).json({ jobs: [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load jobs' });
  }
}