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
import { ProviderCard } from "@/components/ppp/ProviderCard";
import { ProviderDetailDialog } from "@/components/ppp/ProviderDetailDialog";
import { ProviderRegisterDialog } from "@/components/ppp/ProviderRegisterDialog";
import { searchCityStreets } from "@/data/primaveraStreets";
import type { Business } from "@/lib/ppp";

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

export function DirectoryPage() {
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tudo");
  const [onlyWithWhatsapp, setOnlyWithWhatsapp] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [selected, setSelected] = useState<Business | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const openDetail = (b: Business) => {
    setSelected(b);
    setDetailOpen(true);
  };

  const { data: businesses = [], isLoading } = useQuery<Business[]>({
    queryKey: ["directory"],
    queryFn: async () => {
      let remoteList: Business[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await (supabase as any)
            .from("business_directory")
            .select("*")
            .eq("featured", true)
            .order("name");
          if (!error && data) {
            remoteList = data as Business[];
          }
        } catch {}
      }

      // Limpa cache local legado não aprovado
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("pva_local_directory_providers");
          sessionStorage.removeItem("pva_local_directory_providers");
        } catch {}
      }

      // Deduplicação estrita por ID e Nome+WhatsApp
      const uniqueMap = new Map<string, Business>();
      remoteList.forEach((b) => {
        const key = b.id || `${(b.name || "").toLowerCase().trim()}_${b.whatsapp || b.phone || ""}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, b);
        }
      });

      return Array.from(uniqueMap.values())
        .map((b) => {
          let lat = Number(b.latitude);
          let lng = Number(b.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) {
            if (b.address) {
              const matched = searchCityStreets(b.address, 1);
              if (matched.length > 0) {
                lat = matched[0].lat;
                lng = matched[0].lon;
              }
            }
          }
          return {
            ...b,
            latitude: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
            longitude: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
          };
        })
        .sort((a, b) => {
          // VIPs primeiro, depois por ordem alfabética
          if (Boolean(a.featured) && !b.featured) return -1;
          if (!a.featured && Boolean(b.featured)) return 1;
          return (a.name || "").localeCompare(b.name || "");
        });
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

  const categoryNames = useMemo(
    () => categoriesWithCounts.map((c) => c.name).filter((n) => n.toLowerCase() !== "tudo"),
    [categoriesWithCounts],
  );

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
                <ProviderCard key={b.id} business={b} onOpen={openDetail} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </AeroSection>

      {/* ─── CTA ANUNCIAR (ESTILO GETNINJA) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/95 to-amber-500/5 border border-border p-5 sm:p-6 shadow-sm">
        {/* Glows de acabamento */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5" />
              Para Profissionais & Empresas
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-tight">
              Você é prestador de serviços ou tem empresa em Primavera?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Anuncie no <strong>PPP — MT 24horas express</strong> e receba novos orçamentos e clientes qualificados direto no seu WhatsApp todos os dias.
            </p>
          </div>

          {/* Destaques de vantagens estilo GetNinja */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 pb-1">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/80 border border-border/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-foreground font-semibold text-[11px]">Clientes no WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/80 border border-border/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-foreground font-semibold text-[11px]">Destaque & Busca Rápida</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/80 border border-border/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-foreground font-semibold text-[11px]">Perfil Profissional Oficial</span>
            </div>
          </div>

          {/* Botões de Ação com hierarquia clara */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="w-full flex-1 tap-target inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-400/20 hover:brightness-105 active:scale-[0.98] transition-all border border-amber-300/50"
            >
              <PlusCircle className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
              <span>Cadastrar meu perfil agora</span>
            </button>

            <a
              href="https://wa.me/556697196937?text=Ol%C3%A1%2C%20gostaria%20de%20anunciar%20meus%20servi%C3%A7os%20no%20PPP%20do%20MT%2024horas%20express!"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto tap-target inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold bg-[#25D366]/10 hover:bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 active:scale-[0.98] transition-all"
            >
              <WhatsappIcon className="w-4 h-4 text-[#25D366]" />
              <span>Falar no WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      <ProviderDetailDialog business={selected} open={detailOpen} onOpenChange={setDetailOpen} />
      <ProviderRegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} categories={categoryNames} />
    </div>
  );
}
