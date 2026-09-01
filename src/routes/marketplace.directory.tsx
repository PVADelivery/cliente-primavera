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
  Navigation, 
  Copy, 
  Check, 
  Share2, 
  Sparkles,
  Briefcase,
  X,
  PlusCircle,
  Flame,
  CheckCircle2
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

const CATEGORY_ICONS: Record<string, string> = {
  Tudo: "✨",
  Restaurante: "🍔",
  Hamburgueria: "🍟",
  Mercado: "🛒",
  Farmácia: "💊",
  Padaria: "🥖",
  "Pet Shop": "🐾",
  Beleza: "💇",
  Saúde: "🩺",
  DENTISTAS: "🦷",
  Dentistas: "🦷",
  Odontologia: "🦷",
  Automotivo: "🚗",
  Construção: "🛠️",
  Serviços: "⚡",
  Moda: "👗",
  Tecnologia: "💻",
  Advocacia: "⚖️",
  Imobiliária: "🏠",
  Geral: "🏢",
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const formatPhone = (v: string) => {
  const d = onlyDigits(v);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return v;
};

const waLink = (v: string, name?: string) => {
  const d = onlyDigits(v);
  const clean = d.startsWith("55") ? d : `55${d}`;
  const text = encodeURIComponent(`Olá${name ? ` *${name}*` : ""}! Encontrei seu contato no *PPP do app MT 24horas express* e gostaria de informações/orçamento.`);
  return `https://wa.me/${clean}?text=${text}`;
};

const mapsLink = (addr: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

export function DirectoryPage() {
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tudo");
  const [onlyWithWhatsapp, setOnlyWithWhatsapp] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);

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
          return ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Dentistas", "Automotivo", "Construção", "Serviços"];
        }
        return ["Tudo", ...(data.value as string[])];
      } catch (err) {
        return ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Dentistas", "Automotivo", "Construção", "Serviços"];
      }
    },
    retry: 1,
  });

  // Categorias com ícones e contagens
  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    businesses.forEach((b) => {
      const cat = b.category || "Geral";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });

    const set = new Set(["Tudo", ...dynamicCategories, ...Array.from(counts.keys())]);
    return Array.from(set).map((cat) => ({
      name: cat,
      icon: CATEGORY_ICONS[cat] || "💼",
      count: cat === "Tudo" ? businesses.length : counts.get(cat) || 0,
    }));
  }, [businesses, dynamicCategories]);

  // Filtros combinados
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
      const matchWa = !onlyWithWhatsapp || Boolean(b.whatsapp);
      const matchFeat = !onlyFeatured || Boolean(b.featured);
      return matchCat && matchQ && matchWa && matchFeat;
    });
  }, [businesses, q, selectedCat, onlyWithWhatsapp, onlyFeatured]);

  const featuredList = useMemo(() => {
    return businesses.filter((b) => b.featured);
  }, [businesses]);

  const handleShare = async (b: Business) => {
    const text = `Confira *${b.name}* (${b.category}) no PPP — MT 24horas express!`;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: b.name, text, url });
      } catch (e) {
        // cancelado pelo usuário
      }
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 selection:bg-amber-400 selection:text-black">
      {/* ─── HERO HEADER ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-zinc-900 border-b border-white/10 px-4 pt-7 pb-8 sm:px-6">
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

        <div className="max-w-2xl mx-auto relative z-10 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel Profissional Prestador</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Primavera do Leste — MT</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Toda a Cidade <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
                Ao Seu Alcance.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
              Consulte profissionais autônomos, clínicas, oficinas e estabelecimentos locais com WhatsApp direto e localização rápida.
            </p>
          </div>

          {/* ─── BUSCA EM TEMPO REAL ─── */}
          <div className="pt-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-amber-400 transition-colors" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por eletricista, mecânico, dentista, nome..."
                className="w-full h-13 pl-12 pr-11 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm font-medium shadow-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
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

          {/* ─── FILTROS RÁPIDOS (CHIPS) ─── */}
          <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
            <button
              type="button"
              onClick={() => setOnlyWithWhatsapp(!onlyWithWhatsapp)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                onlyWithWhatsapp
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Apenas com WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyFeatured(!onlyFeatured)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                onlyFeatured
                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Destaques VIP</span>
            </button>

            {(q || selectedCat !== "Tudo" || onlyWithWhatsapp || onlyFeatured) && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setSelectedCat("Tudo");
                  setOnlyWithWhatsapp(false);
                  setOnlyFeatured(false);
                }}
                className="text-zinc-500 hover:text-white underline underline-offset-4 ml-auto text-xs"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* ─── CARROSSEL DE CATEGORIAS COM EMOJIS ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Categorias</span>
            <span className="text-[11px] text-zinc-500 font-mono">{categoriesWithCounts.length} categorias</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {categoriesWithCounts.map((c) => {
              const isActive = selectedCat.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedCat(c.name)}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                      : "bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  <span className="text-sm">{c.icon}</span>
                  <span>{c.name}</span>
                  {c.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── DESTAQUES VIP (SE HOUVER) ─── */}
        {featuredList.length > 0 && selectedCat === "Tudo" && !q && !onlyWithWhatsapp && (
          <div className="space-y-2.5 bg-gradient-to-b from-amber-500/8 via-zinc-900 to-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-amber-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-[11px] tracking-wide uppercase">
                <Star className="w-3.5 h-3.5 fill-amber-400 animate-pulse" />
                <span>Destaques VIP</span>
              </div>
              <span className="text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                VIP
              </span>
            </div>
            <div className="space-y-2.5">
              {featuredList.map((b) => (
                <BusinessCard key={`vip-${b.id}`} business={b} onShare={handleShare} isVip />
              ))}
            </div>
          </div>
        )}

        {/* ─── LISTA PRINCIPAL (1 COLUNA VERTICAL: UM EMBAIXO DO OUTRO) ─── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
            <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>
                {selectedCat === "Tudo" ? "Todos os Prestadores & Empresas" : `Categoria: ${selectedCat}`}
              </span>
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 rounded-2xl bg-zinc-900/60 animate-pulse border border-zinc-800" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Nenhum resultado encontrado</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                {q
                  ? `Não encontramos nenhum prestador para "${q}".`
                  : "Nenhum profissional cadastrado com os filtros selecionados."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setSelectedCat("Tudo");
                  setOnlyWithWhatsapp(false);
                  setOnlyFeatured(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-zinc-950 text-xs font-black hover:brightness-110 transition-all"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            /* FEED VERTICAL: 1 COLUNA PERFEITA UM ABAIXO DO OUTRO */
            <div className="flex flex-col gap-2.5">
              <AnimatePresence mode="popLayout">
                {filtered.map((b) => (
                  <BusinessCard key={b.id} business={b} onShare={handleShare} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ─── BANNER CALL TO ACTION: ANUNCIE NO PPP ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/30 p-5 sm:p-7 shadow-xl">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Divulgue seus serviços</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
              Você é prestador de serviços ou tem empresa em Primavera?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Receba orçamentos e clientes no seu WhatsApp anunciando no PPP do MT 24horas express!
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/5566999426656?text=Ol%C3%A1%2C%20gostaria%20de%20anunciar%20meus%20servi%C3%A7os%20no%20PPP%20do%20MT%2024horas%20express!"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs shadow-lg shadow-amber-400/20 active:scale-98 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Quero Anunciar no PPP</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CARD COMPACTO E ELEGANTE ───
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

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard?.writeText(phone);
    setCopied(true);
    toast.success("Telefone copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const initial = (b.name || "P").trim().charAt(0).toUpperCase();
  const phoneDisplay = b.whatsapp || b.phone;

  // Card com imagem personalizada
  if (b.card_image_url) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        className={`w-full rounded-2xl border overflow-hidden bg-zinc-900/95 transition-all duration-200 ${
          isVip
            ? "border-amber-400/50 shadow-md shadow-amber-500/5 hover:border-amber-400"
            : "border-zinc-800/80 hover:border-zinc-700"
        }`}
      >
        <div className="w-full aspect-[2.8/1] bg-black relative overflow-hidden">
          <img
            src={b.card_image_url}
            alt={b.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-black/20 pointer-events-none" />
          <div className="absolute bottom-2 left-3 right-3 z-10 flex items-end justify-between">
            <div>
              <h3 className="font-black text-sm text-white drop-shadow-lg leading-tight">{b.name}</h3>
              <span className="text-[10px] text-zinc-300/90">{b.category || "Serviços"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {b.featured && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-400 text-black flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-black" /> VIP
                </span>
              )}
              {b.rating != null && (
                <span className="text-[10px] font-bold flex items-center gap-0.5 text-amber-400 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                  <Star className="w-2.5 h-2.5 fill-amber-400" /> {b.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Mini barra de ações */}
        <div className="px-3 py-2.5 flex items-center gap-2">
          {b.whatsapp ? (
            <a
              href={waLink(b.whatsapp, b.name)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-[11px] active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp</span>
            </a>
          ) : b.phone ? (
            <a
              href={`tel:${onlyDigits(b.phone)}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] active:scale-[0.98] transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Ligar</span>
            </a>
          ) : (
            <div className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-500 text-center text-[11px] font-semibold">
              Sem WhatsApp
            </div>
          )}
          {b.address && (
            <a
              href={mapsLink(b.address)}
              target="_blank"
              rel="noreferrer"
              className="h-8 w-8 rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onShare(b)}
            className="h-8 w-8 rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Card padrão compacto (sem imagem)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={`w-full rounded-2xl border overflow-hidden bg-zinc-900/95 transition-all duration-200 ${
        isVip
          ? "border-amber-400/50 shadow-md shadow-amber-500/5 hover:border-amber-400"
          : "border-zinc-800/80 hover:border-zinc-700"
      }`}
    >
      <div className="px-3.5 py-3 space-y-2.5">
        {/* ── Cabeçalho: Avatar + Info ── */}
        <div className="flex items-center gap-3">
          {/* Avatar compacto */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
            isVip
              ? "bg-gradient-to-br from-amber-400/25 to-amber-500/10 border border-amber-400/40 text-amber-400"
              : "bg-gradient-to-br from-zinc-800 to-zinc-800/60 border border-zinc-700/80 text-zinc-300"
          }`}>
            {initial}
          </div>

          {/* Nome e meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-sm text-white truncate leading-tight">{b.name}</h3>
              {b.featured && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/20">
                  <Star className="w-2.5 h-2.5 fill-amber-400" /> VIP
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                {b.category || "Serviços"}
              </span>
              {b.rating != null && (
                <span className="text-[10px] font-bold flex items-center gap-0.5 text-amber-400">
                  <Star className="w-2.5 h-2.5 fill-amber-400" /> {b.rating.toFixed(1)}
                </span>
              )}
              {b.hours && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-1 truncate">
                  <Clock className="w-2.5 h-2.5" /> {b.hours}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Info compacta ── */}
        <div className="space-y-1.5 text-[11px]">
          {/* Endereço */}
          {b.address ? (
            <a
              href={mapsLink(b.address)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition-colors"
            >
              <MapPin className="w-3 h-3 text-amber-400/70 shrink-0" />
              <span className="truncate">{b.address}</span>
            </a>
          ) : (
            <div className="flex items-center gap-1.5 text-zinc-500">
              <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
              <span>Atende Primavera do Leste e Região</span>
            </div>
          )}

          {/* Telefone inline */}
          {phoneDisplay && (
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Phone className="w-3 h-3 text-emerald-400/80 shrink-0" />
              <span className="font-mono font-semibold">{formatPhone(phoneDisplay)}</span>
              <button
                type="button"
                onClick={() => handleCopyPhone(phoneDisplay)}
                className="ml-auto text-zinc-500 hover:text-white transition-colors p-0.5"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Website */}
          {b.website && (
            <a
              href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-blue-400 hover:underline truncate"
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{b.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>

        {/* ── Barra de ações compacta ── */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {b.whatsapp ? (
            <a
              href={waLink(b.whatsapp, b.name)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-[11px] shadow-sm shadow-[#25D366]/15 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Chamar no WhatsApp</span>
            </a>
          ) : b.phone ? (
            <a
              href={`tel:${onlyDigits(b.phone)}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] active:scale-[0.98] transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Ligar Agora</span>
            </a>
          ) : (
            <div className="flex-1 py-2 rounded-xl bg-zinc-800/80 text-zinc-500 text-center text-[11px] font-semibold">
              Sem WhatsApp cadastrado
            </div>
          )}

          {b.address && (
            <a
              href={mapsLink(b.address)}
              target="_blank"
              rel="noreferrer"
              title="Rota"
              className="h-8 w-8 rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onShare(b)}
            title="Compartilhar"
            className="h-8 w-8 rounded-xl border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}