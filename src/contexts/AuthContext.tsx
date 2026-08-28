import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { recordAuditLog, newRequestId } from "@/lib/auditLog";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: (Record<string, any> & { phone?: string | null; full_name?: string | null; role?: string | null }) | null;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextValue["profile"]>(null);

  const loadProfile = async (userId: string | null, authUser?: User | null) => {
    if (!userId || !isSupabaseConfigured) {
      setProfile(null);
      return;
    }
    try {
      const { data } = await supabase.from("profiles").select("*").or(`id.eq.${userId},user_id.eq.${userId}`).maybeSingle();
      setProfile((data as AuthContextValue["profile"]) ?? null);

      // Auto-sincronização do email do usuário autenticado no sistema (customer_credits, customers)
      const email = authUser?.email || user?.email;
      const fullName = (data as any)?.full_name || authUser?.user_metadata?.full_name || (email ? email.split("@")[0] : "");
      const phone = (data as any)?.phone || authUser?.user_metadata?.phone || "";

      if (email) {
        try {
          // Atualiza dados na carteira de créditos
          void supabase
            .from("customer_credits")
            .update({
              customer_email: email,
              ...(fullName ? { customer_name: fullName } : {}),
              ...(phone ? { customer_phone: phone } : {}),
              updated_at: new Date().toISOString(),
            } as any)
            .or(`customer_id.eq.${userId},customer_name.ilike.%${fullName || "___"}%`);

          // Atualiza dados na tabela de clientes
          void supabase
            .from("customers")
            .upsert(
              {
                user_id: userId,
                email: email,
                name: fullName || "Cliente Marketplace",
                ...(phone ? { phone } : {}),
              } as any,
              { onConflict: "user_id" }
            );
        } catch (syncErr) {}
      }
    } catch {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    await loadProfile(user?.id ?? null, user);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      void loadProfile(s?.user?.id ?? null, s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      void loadProfile(data.session?.user?.id ?? null, data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const requestId = newRequestId();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await recordAuditLog({ request_id: requestId, event: "auth.signin.failed", error_message: error.message });
      return { error: error.message };
    }
    await recordAuditLog({ request_id: requestId, event: "auth.signin.success" });
    return { error: null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName) => {
    const requestId = newRequestId();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/marketplace`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      // Se o usuário já está registrado no banco em outro painel (ex: motorista, lojista, admin):
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user_already_exists")
      ) {
        // Tenta autenticar automaticamente com as credenciais fornecidas
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError && signInData.user) {
          try {
            await supabase.from("profiles").upsert(
              {
                user_id: signInData.user.id,
                full_name: fullName,
              },
              { onConflict: "user_id" }
            );
          } catch (e) {}

          await recordAuditLog({ request_id: requestId, event: "auth.cross_panel_signup_signin.success" });
          return { error: null };
        }

        // Se a senha não coincidir com a conta pré-existente
        await recordAuditLog({ request_id: requestId, event: "auth.cross_panel_signup.password_mismatch" });
        return {
          error: "Este e-mail já possui cadastro na MT 24horas. Acesse a tela de login com sua senha existente.",
        };
      }

      await recordAuditLog({ request_id: requestId, event: "auth.signup.failed", error_message: error.message });
      return { error: error.message };
    }

    // Se Supabase retornou identidades vazias (usuário já existia sem erro explícito)
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError && signInData.user) {
        return { error: null };
      }
      return {
        error: "Este e-mail já possui cadastro na MT 24horas. Acesse a tela de login com sua senha existente.",
      };
    }

    await recordAuditLog({ request_id: requestId, event: "auth.signup.success" });
    return { error: null };
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/marketplace` },
    });
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro no signOut:", error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, profile, refreshProfile, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
