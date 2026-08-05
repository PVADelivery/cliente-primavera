import { createClient } from "@supabase/supabase-js";

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
const OFFICIAL_DB = "owlbzwsdcognrgolvnzg";

// Configurado de verdade quando a URL aponta para supabase E a chave tem formato JWT (eyJ...) ou sb_publishable_*.
export const isSupabaseConfigured =
  supabaseUrl.includes("supabase.") &&
  !supabaseUrl.includes("YOUR-PROJECT") &&
  (supabaseAnonKey.startsWith("eyJ") || supabaseAnonKey.startsWith("sb_publishable_"));

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true,
  },
});

// Alerta de banco incorreto: enviado pela Edge Function `telegram-logger`,
// que guarda o token do bot como secret no servidor (nunca no bundle do cliente).
if (!supabaseUrl.includes(OFFICIAL_DB) && !supabaseUrl.includes("YOUR-PROJECT")) {
  // eslint-disable-next-line no-console
  console.error("[guardian] Banco de dados inesperado detectado.");
  void supabase.functions
    .invoke("telegram-logger", {
      body: {
        app_name: "Marketplace Cliente",
        error_message: "SABOTAGEM DE BANCO DE DADOS DETECTADA",
        additional_info: { expected: OFFICIAL_DB, received: supabaseUrl },
      },
    })
    .catch(() => {});
}
