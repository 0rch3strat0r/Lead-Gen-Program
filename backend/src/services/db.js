import { createClient } from '@supabase/supabase-js';

let cached = null;
export function getSupabase() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}