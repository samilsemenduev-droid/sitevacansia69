import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function readSupabaseUrl(): string {
  const v = import.meta.env.VITE_SUPABASE_URL;
  return typeof v === 'string' ? v.trim() : '';
}

function readSupabaseAnonKey(): string {
  const v = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return typeof v === 'string' ? v.trim() : '';
}

/** true, если в бандл попали непустые URL и публичный ключ (задаются при `vite build`). */
export function isSupabaseConfigured(): boolean {
  return readSupabaseUrl().length > 0 && readSupabaseAnonKey().length > 0;
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const url = readSupabaseUrl();
  const key = readSupabaseAnonKey();
  if (!client) client = createClient(url, key);
  return client;
}
