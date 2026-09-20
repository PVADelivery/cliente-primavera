import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Loader2, Phone, X, LogIn, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { SocialCategory, SocialPost } from "@/types/database";
import { AeroPageHeader, AeroSkeletonList, AeroEmptyState } from "@/components/aero";
import { SYSTEM_SERVICE_FEE } from "@/lib/constants";
import { ServiceFeeInfoModal } from "@/components/marketplace/ServiceFeeInfoModal";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/social")({
  head: () => ({
    meta: [
      { title: "Espaço Social — Classificados de Primavera do Leste" },
      { name: "description", content: "Vagas de emprego, achados e perdidos, doações e serviços da sua cidade em um só lugar." },
      { property: "og:title", content: "Espaço Social — Classificados da cidade" },
      { property: "og:description", content: "Vagas, achados e perdidos, doações e serviços publicados pela comunidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialPage,
});

const CATEGORIES: Array<{ key: SocialCategory | "all"; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "vagas", label: "Vagas" },
  { key: "achados", label: "Achados e perdidos" },
  { key: "doacoes", label: "Doações" },
  { key: "servicos", label: "Serviços" },
];

const CATEGORY_LABEL: Record<SocialCategory, string> = {
  vagas: "Vaga",
  achados: "Achados e perdidos",
  doacoes: "Doação",
  servicos: "Serviço",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function SocialPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SocialCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["social_posts"],
    queryFn: async (): Promise<SocialPost[]> => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.info("[social_posts]", error.code, error.message);
        return [];
      }
      return (data ?? []) as SocialPost[];
    },
  });

  const list = tab === "all" ? posts : posts.filter((p) => p.category === tab);

  const handleOpenForm = () => {
    if (!user) {
      toast.error("Você precisa entrar na sua conta para publicar um classificado.");
      navigate({ to: "/login" });
      return;
    }
    setShowForm(true);
  };

  return (
    <div className="space-y-5 pb-6">
      <AeroPageHeader
        title="Espaço Social"
        subtitle="Classificados da cidade"
        onBack={() => navigate({ to: "/marketplace" })}
      />

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={`tap-target aero-focus shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-colors cursor-pointer ${
              tab === c.key
                ? "bg-btn-surface text-btn-ink border-btn-line shadow-sm"
                : "bg-card text-muted-foreground border-border/60 hover:bg-muted active:bg-btn-active active:text-btn-active-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <AeroSkeletonList count={3} />
      ) : list.length === 0 ? (
        <AeroEmptyState
          title="Nenhum classificado por aqui"
          description="Seja o primeiro a publicar nesta categoria."
          actionLabel="Publicar"
          onAction={handleOpenForm}
        />
      ) : (
        <div className="space-y-3">
          {list.map((post) => (
            <div
              key={post.id}
              className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2 hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-btn-surface-hover">
                  {CATEGORY_LABEL[post.category]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(post.created_at)}
                </span>
              </div>
              <h3 className="font-display font-bold text-base text-foreground leading-snug">
                {post.title}
              </h3>
              {post.body && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {post.body}
                </p>
              )}
              {post.contact && (
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/55${post.contact.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp: {post.contact}</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botão flutuante "Publicar" */}
      <button
        type="button"
        onClick={handleOpenForm}
        className="fixed bottom-24 right-5 z-40 h-12 pl-4 pr-5 rounded-full bg-btn-surface text-btn-ink border border-btn-line hover:bg-btn-surface-hover active:bg-btn-active active:text-btn-active-ink font-bold text-sm flex items-center gap-2 shadow-lg aero-focus cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Publicar
      </button>

      {showForm && (
        <NewPostSheet
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["social_posts"] });
          }}
        />
      )}
    </div>
  );
}

function NewPostSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<SocialCategory>("vagas");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showServiceFeeModal, setShowServiceFeeModal] = useState(false);

  const handleContactChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) {
      setContact(digits);
    } else if (digits.length <= 6) {
      setContact(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else if (digits.length <= 10) {
      setContact(`(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`);
    } else {
      setContact(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("Por favor, preencha o título do classificado.");
      toast.error("Informe um título para o classificado.");
      return;
    }

    if (!user) {
      setError("Você precisa estar logado para publicar.");
      toast.error("Faça login para publicar.");
      navigate({ to: "/login" });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: err } = await supabase.from("social_posts").insert({
        user_id: user.id,
        category,
        title: title.trim(),
        body: body.trim() || null,
        contact: contact.trim() || null,
      });

      if (err) {
        console.error("[social_posts insert]", err);
        setError("Não foi possível publicar agora: " + (err.message || "Erro de permissão"));
        toast.error("Erro ao publicar classificado.");
        setSaving(false);
        return;
      }

      toast.success("Classificado publicado com sucesso!");
      onCreated();
    } catch (e: any) {
      console.error("[social_posts exception]", e);
      setError(e?.message || "Erro inesperado ao salvar.");
      toast.error("Erro ao publicar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-card border border-border/80 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] sm:max-h-[85vh] flex flex-col">
        
        {/* Header Fixo */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-r from-muted/40 via-card to-muted/40 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Espaço Social
            </span>
            <h2 className="font-display font-black text-lg sm:text-xl text-foreground mt-0.5">Novo Classificado</h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            aria-label="Fechar" 
            className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem Livre */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {!user && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Faça login para poder publicar seu anúncio.</span>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/login" })}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" /> Entrar
              </button>
            </div>
          )}

          <div>
            <span className="text-xs font-bold text-foreground block mb-2">Categoria</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LABEL) as SocialCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                    category === c
                      ? "bg-primary text-black border-primary shadow-sm shadow-primary/20 scale-[1.02]"
                      : "bg-background text-muted-foreground border-border/70 hover:border-border"
                  }`}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-foreground block mb-1">Título <span className="text-destructive">*</span></span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Carteira encontrada, Vaga atendente..."
              className="w-full h-11 px-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all"
              required
            />
          </div>

          <div>
            <span className="text-xs font-bold text-foreground block mb-1">Descrição Detalhada</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Descreva as informações do classificado..."
              rows={4}
              className="w-full p-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary resize-none transition-all"
            />
          </div>

          <div>
            <span className="text-xs font-bold text-foreground block mb-1">Telefone / WhatsApp para Contato</span>
            <input
              value={contact}
              onChange={(e) => handleContactChange(e.target.value)}
              inputMode="tel"
              placeholder="(66) 99999-9999"
              className="w-full h-11 px-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
              {error}
            </div>
          )}

          {/* Resumo de valores estilo iFood / Print */}
          <div className="bg-muted/40 rounded-2xl border border-border/70 p-3.5 space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Resumo de valores</h4>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Publicação Comunitária</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Grátis</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                Taxa de serviço
                <button
                  type="button"
                  onClick={() => setShowServiceFeeModal(true)}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted hover:bg-muted-foreground/20 text-[10px] font-bold text-muted-foreground transition-colors cursor-pointer"
                  title="Entenda a taxa de serviço"
                >
                  ?
                </button>
              </span>
              <span className="font-medium text-foreground">R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="h-px w-full bg-border/60 my-1" />
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-black text-sm text-slate-900 dark:text-white">
                R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Fixo com Botão Sempre Visível */}
        <div className="p-4 sm:p-5 border-t border-border/60 bg-card shrink-0 space-y-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={submit}
            disabled={saving || !title.trim() || !user}
            className="w-full h-13 rounded-2xl bg-primary hover:bg-primary/90 text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Publicando classificado...</span>
              </>
            ) : (
              <span>Publicar Classificado (R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")})</span>
            )}
          </button>
        </div>

        <ServiceFeeInfoModal
          isOpen={showServiceFeeModal}
          onClose={() => setShowServiceFeeModal(false)}
        />

      </div>
    </div>
  );
}