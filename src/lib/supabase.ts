import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Supabase externo (compartilhado com /admin, /business e /driver).
// Aceita tanto o nome legado VITE_SUPABASE_ANON_KEY quanto o novo VITE_SUPABASE_PUBLISHABLE_KEY.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://YOUR-PROJECT.supabase.co";

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "YOUR-ANON-KEY";

// Configurado de verdade: URL parece um endpoint Supabase E a chave tem formato JWT (eyJ...) ou sb_publishable_...
export const isSupabaseConfigured =
  /\.supabase\.(co|in)$/.test(new URL(supabaseUrl).hostname.replace(/^.*?\/\//, "")) === false
    ? supabaseUrl.includes("supabase.") &&
      (supabaseAnonKey.startsWith("eyJ") || supabaseAnonKey.startsWith("sb_publishable_"))
    : supabaseAnonKey.startsWith("eyJ") || supabaseAnonKey.startsWith("sb_publishable_");

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
});
