import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Phone,
  X,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { SocialCategory, SocialPost } from "@/types/database";
import { AeroPageHeader, AeroSkeletonList, AeroEmptyState } from "@/components/aero";
import { SYSTEM_SERVICE_FEE } from "@/lib/constants";
import { ServiceFeeInfoModal } from "@/components/marketplace/ServiceFeeInfoModal";
import { toast } from "sonner";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";

export const ADMIN_SOCIAL_WHATSAPP = "556697196937";

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

export function buildSocialWhatsAppMessage(post: {
  title: string;
  category: SocialCategory;
  contact?: string | null;
  body?: string | null;
}) {
  return `Olá, Administrador do MT 24horas express! 👋\n\nAcabei de cadastrar um anúncio no *Espaço Social (Classificados)*:\n\n📋 *Título:* ${post.title.trim()}\n📂 *Categoria:* ${CATEGORY_LABEL[post.category] || post.category}\n📱 *Contato:* ${post.contact?.trim() || "Não informado"}\n${post.body?.trim() ? `📝 *Descrição:* ${post.body.trim()}\n` : ""}\nGostaria de fazer o *pagamento da taxa de R$ ${SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}* via Pix para aprovar e publicar meu anúncio no aplicativo! Por favor, me envie a chave Pix. 🚀`;
}

function SocialPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SocialCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);

  // Busca todos os posts públicos ativos
  const { data: publicPosts = [], isLoading } = useQuery({
    queryKey: ["social_posts_public"],
    queryFn: async (): Promise<SocialPost[]> => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.info("[social_posts_public]", error.code, error.message);
        return [];
      }
      return (data ?? []) as SocialPost[];
    },
  });

  // Busca os posts pendentes do próprio usuário logado
  const { data: myPendingPosts = [] } = useQuery({
    queryKey: ["social_posts_my_pending", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<SocialPost[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", false)
        .order("created_at", { ascending: false });
      if (error) {
        console.info("[social_posts_my_pending]", error.code, error.message);
        return [];
      }
      return (data ?? []) as SocialPost[];
    },
  });

  const list = tab === "all" ? publicPosts : publicPosts.filter((p) => p.category === tab);

  const handleOpenForm = () => {
    if (!user) {
      toast.error("Você precisa entrar na sua conta para publicar um classificado.");
      navigate({ to: "/login" });
      return;
    }
    setShowForm(true);
  };

  const openAdminWaForPost = (post: SocialPost) => {
    const text = encodeURIComponent(buildSocialWhatsAppMessage(post));
    const url = `https://wa.me/${ADMIN_SOCIAL_WHATSAPP}?text=${text}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <AeroPageHeader
        title="Espaço Social"
        subtitle="Classificados da cidade"
        onBack={() => navigate({ to: "/marketplace" })}
      />

      {/* Meus Anúncios Aguardando Pagamento / Aprovação */}
      {myPendingPosts.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 animate-spin" />
            <h4 className="font-display font-black text-sm text-foreground">
              Seus Anúncios Aguardando Aprovação ({myPendingPosts.length})
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Envie o comprovante da taxa (R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}) no WhatsApp para liberarmos o anúncio no app.
          </p>

          <div className="space-y-2">
            {myPendingPosts.map((pending) => (
              <div
                key={pending.id}
                className="p-3 rounded-2xl bg-card border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {CATEGORY_LABEL[pending.category]}
                    </span>
                    <span className="text-xs font-bold text-foreground truncate max-w-[200px]">
                      {pending.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Taxa: R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openAdminWaForPost(pending)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0 transition-transform active:scale-95"
                >
                  <WhatsappIcon className="w-3.5 h-3.5" />
                  <span>Pagar / Ativar no WhatsApp</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorias */}
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
            queryClient.invalidateQueries({ queryKey: ["social_posts_public"] });
            queryClient.invalidateQueries({ queryKey: ["social_posts_my_pending"] });
          }}
        />
      )}
    </div>
  );
}

function NewPostSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step 1: Form, Step 2: WhatsApp Approval
  const [step, setStep] = useState<1 | 2>(1);

  const [category, setCategory] = useState<SocialCategory>("vagas");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showServiceFeeModal, setShowServiceFeeModal] = useState(false);

  const [createdPost, setCreatedPost] = useState<{
    title: string;
    category: SocialCategory;
    contact: string;
    body: string;
  } | null>(null);

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
        is_active: false, // Salva pendente para aprovação pelo admin
      });

      if (err) {
        console.error("[social_posts insert]", err);
        setError("Não foi possível salvar: " + (err.message || "Erro de permissão"));
        toast.error("Erro ao salvar classificado.");
        setSaving(false);
        return;
      }

      setCreatedPost({
        title: title.trim(),
        category,
        contact: contact.trim(),
        body: body.trim(),
      });
      setStep(2);
      toast.success("Anúncio registrado! Prossiga com a ativação via WhatsApp.");
      onCreated();
    } catch (e: any) {
      console.error("[social_posts exception]", e);
      setError(e?.message || "Erro inesperado ao salvar.");
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const openAdminWhatsApp = () => {
    if (!createdPost) return;
    const text = encodeURIComponent(buildSocialWhatsAppMessage(createdPost));
    const url = `https://wa.me/${ADMIN_SOCIAL_WHATSAPP}?text=${text}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const copyPixKey = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ADMIN_SOCIAL_WHATSAPP);
      toast.success("Chave Pix copiada!");
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
            <h2 className="font-display font-black text-lg sm:text-xl text-foreground mt-0.5">
              {step === 1 ? "Novo Classificado" : "Ativação & Pagamento"}
            </h2>
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

        {/* Passo 1: Formulário de Cadastro */}
        {step === 1 && (
          <>
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

              {/* Resumo de valores */}
              <div className="bg-muted/40 rounded-2xl border border-border/70 p-3.5 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Resumo de valores</h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Publicação Comunitária</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Grátis</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    Taxa de serviço & moderação
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
                  <span className="font-bold text-foreground">Total para Ativação</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Fixo */}
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
                    <span>Salvando anúncio...</span>
                  </>
                ) : (
                  <span>Continuar para Pagamento (R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")})</span>
                )}
              </button>
            </div>
          </>
        )}

        {/* Passo 2: Pagamento e Ativação via WhatsApp (Estilo PPP) */}
        {step === 2 && createdPost && (
          <>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-display font-black text-xl text-foreground">
                  Anúncio Registrado!
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Para que seu classificado seja liberado e exibido para toda a cidade no Espaço Social, realize o pagamento da taxa de aprovação.
                </p>
              </div>

              {/* Resumo do Anúncio */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {CATEGORY_LABEL[createdPost.category]}
                  </span>
                  <span className="text-xs font-black text-foreground">
                    Taxa: R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-foreground">
                  {createdPost.title}
                </h4>
                {createdPost.contact && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> {createdPost.contact}
                  </p>
                )}
              </div>

              {/* Instruções Pix */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Aprovação Rápida via WhatsApp</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Clique no botão abaixo para abrir a conversa com o Administrador com todos os dados preenchidos. Basta transferir <strong>R$ {SYSTEM_SERVICE_FEE.toFixed(2).replace(".", ",")}</strong> e enviar o comprovante!
                </p>
              </div>
            </div>

            {/* Footer com Botão WhatsApp */}
            <div className="p-4 sm:p-5 border-t border-border/60 bg-card shrink-0 space-y-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={openAdminWhatsApp}
                className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <WhatsappIcon className="w-5 h-5" />
                <span>Enviar Comprovante e Ativar no WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-10 rounded-xl font-bold text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Concluir e Voltar
              </button>
            </div>
          </>
        )}

        <ServiceFeeInfoModal
          isOpen={showServiceFeeModal}
          onClose={() => setShowServiceFeeModal(false)}
        />

      </div>
    </div>
  );
}