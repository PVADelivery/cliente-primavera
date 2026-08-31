import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, 
  MapPin, 
  Search, 
  Globe, 
  MessageCircle, 
  Star, 
  Clock, 
  Mail, 
  Navigation, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Sparkles,
  Briefcase,
  X
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/directory")({
  head: () => ({
    meta: [
      { title: "PPP — Painel Profissional Prestador de Serviços | MT 24horas express" },
      { name: "description", content: "Catálogo oficial de empresas, profissionais autônomos e prestadores de serviços da cidade no MT 24horas express." },
      { property: "og:title", content: "PPP — Painel Profissional Prestador de Serviços" },
      { property: "og:description", content: "Catálogo oficial de empresas, profissionais autônomos e prestadores de serviços da cidade no MT 24horas express." },
      { property: "og:image", content: "https://www.mt24horasexpress.com/pwa-512x512-v3.png" },
      { property: "og:image:secure_url", content: "https://www.mt24horasexpress.com/pwa-512x512-v3.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { name: "twitter:title", content: "PPP — Painel Profissional Prestador de Serviços" },
      { name: "twitter:description", content: "Catálogo oficial de empresas, profissionais autônomos e prestadores de serviços da cidade no MT 24horas express." },
      { name: "twitter:image", content: "https://www.mt24horasexpress.com/pwa-512x512-v3.png" },
    ],
  }),
  component: DirectoryPage,
});

type Business = {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  email?: string | null;
  website: string | null;
  hours: string | null;
  rating: number | null;
  featured?: boolean;
  card_image_url?: string | null;
  card_style?: string | null;
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const waLink = (v: string, name?: string) => {
  const d = onlyDigits(v);
  const clean = d.startsWith("55") ? d : `55${d}`;
  const text = encodeURIComponent(`Olá${name ? ` ${name}` : ""}, vi seu contato no PPP do MT 24horas express e gostaria de mais informações!`);
  return `https://wa.me/${clean}?text=${text}`;
};
const mapsLink = (addr: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

export function DirectoryPage() {
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tudo");

  const { data: businesses = [], isLoading } = useQuery<Business[]>({
    queryKey: ["directory"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("business_directory")
          .select("*")
          .order("name");
        if (error || !data) {
          console.warn("[PPP] Erro ao carregar diretório:", error?.message);
          return [];
        }
        return data as Business[];
      } catch (err) {
        return [];
      }
    },
    retry: 1,
  });

  const { data: dynamicCategories = [] } = useQuery<string[]>({
    queryKey: ["directory_categories"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      try {
        const { data, error } = await (supabase as any)
          .from("platform_settings")
          .select("value")
          .eq("key", "directory_categories")
          .maybeSingle();

        if (!data || !data.value) {
          return ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Automotivo", "Construção", "Serviços"];
        }
        return ["Tudo", ...(data.value as string[])];
      } catch (err) {
        return ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Automotivo", "Construção", "Serviços"];
      }
    },
    retry: 1,
  });

  // Categorias únicas com contagem
  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    businesses.forEach((b) => {
      const cat = b.category || "Geral";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });

    const set = new Set(["Tudo", ...dynamicCategories, ...Array.from(counts.keys())]);
    return Array.from(set).map((cat) => ({
      name: cat,
      count: cat === "Tudo" ? businesses.length : counts.get(cat) || 0,
    }));
  }, [businesses, dynamicCategories]);

  // Filtro
  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      const matchCat = selectedCat === "Tudo" || (b.category || "Geral").toLowerCase() === selectedCat.toLowerCase();
      const term = q.trim().toLowerCase();
      const matchQ =
        !term ||
        (b.name || "").toLowerCase().includes(term) ||
        (b.address || "").toLowerCase().includes(term) ||
        (b.category || "").toLowerCase().includes(term) ||
        (b.whatsapp || "").includes(term) ||
        (b.phone || "").includes(term);
      return matchCat && matchQ;
    });
  }, [businesses, q, selectedCat]);

  const featuredList = useMemo(() => {
    return businesses.filter((b) => b.featured);
  }, [businesses]);

  const handleShare = async (b: Business) => {
    const text = `Confira ${b.name} (${b.category}) no PPP — MT 24horas express!`;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: b.name, text, url });
      } catch (e) {
        // usuário cancelou
      }
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 selection:bg-amber-500/20">
      {/* ─── HERO BANNER PREMIUM ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-background border-b border-border/40 px-4 pt-7 pb-8 sm:px-6">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider mb-3.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PPP • Painel Profissional Prestador</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            Guia de Prestadores & <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">Serviços da Cidade</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            Encontre eletricistas, diaristas, oficinas, clínicas, autônomos e empresas locais com WhatsApp direto e localização rápida.
          </p>

          {/* ─── BUSCA EM TEMPO REAL ─── */}
          <div className="mt-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, profissão, serviço ou bairro..."
              className="w-full h-13 pl-12 pr-10 rounded-2xl bg-zinc-900/90 border border-zinc-700/70 text-white placeholder:text-zinc-500 text-sm sm:text-base font-medium shadow-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* ─── BARRA DE CATEGORIAS ROLÁVEL ─── */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {categoriesWithCounts.map((c) => {
            const isActive = selectedCat.toLowerCase() === c.name.toLowerCase();
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedCat(c.name)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? "bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20 scale-[1.02]"
                    : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <span>{c.name}</span>
                {c.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isActive ? "bg-zinc-950/20 text-zinc-950" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── DESTAQUES VIP (SE HOUVER) ─── */}
        {featuredList.length > 0 && selectedCat === "Tudo" && !q && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm tracking-wide uppercase">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>Destaques Recomendados</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredList.map((b) => (
                <BusinessCard key={b.id} business={b} onShare={handleShare} isVip />
              ))}
            </div>
          </div>
        )}

        {/* ─── LISTA PRINCIPAL DE PRESTADORES ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>
                {selectedCat === "Tudo" ? "Todos os Prestadores & Empresas" : `Categoria: ${selectedCat}`}
              </span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-48 rounded-2xl bg-card/60 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-border bg-card/40">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Nenhum prestador encontrado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                {q ? `Não encontramos resultados para "${q}".` : "Nenhum prestador cadastrado nesta categoria ainda."}
              </p>
              {(q || selectedCat !== "Tudo") && (
                <button
                  type="button"
                  onClick={() => { setQ(""); setSelectedCat("Tudo"); }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all"
                >
                  Limpar filtros de busca
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((b) => (
                  <BusinessCard key={b.id} business={b} onShare={handleShare} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CARD DE PRESTADOR ULTRA-PREMIUM ───
function BusinessCard({ 
  business: b, 
  onShare, 
  isVip = false 
}: { 
  business: Business; 
  onShare: (b: Business) => void;
  isVip?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isDark = b.card_style !== "light";

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard?.writeText(phone);
    setCopied(true);
    toast.success("Telefone copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        isVip
          ? "border-amber-500/50 bg-gradient-to-b from-amber-500/5 via-card to-card shadow-lg shadow-amber-500/5 hover:border-amber-400"
          : "border-border/80 bg-card hover:border-amber-400/50 hover:shadow-md"
      }`}
    >
      {/* ─── ARTE DO CARTÃO (SE CADASTRADA) ─── */}
      {b.card_image_url ? (
        <div className="w-full aspect-[1.78] bg-zinc-950 relative overflow-hidden border-b border-border/40">
          <img
            src={b.card_image_url}
            alt={b.name}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
          />
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-950/80 backdrop-blur-md text-amber-400 border border-amber-400/30">
              {b.category}
            </span>
          </div>
        </div>
      ) : (
        /* ─── CARTÃO ESTILIZADO AUTOMATICAMENTE ─── */
        <div
          className={`p-5 pb-4 border-b border-border/40 relative overflow-hidden ${
            isDark 
              ? "bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white" 
              : "bg-gradient-to-br from-slate-50 to-zinc-100 text-zinc-900"
          }`}
        >
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  {b.category}
                </span>
                {b.featured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    <Star className="w-3 h-3 fill-amber-400" /> VIP
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-lg sm:text-xl leading-tight truncate tracking-tight">
                {b.name}
              </h3>
            </div>
            
            {/* Ícone de Avatar com Inicial */}
            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
              {(b.name || "P").charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Horário de Funcionamento no Header */}
          {b.hours && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 relative z-10 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">{b.hours}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── CORPO COM INFORMAÇÕES LIMPAS ─── */}
      <div className="p-4 space-y-2.5 flex-1">
        {/* Nome quando tem foto do cartão */}
        {b.card_image_url && (
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-border/40">
            <h3 className="font-extrabold text-base leading-tight truncate text-foreground">
              {b.name}
            </h3>
            {b.hours && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" /> {b.hours}
              </span>
            )}
          </div>
        )}

        {/* Endereço */}
        {b.address && (
          <a
            href={mapsLink(b.address)}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors group/addr"
          >
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover/addr:scale-110 transition-transform" />
            <span className="line-clamp-2 leading-relaxed">{b.address}</span>
          </a>
        )}

        {/* Telefone / WhatsApp exibido em texto */}
        {(b.whatsapp || b.phone) && (
          <div className="flex items-center justify-between gap-2 pt-1 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span>{b.whatsapp || b.phone}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyPhone(b.whatsapp || b.phone || "")}
              title="Copiar número"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Site / Link */}
        {b.website && (
          <a
            href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-blue-400 hover:underline truncate"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{b.website.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
      </div>

      {/* ─── BOTÕES DE AÇÃO DIRETA ─── */}
      <div className="p-3 pt-0 grid grid-cols-[1fr_auto_auto] gap-2 items-center">
        {/* Botão de WhatsApp */}
        {b.whatsapp ? (
          <a
            href={waLink(b.whatsapp, b.name)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-md shadow-[#25D366]/20 active:scale-98 transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Falar no WhatsApp</span>
          </a>
        ) : b.phone ? (
          <a
            href={`tel:${onlyDigits(b.phone)}`}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-primary hover:brightness-110 text-primary-foreground font-bold text-xs shadow-md active:scale-98 transition-all"
          >
            <Phone className="w-4 h-4" />
            <span>Ligar Agora</span>
          </a>
        ) : (
          <div className="py-2.5 px-3 rounded-2xl bg-muted text-muted-foreground text-center text-xs font-semibold">
            Sem contato direto
          </div>
        )}

        {/* Botão Rota Google Maps */}
        {b.address && (
          <a
            href={mapsLink(b.address)}
            target="_blank"
            rel="noreferrer"
            title="Como Chegar"
            className="w-10 h-10 rounded-2xl border border-border bg-card hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors shadow-sm"
          >
            <Navigation className="w-4 h-4 text-amber-400" />
          </a>
        )}

        {/* Botão Compartilhar */}
        <button
          type="button"
          onClick={() => onShare(b)}
          title="Compartilhar"
          className="w-10 h-10 rounded-2xl border border-border bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shadow-sm"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}