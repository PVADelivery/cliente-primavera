import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, Send, History } from "lucide-react";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AeroSection, AeroButton, aeroInput } from "@/components/aero";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { cleanCategory, onlyDigits, waLink, type Business } from "@/lib/ppp";

type Quote = {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  category: string;
  description: string;
  status: string | null;
  created_at: string;
};

const DEVICE_KEY = "ppp_quote_device_id";

function getDeviceId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function QuotesSection({
  categories,
  providers,
}: {
  categories: string[];
  providers: Business[];
}) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Serviços");
  const [description, setDescription] = useState("");
  const [lastQuote, setLastQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  useEffect(() => {
    if (!name && profile?.full_name) setName(profile.full_name);
    if (!whatsapp && profile?.phone) setWhatsapp(profile.phone);
  }, [profile]);

  const { data: history = [], isLoading: loadingHistory } = useQuery<Quote[]>({
    queryKey: ["ppp_quotes", user?.id ?? deviceId],
    enabled: Boolean(deviceId || user?.id),
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      try {
        let query = (supabase as any).from("directory_quotes").select("*").order("created_at", { ascending: false }).limit(20);
        query = user?.id ? query.eq("user_id", user.id) : query.eq("device_id", deviceId);
        const { data, error } = await query;
        if (error || !data) return [];
        return data as Quote[];
      } catch {
        return [];
      }
    },
  });

  const createQuote = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user?.id ?? null,
        device_id: deviceId,
        customer_name: name.trim(),
        customer_whatsapp: onlyDigits(whatsapp),
        category,
        description: description.trim(),
        status: "aberto",
      };
      const { data, error } = await (supabase as any).from("directory_quotes").insert(payload).select().maybeSingle();
      if (error) throw error;
      return data as Quote;
    },
    onSuccess: (data) => {
      setLastQuote(data ?? null);
      setDescription("");
      toast.success("Solicitação enviada! Escolha os prestadores para receber no WhatsApp.");
      void queryClient.invalidateQueries({ queryKey: ["ppp_quotes"] });
    },
    onError: () => toast.error("Não foi possível registrar a solicitação. Tente novamente."),
  });

  const matching = useMemo(() => {
    const target = cleanCategory(category).toLowerCase();
    return providers
      .filter((p) => Boolean(p.whatsapp))
      .filter((p) => cleanCategory(p.category || "").toLowerCase() === target)
      .slice(0, 8);
  }, [providers, category]);

  const quoteMessage = (providerName?: string) =>
    `Olá${providerName ? ` *${providerName}*` : ""}! Enviei um pedido de orçamento pelo *PPP — MT 24horas express*.\n\n*Categoria:* ${category}\n*Cliente:* ${name || "Cliente"}\n*WhatsApp:* ${whatsapp}\n\n*Solicitação:* ${description || lastQuote?.description || ""}`;

  const canSubmit = name.trim().length > 1 && onlyDigits(whatsapp).length >= 10 && description.trim().length > 5;

  return (
    <AeroSection title="Orçamentos" subtitle="Descreva o que precisa e envie para os prestadores da categoria." tag="Solicitar">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Nova solicitação</span>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Seu nome"
          className={aeroInput()}
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          inputMode="tel"
          maxLength={20}
          placeholder="Seu WhatsApp (com DDD)"
          className={aeroInput()}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={aeroInput()}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={800}
          rows={4}
          placeholder="Descreva o serviço que precisa (detalhes, prazo, local)…"
          className={aeroInput(false, "h-auto py-2.5 resize-none")}
        />

        <AeroButton
          onClick={() => createQuote.mutate()}
          disabled={!canSubmit || createQuote.isPending}
          className="flex items-center justify-center gap-2"
        >
          {createQuote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar solicitação
        </AeroButton>

        {matching.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Enviar para prestadores de {cleanCategory(category)}
            </p>
            <div className="space-y-1.5">
              {matching.map((p) => (
                <a
                  key={p.id}
                  href={waLink(p.whatsapp!, p.name, quoteMessage(p.name))}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                >
                  <WhatsappIcon className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span className="text-xs font-semibold text-foreground break-words">{p.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5 shadow-sm mt-3">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <History className="w-3.5 h-3.5" />
          <span>Histórico de solicitações</span>
        </div>

        {loadingHistory ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground">Você ainda não enviou nenhuma solicitação de orçamento.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-border/70 p-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{h.category}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-foreground break-words leading-snug">{h.description}</p>
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {h.status || "aberto"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AeroSection>
  );
}
