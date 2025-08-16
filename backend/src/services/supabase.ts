import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  }
  cachedClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return cachedClient;
}

export type JobRow = {
  id: string;
  client_id: string;
  status: "queued" | "running" | "done" | "error";
  prompt?: string | null;
  result?: any;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function createJob(client_id: string, prompt: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert([{ client_id, status: "queued", prompt }])
    .select()
    .single();
  if (error) throw error;
  return data as JobRow;
}

export async function setJobRunning(id: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "running" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as JobRow;
}

export async function setJobResult(id: string, result: any) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "done", result })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as JobRow;
}

export async function setJobError(id: string, message: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "error", error_message: message })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as JobRow;
}

export async function listJobs(client_id: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("client_id", client_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as JobRow[];
}

export async function getJob(client_id: string, id: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("client_id", client_id)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as JobRow;
}