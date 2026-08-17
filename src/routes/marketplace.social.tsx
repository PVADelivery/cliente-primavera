import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Loader2, Phone, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { SocialCategory, SocialPost } from "@/types/database";
import { AeroPageHeader } from "@/components/aero";

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
        // Tabela ainda não criada no Supabase → lista vazia, sem quebrar a tela
        console.info("[social_posts]", error.code, error.message);
        return [];
      }
      return (data ?? []) as SocialPost[];
    },
  });

  const list = tab === "all" ? posts : posts.filter((p) => p.category === tab);

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
            className={`tap-target aero-focus shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-colors ${
              tab === c.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/60"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <AeroSkeletonList count={3} lines={3} label="Carregando classificados" />
      ) : list.length === 0 ? (
        <AeroEmptyState
          title="Nenhum classificado por aqui"
          description="Seja o primeiro a publicar nesta categoria."
        />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li
              key={p.id}
              className="rounded-3xl border border-border/50 bg-card p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {CATEGORY_LABEL[p.category]}
                </span>
                <span className="text-[11px] text-muted-foreground">{formatDate(p.created_at)}</span>
              </div>
              <h2 className="font-display font-bold text-base mt-3 leading-tight">{p.title}</h2>
              {p.body && <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-line">{p.body}</p>}
              {p.contact && (
                <a
                  href={`https://wa.me/55${p.contact.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary"
                >
                  <Phone className="w-3.5 h-3.5" /> {p.contact}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => (user ? setShowForm(true) : navigate({ to: "/login" }))}
        className="fixed bottom-24 right-5 z-40 h-12 pl-4 pr-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-lg"
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
  const [category, setCategory] = useState<SocialCategory>("vagas");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("social_posts").insert({
      user_id: user.id,
      category,
      title: title.trim(),
      body: body.trim() || null,
      contact: contact.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError("Não foi possível publicar agora. Tente novamente.");
      console.info("[social_posts insert]", err.code, err.message);
      return;
    }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Novo classificado</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABEL) as SocialCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border/60"
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="w-full h-11 px-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Descrição"
          rows={4}
          className="w-full p-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary resize-none"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Telefone / WhatsApp"
          className="w-full h-11 px-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary"
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={submit}
          disabled={saving || !title.trim()}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Publicar
        </button>
      </div>
    </div>
  );
}