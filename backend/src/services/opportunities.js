import { getSupabase } from "./db.js";

export async function createOrGetOpportunity(params){
  const supabase = getSupabase();
  const { clientId, title, url, source, regionCode, keywords } = params;
  let { data, error } = await supabase
    .from("opportunities")
    .insert([{ client_id: clientId, title, url, source, region_code: regionCode, keywords }])
    .select()
    .single();
  if (error && error.code === "23505") {
    const { data: existing, error: fetchErr } = await supabase
      .from("opportunities")
      .select("*")
      .eq("client_id", clientId)
      .eq("url", url)
      .single();
    if (fetchErr) throw fetchErr;
    return existing;
  }
  if (error) throw error;
  return data;
}

export async function listOpportunities(clientId, status){
  const supabase = getSupabase();
  let q = supabase
    .from("opportunities")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function claimOpportunity(params){
  const supabase = getSupabase();
  const { id, userId, clientId } = params;
  const { data, error } = await supabase
    .from("opportunities")
    .update({ status: "claimed", claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_id", clientId)
    .eq("status", "unclaimed")
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOpportunityStatus(params){
  const supabase = getSupabase();
  const { id, clientId, status } = params;
  const { data, error } = await supabase
    .from("opportunities")
    .update({ status })
    .eq("id", id)
    .eq("client_id", clientId)
    .select()
    .single();
  if (error) throw error;
  return data;
}