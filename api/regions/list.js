export default async function handler(_req, res) {
  try {
    const { supabase } = await import('../../backend/src/services/supabase.js');
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('name');
    if (error) throw error;
    return res.status(200).json({ regions: data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}