import { supabase } from "./supabase";

export type User = { id: string; client_id: string; role: 'admin'|'user' };

export async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, client_id, role')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as User;
}