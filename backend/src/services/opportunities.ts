import { getSupabase } from "./db.js";

export type OpportunityStatus = "unclaimed" | "claimed" | "won" | "lost";
export type Opportunity = {
  id: string;
  client_id: string;
  title: string;
  url: string;
  source?: string | null;
  region_code?: string | null;
  keywords?: string[] | null;
  status: OpportunityStatus;
  claimed_by?: string | null;
  claimed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function createOrGetOpportunity(params: {
  clientId: string;
  title: string;
  url: string;
  source?: string;
  regionCode?: string;
  keywords?: string[];
}): Promise<Opportunity> {
  const supabase = getSupabase();
  const { clientId, title, url, source, regionCode, keywords } = params;
  let { data, error } = await supabase
    .from("opportunities")
    .insert([{ client_id: clientId, title, url, source, region_code: regionCode, keywords }])
    .select()
    .single();
  if (error && (error as any).code === "23505") {
    const { data: existing, error: fetchErr } = await supabase
      .from("opportunities")
      .select("*")
      .eq("client_id", clientId)
      .eq("url", url)
      .single();
    if (fetchErr) throw fetchErr;
    return existing as Opportunity;
  }
  if (error) throw error;
  return data as Opportunity;
}

export async function listOpportunities(clientId: string, status?: OpportunityStatus) {
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
  return data as Opportunity[];
}

export async function claimOpportunity(params: { id: string; userId: string; clientId: string }) {
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
  return data as Opportunity;
}

export async function updateOpportunityStatus(params: { id: string; clientId: string; status: OpportunityStatus }) {
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
  return data as Opportunity;
}