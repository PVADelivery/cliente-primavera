import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import logoIcon from "@/assets/logo-icon-v3.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Primavera Delivery" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setErr(error);
    else navigate({ to: "/marketplace" });
  };

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden mx-auto shadow-2xl ring-2 ring-white/10 bg-white">
            <img src={logoIcon} alt="Primavera Delivery" className="w-full h-full object-cover scale-[2.2]" />
          </span>
          <h1 className="font-display text-2xl font-bold">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground">Entre para continuar pedindo</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={loading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <button onClick={signInWithGoogle} className="w-full py-3 rounded-xl border border-border bg-card font-medium">
          Continuar com Google
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta? <Link to="/signup" className="text-primary font-medium">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
