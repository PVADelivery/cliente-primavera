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

// GUARDIAN DO BANCO DE DADOS - NUNCA REMOVER
const OFFICIAL_DB = "nptkxlrhrlssdsevpgqe";
if (!supabaseUrl.includes(OFFICIAL_DB) && !supabaseUrl.includes("YOUR-PROJECT")) {
  fetch("https://api.telegram.org/bot8798211446:AAHLAxDhYh81qj7o39qBkkaez3vZvEJnXqw/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: "538563060",
      text: `🚨 *SABOTAGEM DE BANCO DE DADOS DETECTADA!* 🚨\n\nApp Marketplace (Cliente Primavera) foi inicializado com um banco de dados incorreto!\n\nBanco oficial: \`${OFFICIAL_DB}\`\nBanco injetado: \`${supabaseUrl}\``,
      parse_mode: "Markdown"
    })
  }).catch(() => {});
}

// Configurado de verdade quando a URL aponta para supabase E a chave tem formato JWT (eyJ...) ou sb_publishable_*.
export const isSupabaseConfigured =
  supabaseUrl.includes("supabase.") &&
  !supabaseUrl.includes("YOUR-PROJECT") &&
  (supabaseAnonKey.startsWith("eyJ") || supabaseAnonKey.startsWith("sb_publishable_"));

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
});
