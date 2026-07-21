import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import logoIcon from "@/assets/logo-icon-v3.png";
import { Eye, EyeOff, Check, X } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta — MT 24horas express" }] }),
  component: SignupPage,
});

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? "text-green-600" : "text-muted-foreground"}`}>
      {ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </li>
  );
}

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMin8 = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordValid = hasMin8 && hasLetter && hasNumber;
  const confirmMatch = confirm.length > 0 && confirm === password;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!passwordValid) {
      setErr("A senha não atende aos requisitos mínimos.");
      return;
    }
    if (password !== confirm) {
      setErr("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) setErr(error);
    else navigate({ to: "/marketplace" });
  };

  const inputCls = "w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm";

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-background py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden mx-auto shadow-2xl ring-2 ring-white/10 bg-white">
            <img src={logoIcon} alt="MT 24horas express" className="w-full h-full object-cover scale-[2.2]" />
          </span>
          <h1 className="font-display text-2xl font-bold">Crie sua conta</h1>
          <p className="text-sm text-muted-foreground">Leva menos de 1 minuto</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">Nome completo</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className={inputCls}
            />
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={inputCls}
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">Senha</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha forte"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Regras de senha */}
            {password.length > 0 && (
              <ul className="mt-2 ml-1 space-y-1">
                <PasswordRule ok={hasMin8} label="Mínimo 8 caracteres" />
                <PasswordRule ok={hasLetter} label="Pelo menos uma letra" />
                <PasswordRule ok={hasNumber} label="Pelo menos um número" />
              </ul>
            )}
          </div>

          {/* Confirmar Senha */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 ml-1">Confirmar senha</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                className={`${inputCls} pr-11 ${confirm.length > 0 ? (confirmMatch ? "border-green-500 focus:ring-green-500/30" : "border-destructive focus:ring-destructive/20") : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm.length > 0 && !confirmMatch && (
              <p className="text-xs text-destructive mt-1 ml-1">As senhas não coincidem</p>
            )}
            {confirmMatch && (
              <p className="text-xs text-green-600 mt-1 ml-1 flex items-center gap-1"><Check className="w-3 h-3" /> Senhas conferem</p>
            )}
          </div>

          {err && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <p className="text-sm text-destructive">{err}</p>
            </div>
          )}

          <button
            disabled={loading || !passwordValid || !confirmMatch}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 transition-opacity mt-2"
          >
            {loading ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-primary font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
