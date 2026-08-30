import { createClient } from "@supabase/supabase-js";

// Supabase externo (compartilhado com /admin, /business e /driver).
// Aceita tanto o nome legado VITE_SUPABASE_ANON_KEY quanto o novo VITE_SUPABASE_PUBLISHABLE_KEY.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://owlbzwsdcognrgolvnzg.supabase.co";

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bGJ6d3NkY29nbnJnb2x2bnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTQ1NTMsImV4cCI6MjA5NTU3MDU1M30.R6-FUqubIr3uABzv1CS7jiS5cwygrNiIqk4oNbq7O44";

// GUARDIAN DO BANCO DE DADOS - NUNCA REMOVER
const OFFICIAL_DB = "owlbzwsdcognrgolvnzg";

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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
