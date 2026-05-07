import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Preencha estes valores com seu projeto Supabase externo.
// (Não use Lovable Cloud — este projeto consome um Supabase já existente, compartilhado com /admin, /business e /driver.)
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://YOUR-PROJECT.supabase.co";

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "YOUR-ANON-KEY";

export const isSupabaseConfigured =
  !supabaseUrl.includes("YOUR-PROJECT") && !supabaseAnonKey.includes("YOUR-ANON");

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
