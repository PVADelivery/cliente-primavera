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
  ShieldCheck, 
  Sparkles,
  Briefcase,
  X,
  SlidersHorizontal,
  PlusCircle,
  ExternalLink,
  Flame
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
const waLink = (v: string, name?: string) => {
  const d = onlyDigits(v);
  const clean = d.startsWith("55") ? d : `55${d}`;
  const text = encodeURIComponent(`Olá${name ? ` *${name}*` : ""}! Encontrei seu contato no *PPP do app MT 24horas express* e gostaria de solicitar um orçamento/informações.`);
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
        // usuário cancelou
      }
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28 selection:bg-amber-400 selection:text-black">
      {/* ─── LUXURY HERO HEADER ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-zinc-900 border-b border-white/10 px-4 pt-8 pb-10 sm:px-6">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[11px] font-black uppercase tracking-wider shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel Profissional Prestador</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Primavera do Leste — MT</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-none">
              Toda a Cidade <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
                Ao Seu Alcance.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 mt-2.5 max-w-2xl leading-relaxed">
              Consulte profissionais autônomos, clínicas, oficinas e estabelecimentos locais com WhatsApp direto e rota rápida.
            </p>
          </div>

          {/* ─── BARRA DE BUSCA INTELIGENTE ─── */}
          <div className="pt-2">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-amber-400 transition-colors" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por eletricista, mecânico, dentista, nome..."
                className="w-full h-14 pl-12 pr-11 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 text-white placeholder:text-zinc-500 text-sm sm:text-base font-medium shadow-2xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 transition-all"
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
          <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
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
                className="text-zinc-500 hover:text-white underline underline-offset-4 ml-auto"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* ─── CARROSSEL DE CATEGORIAS COM EMOJIS ─── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Categorias</span>
            <span className="text-xs text-zinc-500 font-mono">{categoriesWithCounts.length} categorias</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {categoriesWithCounts.map((c) => {
              const isActive = selectedCat.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedCat(c.name)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 scale-[1.03]"
                      : "bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 hover:bg-zinc-850"
                  }`}
                >
                  <span className="text-base">{c.icon}</span>
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

        {/* ─── DESTAQUES VIP CAROUSEL (SE HOUVER) ─── */}
        {featuredList.length > 0 && selectedCat === "Tudo" && !q && !onlyWithWhatsapp && (
          <div className="space-y-3.5 bg-gradient-to-r from-amber-500/10 via-zinc-900/80 to-amber-500/5 p-5 rounded-3xl border border-amber-500/20 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm tracking-wide uppercase">
                <Star className="w-4 h-4 fill-amber-400 animate-pulse" />
                <span>Profissionais em Destaque</span>
              </div>
              <span className="text-[11px] text-amber-400/80 font-bold bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                VIP
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredList.map((b) => (
                <BusinessCard key={`vip-${b.id}`} business={b} onShare={handleShare} isVip />
              ))}
            </div>
          </div>
        )}

        {/* ─── GRADE PRINCIPAL DE PRESTADORES ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-56 rounded-3xl bg-zinc-900/60 animate-pulse border border-zinc-800" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/40">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Nenhum resultado encontrado</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">
                {q
                  ? `Não encontramos nenhum prestador ou empresa para o termo "${q}".`
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
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-zinc-950 text-xs font-extrabold hover:brightness-110 transition-all shadow-md"
              >
                Limpar todos os filtros
              </button>
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

        {/* ─── BANNER CALL TO ACTION: ANUNCIE NO PPP ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/30 p-6 sm:p-8">
          <div className="max-w-xl space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Divulgue seus serviços</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              Você é prestador de serviços ou tem uma empresa em Primavera?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Receba contatos e pedidos de orçamentos diretamente no seu WhatsApp todos os dias anunciando no PPP.
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/5566999426656?text=Ol%C3%A1%2C%20gostaria%20de%20anunciar%20meus%20servi%C3%A7os%20no%20PPP%20do%20MT%2024horas%20express!"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-400/20 active:scale-98 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Cadastrar Minha Empresa / Serviço</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CARD DE PRESTADOR SUPER PREMIUM COM 3D FINISH ───
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
    toast.success("Telefone copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const initial = (b.name || "P").trim().charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        isVip
          ? "border-amber-400/60 bg-gradient-to-b from-amber-500/10 via-zinc-900 to-zinc-900 shadow-xl shadow-amber-500/5 hover:border-amber-400"
          : "border-zinc-800/90 bg-zinc-900/90 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-2xl"
      }`}
    >
      {/* ─── ARTE PERSONALIZADA DO CARTÃO (SE CADASTRADA) ─── */}
      {b.card_image_url ? (
        <div className="w-full aspect-[16/9] bg-black relative overflow-hidden border-b border-zinc-800">
          <img
            src={b.card_image_url}
            alt={b.name}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-amber-400 border border-amber-400/40 shadow-lg">
              {b.category}
            </span>
          </div>
          {b.featured && (
            <div className="absolute top-3 left-3 z-10">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black flex items-center gap-1 shadow-md">
                <Star className="w-3 h-3 fill-black" /> VIP
              </span>
            </div>
          )}
        </div>
      ) : (
        /* ─── CARTÃO ESTILIZADO OBSIDIAN & GOLD ─── */
        <div
          className={`p-5 pb-4 border-b border-zinc-800/80 relative overflow-hidden ${
            isDark 
              ? "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white" 
              : "bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-900"
          }`}
        >
          {/* Micro weave background pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  {b.category || "Serviços"}
                </span>
                {b.featured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                    <Star className="w-3 h-3 fill-amber-400" /> Destaque
                  </span>
                )}
                {b.rating != null && (
                  <span className="text-[11px] font-bold flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" /> {b.rating.toFixed(1)}
                  </span>
                )}
              </div>

              <h3 className="font-black text-lg sm:text-xl leading-tight truncate tracking-tight text-white">
                {b.name}
              </h3>
            </div>

            {/* Emblema Avatar Luxury */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 via-amber-400/10 to-transparent border border-amber-400/40 text-amber-400 flex items-center justify-center font-black text-xl shrink-0 shadow-inner">
              {initial}
            </div>
          </div>

          {/* Horário no header */}
          {b.hours && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2.5 relative z-10 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{b.hours}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── INFORMAÇÕES DE CONTATO E LOCALIZAÇÃO ─── */}
      <div className="p-4 space-y-2.5 flex-1 text-xs">
        {/* Título abaixo da imagem do cartão */}
        {b.card_image_url && (
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
            <h3 className="font-black text-base leading-tight truncate text-white">
              {b.name}
            </h3>
            {b.hours && (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-amber-400" /> {b.hours}
              </span>
            )}
          </div>
        )}

        {/* Endereço */}
        {b.address ? (
          <a
            href={mapsLink(b.address)}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 text-zinc-400 hover:text-amber-400 transition-colors group/addr"
          >
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover/addr:scale-110 transition-transform" />
            <span className="line-clamp-2 leading-relaxed">{b.address}</span>
          </a>
        ) : (
          <div className="flex items-center gap-2 text-zinc-500">
            <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span>Atende Primavera do Leste e Região</span>
          </div>
        )}

        {/* Telefone / WhatsApp com Cópia Rápida */}
        {(b.whatsapp || b.phone) && (
          <div className="flex items-center justify-between gap-2 pt-1 font-mono text-zinc-400">
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{b.whatsapp || b.phone}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopyPhone(b.whatsapp || b.phone || "")}
              title="Copiar número"
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Website Link */}
        {b.website && (
          <a
            href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:underline truncate"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{b.website.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
      </div>

      {/* ─── BOTÕES DE AÇÃO DIRETA ─── */}
      <div className="p-3.5 pt-0 grid grid-cols-[1fr_auto_auto] gap-2 items-center">
        {/* Botão de WhatsApp */}
        {b.whatsapp ? (
          <a
            href={waLink(b.whatsapp, b.name)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs sm:text-sm shadow-lg shadow-[#25D366]/20 active:scale-98 transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Falar no WhatsApp</span>
          </a>
        ) : b.phone ? (
          <a
            href={`tel:${onlyDigits(b.phone)}`}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs sm:text-sm shadow-md active:scale-98 transition-all"
          >
            <Phone className="w-4 h-4" />
            <span>Ligar Agora</span>
          </a>
        ) : (
          <div className="py-3 px-4 rounded-2xl bg-zinc-800 text-zinc-500 text-center text-xs font-semibold">
            Sem WhatsApp cadastrado
          </div>
        )}

        {/* Botão Rota Google Maps */}
        {b.address && (
          <a
            href={mapsLink(b.address)}
            target="_blank"
            rel="noreferrer"
            title="Como Chegar"
            className="w-11 h-11 rounded-2xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center transition-colors shadow-sm"
          >
            <Navigation className="w-4 h-4 text-amber-400" />
          </a>
        )}

        {/* Botão Compartilhar */}
        <button
          type="button"
          onClick={() => onShare(b)}
          title="Compartilhar no WhatsApp"
          className="w-11 h-11 rounded-2xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shadow-sm"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}