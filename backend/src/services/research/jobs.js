import { getSupabase } from "../db.js";

export async function saveResearchJob({ clientId, extJobId, payload, result }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('research_jobs')
    .insert([{ client_id: clientId, ext_job_id: extJobId || null, payload: payload || null, result: result || null, status: 'done' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listResearchJobs(clientId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('research_jobs')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}