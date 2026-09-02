import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  MapPin,
  Search,
  Globe,
  Star,
  Clock,
  Navigation,
  Copy,
  Check,
  Share2,
  Briefcase,
  X,
  PlusCircle,
  Flame,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { AeroHero, AeroPlate, AeroSection, AeroButton, AeroEmptyState, AeroSkeletonList } from "@/components/aero";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";

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
const formatPhone = (v: string) => {
  const d = onlyDigits(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
};

const waLink = (v: string, name?: string) => {
  const d = onlyDigits(v);
  const clean = d.startsWith("55") ? d : `55${d}`;
  const text = encodeURIComponent(`Olá${name ? ` *${name}*` : ""}! Encontrei seu contato no *PPP do app MT 24horas express* e gostaria de informações/orçamento.`);
  return `https://wa.me/${clean}?text=${text}`;
};

const getMapsUrl = (addr: string) => {
  const cleanAddr = addr.trim();
  const full = cleanAddr.toLowerCase().includes("primavera")
    ? cleanAddr
    : `${cleanAddr}, Primavera do Leste - MT`;
  return `https://maps.google.com/?q=${encodeURIComponent(full)}`;
};

const handleOpenMaps = (addr: string, e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const url = getMapsUrl(addr);
  if (typeof window !== "undefined") {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      window.location.href = url;
    }
  }
};

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
        if (error || !data) return [];
        return data as Business[];
      } catch {
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
        const { data } = await (supabase as any)
          .from("platform_settings")
          .select("value")
          .eq("key", "directory_categories")
          .maybeSingle();

        if (!data || !data.value) {
          return ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Dentistas", "Automotivo", "Construção", "Serviços"];
        }
        return ["Tudo", ...(data.value as string[])];
      } catch {
        return ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Dentistas", "Automotivo", "Construção", "Serviços"];
      }
    },
    retry: 1,
  });

  const categoriesWithCounts = useMemo(() => {
    const cleanCat = (str: string) => 
      (str || "").replace(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, "").trim().toLowerCase();

    const counts = new Map<string, number>();
    businesses.forEach((b) => {
      const cat = b.category || "Geral";
      const clean = cleanCat(cat);
      counts.set(clean, (counts.get(clean) || 0) + 1);
    });

    const seenClean = new Set<string>();
    seenClean.add("tudo");

    const dynamicList: string[] = [];

    dynamicCategories.forEach((cat) => {
      const clean = cleanCat(cat);
      if (!seenClean.has(clean)) {
        seenClean.add(clean);
        dynamicList.push(cat);
      }
    });

    businesses.forEach((b) => {
      const cat = b.category || "Geral";
      const clean = cleanCat(cat);
      if (!seenClean.has(clean)) {
        seenClean.add(clean);
        dynamicList.push(cat);
      }
    });

    // Ordenação estritamente alfabética ignorando emojis
    dynamicList.sort((a, b) => {
      const aClean = cleanCat(a);
      const bClean = cleanCat(b);
      return aClean.localeCompare(bClean, "pt-BR", { sensitivity: "base" });
    });

    const finalList = ["Tudo", ...dynamicList];

    return finalList.map((cat) => {
      const clean = cleanCat(cat);
      return {
        name: cat,
        count: cat === "Tudo" ? businesses.length : counts.get(clean) || 0,
      };
    });
  }, [businesses, dynamicCategories]);

  const filtered = useMemo(() => {
    const cleanCat = (str: string) => 
      (str || "").replace(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, "").trim().toLowerCase();

    return businesses.filter((b) => {
      const catClean = cleanCat(b.category || "Geral");
      const selClean = cleanCat(selectedCat);
      const matchCat =
        selectedCat === "Tudo" ||
        selClean === "tudo" ||
        catClean === selClean ||
        (b.category || "Geral").toLowerCase() === selectedCat.toLowerCase();
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

  const featuredList = useMemo(() => businesses.filter((b) => b.featured), [businesses]);

  const handleShare = async (b: Business) => {
    const text = `Confira *${b.name}* (${b.category}) no PPP — MT 24horas express!`;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: b.name, text, url }); } catch {}
    } else {
      navigator.clipboard?.writeText(`${text}\n${url}`);
      toast.success("Link copiado!");
    }
  };

  const clearFilters = () => {
    setQ("");
    setSelectedCat("Tudo");
    setOnlyWithWhatsapp(false);
    setOnlyFeatured(false);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* ─── HERO ─── */}
      <AeroHero
        eyebrow="Painel Profissional Prestador"
        title={<>Toda a Cidade<br />Ao Seu Alcance.</>}
        subtitle="Consulte profissionais autônomos, clínicas, oficinas e estabelecimentos locais com WhatsApp direto e localização rápida."
      >
        {/* Busca */}
        <div className="relative mt-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, categoria..."
            className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 text-sm font-medium focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all backdrop-blur-sm"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <button
            type="button"
            onClick={() => setOnlyWithWhatsapp(!onlyWithWhatsapp)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
              onlyWithWhatsapp
                ? "bg-[#25D366] text-white border-[#20bd5a] shadow-sm"
                : "bg-white/10 border-white/15 text-white/70 hover:text-white"
            }`}
          >
            <WhatsappIcon className={`w-3.5 h-3.5 ${onlyWithWhatsapp ? "text-white" : "text-[#25D366]"}`} />
            <span>Com WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyFeatured(!onlyFeatured)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
              onlyFeatured
                ? "bg-primary text-black border-primary"
                : "bg-white/10 border-white/15 text-white/70 hover:text-white"
            }`}
          >
            <Star className="w-3 h-3" />
            <span>Destaques VIP</span>
          </button>
        </div>
      </AeroHero>

      {/* ─── CATEGORIAS ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Categorias</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
          {categoriesWithCounts.map((c) => {
            const isActive = selectedCat.toLowerCase() === c.name.toLowerCase();
            return (
              <AeroPlate
                key={c.name}
                active={isActive}
                onClick={() => setSelectedCat(c.name)}
              >
                {c.name}
              </AeroPlate>
            );
          })}
        </div>
      </div>

      {/* ─── DESTAQUES VIP ─── */}
      {featuredList.length > 0 && selectedCat === "Tudo" && !q && !onlyWithWhatsapp && (
        <div className="rounded-3xl bg-primary/8 border border-primary/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold-ink font-black text-xs tracking-wide uppercase">
              <Star className="w-3.5 h-3.5 text-primary" />
              <span>Destaques VIP</span>
            </div>
            <span className="text-[9px] font-bold bg-primary/15 text-gold-ink px-2 py-0.5 rounded-full border border-primary/25">
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

      {/* ─── LISTA PRINCIPAL ─── */}
      <AeroSection
        title={selectedCat === "Tudo" ? "Todos os Prestadores" : selectedCat}
        tag={`${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`}
        action={
          (q || selectedCat !== "Tudo" || onlyWithWhatsapp || onlyFeatured) ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Limpar filtros
            </button>
          ) : undefined
        }
      >
        {isLoading ? (
          <AeroSkeletonList count={3} lines={2} />
        ) : filtered.length === 0 ? (
          <AeroEmptyState
            icon={Search}
            title="Nenhum resultado"
            description={
              q
                ? `Não encontramos nenhum prestador para "${q}".`
                : "Nenhum profissional cadastrado com os filtros selecionados."
            }
            action={
              <AeroButton onClick={clearFilters}>
                Limpar filtros
              </AeroButton>
            }
          />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.map((b) => (
                <BusinessCard key={b.id} business={b} onShare={handleShare} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </AeroSection>

      {/* ─── CTA ANUNCIAR ─── */}
      <div className="rounded-3xl bg-card border border-border p-5 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Divulgue seus serviços</span>
        </div>
        <h3 className="text-base font-black text-foreground leading-tight">
          Você é prestador de serviços ou tem empresa em Primavera?
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Receba orçamentos e clientes no seu WhatsApp anunciando no PPP do MT 24horas express!
        </p>
        <a
          href="https://wa.me/556697196937?text=Ol%C3%A1%2C%20gostaria%20de%20anunciar%20meus%20servi%C3%A7os%20no%20PPP%20do%20MT%2024horas%20express!"
          target="_blank"
          rel="noreferrer"
        >
          <AeroButton className="mt-1 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold border-0 shadow-md flex items-center justify-center gap-2">
            <WhatsappIcon className="w-4 h-4" />
            Quero Anunciar no PPP
          </AeroButton>
        </a>
      </div>
    </div>
  );
}

// ─── CARD DE PRESTADOR ───
function BusinessCard({
  business: b,
  onShare,
  isVip = false,
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={`rounded-2xl border bg-card overflow-hidden transition-all ${
        isVip
          ? "border-primary/30 shadow-[var(--shadow-card)]"
          : "border-border shadow-sm"
      }`}
    >
      {/* Imagem personalizada */}
      {b.card_image_url && (
        <div className="w-full aspect-[3/1] bg-muted relative overflow-hidden">
          <img src={b.card_image_url} alt={b.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <div>
              <h3 className="font-black text-sm text-white drop-shadow leading-tight">{b.name}</h3>
              <span className="text-[10px] text-white/80">{b.category || "Serviços"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {b.featured && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-primary text-black flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" /> VIP
                </span>
              )}
              {b.rating != null && (
                <span className="text-[10px] font-bold flex items-center gap-0.5 text-primary bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                  <Star className="w-2.5 h-2.5" /> {b.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 py-2.5 space-y-2">
        {/* Cabeçalho */}
        {!b.card_image_url && (
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${
              isVip
                ? "bg-primary/15 border border-primary/40 text-gold-ink"
                : "bg-gradient-to-br from-muted to-muted/60 border border-border text-foreground/70"
            }`}>
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-[13px] text-foreground truncate leading-tight">{b.name}</h3>
                {b.featured && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-black bg-primary px-1.5 py-px rounded-full shadow-sm">
                    <Star className="w-2.5 h-2.5 fill-black" /> VIP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 px-1.5 py-px rounded-md">
                  {b.category || "Serviços"}
                </span>
                {b.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-gold-ink">
                    <Star className="w-3 h-3 text-primary fill-primary" /> {b.rating.toFixed(1)}
                  </span>
                )}
                {b.hours && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                    <Clock className="w-2.5 h-2.5" /> {b.hours}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="space-y-1 text-[11px]">
          {b.address ? (
            <a
              href={getMapsUrl(b.address)}
              onClick={(e) => handleOpenMaps(b.address, e)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
              title="Abrir no Google Maps"
            >
              <MapPin className="w-3 h-3 text-primary shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate underline-offset-2 group-hover:underline">{b.address}</span>
            </a>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>Atende Primavera do Leste e Região</span>
            </div>
          )}

          {phoneDisplay && (
            <div className="flex items-center gap-1.5 text-foreground">
              {b.whatsapp ? (
                <WhatsappIcon className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
              ) : (
                <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className="font-mono font-semibold tracking-tight">{formatPhone(phoneDisplay)}</span>
              <button
                type="button"
                onClick={() => handleCopyPhone(phoneDisplay)}
                aria-label="Copiar telefone"
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#25D366]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}

          {b.website && (
            <a
              href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline truncate"
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{b.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {b.whatsapp ? (
            <a
              href={waLink(b.whatsapp, b.name)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-[#25D366] hover:bg-[#1fb457] text-white font-bold text-[11px] active:scale-[0.97] transition-all shadow-[0_2px_10px_-2px_rgba(37,211,102,0.5)]"
            >
              <WhatsappIcon className="w-4 h-4" />
              <span>Chamar no WhatsApp</span>
            </a>
          ) : b.phone ? (
            <a
              href={`tel:${onlyDigits(b.phone)}`}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-black font-bold text-[11px] active:scale-[0.97] transition-all shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Ligar Agora</span>
            </a>
          ) : (
            <div className="flex-1 h-9 rounded-xl bg-muted/70 text-muted-foreground flex items-center justify-center gap-1.5 text-[10px] font-semibold">
              <WhatsappIcon className="w-3.5 h-3.5 opacity-30 text-muted-foreground" />
              <span>Sem WhatsApp cadastrado</span>
            </div>
          )}

          {b.address && (
            <a
              href={getMapsUrl(b.address)}
              onClick={(e) => handleOpenMaps(b.address, e)}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir rota no Google Maps"
              aria-label="Abrir rota no Google Maps"
              className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-primary" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onShare(b)}
            title="Compartilhar"
            aria-label="Compartilhar prestador"
            className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}