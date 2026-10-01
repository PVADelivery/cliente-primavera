import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Search, Ruler, BedDouble, Bath, Car, ChevronRight, ChevronLeft, ArrowUpDown, X, Heart, MapPin, Home, Plus, UploadCloud, Loader2, Sparkles, CalendarClock, DollarSign, Building2, User, Phone, FileText, CheckCircle2, ShieldCheck, Tag, Info, Layers, Camera, Trash2, Check, Compass, SlidersHorizontal } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Property, PropertyType, PropertyDeal } from "@/types/database";
import { formatPrice } from "@/lib/property";
import { usePropertyFavorites } from "@/hooks/usePropertyFavorites";
import { AeroPageHeader, AeroSkeletonList, AeroEmptyState } from "@/components/aero";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/business/")({
  head: () => ({
    meta: [
      { title: "Central de Negócios — Imóveis de Alto Padrão e Locação" },
      { name: "description", content: "Casas, apartamentos, salas comerciais para locação e venda, carros, motos, caminhões e utilitários em Primavera do Leste, MT." },
      { property: "og:title", content: "Central de Negócios — Imóveis, Carros e Motos" },
      { property: "og:description", content: "Casas, apartamentos, kitnets, salas, terrenos, carros, motos e caminhões na sua cidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessPage,
});

const DEALS: Array<{ key: "all" | "locacao" | "venda"; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "locacao", label: "Locação" },
  { key: "venda", label: "Venda" },
];

const TYPES: Array<{ key: PropertyType | "all"; label: string }> = [
  { key: "all", label: "Todos os tipos" },
  { key: "casa", label: "Casa" },
  { key: "apartamento", label: "Apartamento" },
  { key: "sala", label: "Sala" },
  { key: "kitnet", label: "Kitnet" },
  { key: "terreno", label: "Terreno" },
];

const TYPE_ICONS: Record<PropertyType | "all", any> = {
  all: Layers,
  casa: Home,
  apartamento: Building2,
  sala: Building2,
  kitnet: Sparkles,
  terreno: Compass,
};

const TYPE_LABEL: Record<PropertyType, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  sala: "Sala",
  kitnet: "Kitnet",
  terreno: "Terreno",
};

type SortKey = "price_asc" | "price_desc" | "recent";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "price_asc", label: "Menor valor" },
  { key: "price_desc", label: "Maior valor" },
  { key: "recent", label: "Atualizados recentemente" },
];

const PAGE_SIZE = 8;

function BusinessPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deal, setDeal] = useState<"all" | "locacao" | "venda">("all");
  const [type, setType] = useState<PropertyType | "all">("all");
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");
  const [neighborhood, setNeighborhood] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("price_asc");
  const [page, setPage] = useState(1);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { favorites, isFavorite, toggleFavorite, hydrated } = usePropertyFavorites();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_active", true)
        .limit(200);
      if (error) {
        console.info("[properties]", error.code, error.message);
        return [];
      }
      return (data ?? []) as Property[];
    },
  });

  const cities = useMemo(
    () => Array.from(new Set(properties.map((p) => p.city).filter(Boolean) as string[])).sort(),
    [properties]
  );

  const neighborhoods = useMemo(
    () =>
      Array.from(
        new Set(
          properties
            .filter((p) => (city === "all" ? true : p.city === city))
            .map((p) => p.neighborhood)
            .filter(Boolean) as string[]
        )
      ).sort(),
    [properties, city]
  );

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return properties
      .filter((p) => (onlyFavorites ? favorites.includes(p.id) : true))
      .filter((p) => (deal === "all" ? true : p.deal_type === deal))
      .filter((p) => (type === "all" ? true : p.property_type === type))
      .filter((p) => (city === "all" ? true : p.city === city))
      .filter((p) => (neighborhood === "all" ? true : p.neighborhood === neighborhood))
      .filter((p) =>
        term
          ? `${p.neighborhood ?? ""} ${p.city ?? ""} ${p.description ?? ""}`.toLowerCase().includes(term)
          : true
      )
      .sort((a, b) => {
        if (sort === "recent") {
          const ad = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
          const bd = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
          return bd - ad;
        }
        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return sort === "price_desc" ? b.price - a.price : a.price - b.price;
      });
  }, [properties, deal, type, q, city, neighborhood, sort, onlyFavorites, favorites]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (deal !== "all")
    activeChips.push({
      key: "deal",
      label: deal === "venda" ? "Venda" : "Locação",
      clear: () => setDeal("all"),
    });
  if (type !== "all")
    activeChips.push({ key: "type", label: TYPE_LABEL[type], clear: () => setType("all") });
  if (city !== "all") activeChips.push({ key: "city", label: city, clear: () => setCity("all") });
  if (neighborhood !== "all")
    activeChips.push({ key: "hood", label: neighborhood, clear: () => setNeighborhood("all") });
  if (q.trim()) activeChips.push({ key: "q", label: `"${q.trim()}"`, clear: () => setQ("") });
  if (onlyFavorites)
    activeChips.push({ key: "fav", label: "Favoritos", clear: () => setOnlyFavorites(false) });

  const clearAll = () => {
    setDeal("all");
    setType("all");
    setCity("all");
    setNeighborhood("all");
    setQ("");
    setOnlyFavorites(false);
  };

  const pageItems = useMemo(
    () => list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [list, page]
  );

  useEffect(() => {
    setPage(1);
  }, [deal, type, q, city, neighborhood, sort, onlyFavorites]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (city !== "all" && !neighborhoods.includes(neighborhood)) setNeighborhood("all");
  }, [city, neighborhoods, neighborhood]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── LUXURY HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-zinc-900 to-black p-5 sm:p-7 text-white shadow-2xl border border-white/10">
        {/* Glow ambient effects */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Top navigation row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: "/marketplace" })}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold backdrop-blur-md transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {properties.length} Anúncios Ativos
            </span>
          </div>

          {/* Title & subtitle */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-sm">
                CENTRAL DE NEGÓCIOS
              </span>
              <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Imóveis & Oportunidades
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white font-display">
              Imóveis em Primavera do Leste
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl font-medium leading-relaxed">
              Casas, apartamentos, salas comerciais e kitnets para locação e venda com negociação direta no WhatsApp.
            </p>
          </div>

          {/* Luxury Switcher Tab: Imóveis vs Veículos */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all">
              <Building2 className="w-4 h-4 text-slate-950" />
              <span>Imóveis & Locação</span>
            </div>
            <Link
              to="/marketplace/business/vehicles"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 font-bold text-xs sm:text-sm transition-all active:scale-98"
            >
              <Car className="w-4 h-4 text-zinc-400" />
              <span>Carros, Motos & Cargas</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="relative group">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-amber-500 transition-colors pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por bairro, condomínio ou palavra-chave..."
          className="w-full h-12 pl-11 pr-10 rounded-2xl bg-card border border-border/80 text-sm font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── MODALIDADE (DEAL) PILLS ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 py-0.5">
        {DEALS.map((d) => {
          const isSelected = deal === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setDeal(d.key)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border shadow-sm ${
                isSelected
                  ? d.key === "venda"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-500 shadow-amber-500/25 scale-[1.02]"
                    : d.key === "locacao"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-emerald-500/25 scale-[1.02]"
                    : "bg-primary text-slate-950 border-primary shadow-primary/25 scale-[1.02]"
                  : "bg-card text-muted-foreground border-border/70 hover:bg-muted/80 hover:text-foreground hover:border-border"
              }`}
            >
              {d.key === "locacao" && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              {d.key === "venda" && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              <span>{d.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setOnlyFavorites((v) => !v)}
          className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border shadow-sm ${
            onlyFavorites
              ? "bg-rose-500 text-white border-rose-500 shadow-rose-500/25 scale-[1.02]"
              : "bg-card text-muted-foreground border-border/70 hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-white text-white" : "text-rose-500"}`} />
          <span>Favoritos</span>
          {hydrated && favorites.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${onlyFavorites ? "bg-white text-rose-600" : "bg-rose-500/15 text-rose-500 font-black"}`}>
              {favorites.length}
            </span>
          )}
        </button>
      </div>

      {/* ── PROPERTY TYPES WITH RICH ICONS ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 py-0.5">
        {TYPES.map((t) => {
          const isSelected = type === t.key;
          const Icon = TYPE_ICONS[t.key] || Building2;
          return (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md scale-[1.02]"
                  : "bg-card text-muted-foreground border-border/70 hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400 dark:text-amber-600" : "text-muted-foreground"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CITY, NEIGHBORHOOD & SORT FILTERS (SLEEK CARDS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-11 pl-9 pr-6 rounded-2xl bg-card border border-border/70 text-xs font-bold text-foreground outline-none focus:border-amber-500 appearance-none shadow-sm cursor-pointer"
          >
            <option value="all">Todas as Cidades</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative">
          <Building2 className="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="w-full h-11 pl-9 pr-6 rounded-2xl bg-card border border-border/70 text-xs font-bold text-foreground outline-none focus:border-emerald-500 appearance-none shadow-sm cursor-pointer"
          >
            <option value="all">Todos os Bairros</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="relative col-span-2 sm:col-span-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-full h-11 pl-9 pr-6 rounded-2xl bg-card border border-border/70 text-xs font-bold text-foreground outline-none focus:border-primary appearance-none shadow-sm cursor-pointer"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground rotate-90 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold"
              aria-label={`Remover filtro ${chip.label}`}
            >
              {chip.label}
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/60 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* Header com Contagem de Imóveis */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {list.length} {list.length === 1 ? "imóvel disponível" : "imóveis disponíveis"}
        </p>
      </div>

      {isLoading ? (
        <AeroSkeletonList count={3} lines={4} label="Carregando imóveis" />
      ) : list.length === 0 ? (
        <AeroEmptyState
          title={onlyFavorites ? "Nenhum favorito ainda" : "Nenhum imóvel encontrado"}
          description={
            onlyFavorites
              ? "Toque no coração de um imóvel para salvá-lo na sua lista de interesse."
              : "Ajuste os filtros ou tente outro bairro."
          }
        />
      ) : (
        <>
          <ul className="space-y-5">
            {pageItems.map((p) => {
              const waNumber = p.contact_phone ? p.contact_phone.replace(/\D/g, "") : "";
              const fullWa = waNumber ? (waNumber.startsWith("55") ? waNumber : `55${waNumber}`) : "";
              const waText = encodeURIComponent(
                `Olá! Tenho interesse no imóvel *${TYPE_LABEL[p.property_type] ?? p.property_type}* (${p.deal_type === "venda" ? "Venda" : "Locação"}) no bairro *${p.neighborhood ?? "Primavera do Leste"}* anunciado na Central de Negócios do MT 24horas express.`
              );

              return (
                <li key={p.id} className="relative group">
                  <div className="overflow-hidden rounded-3xl border border-border/70 bg-card hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col">
                    {/* Media / Carousel */}
                    <PropertyImageCarousel
                      images={p.images}
                      propertyId={p.id}
                      dealType={p.deal_type}
                      propertyType={p.property_type}
                      isFav={isFavorite(p.id)}
                      onToggleFav={() => toggleFavorite(p.id)}
                    />

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        {/* Title & Location */}
                        <Link
                          to="/marketplace/business/$propertyId"
                          params={{ propertyId: p.id }}
                          className="block group/title"
                        >
                          <div className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{p.neighborhood ?? "Primavera do Leste"}, {p.city || "MT"}</span>
                          </div>
                          <h2 className="font-display font-black text-lg sm:text-xl text-foreground group-hover/title:text-primary transition-colors leading-tight mt-1">
                            {TYPE_LABEL[p.property_type] ?? p.property_type} em {p.neighborhood ?? "Primavera do Leste"}
                          </h2>
                        </Link>

                        {/* Description */}
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                            {p.description}
                          </p>
                        )}

                        {/* Property attributes strip */}
                        <PropertyAttrs property={p} />
                      </div>

                      {/* Bottom Pricing & WhatsApp CTA */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                            {p.deal_type === "locacao" ? "Aluguel Mensal" : "Valor de Venda"}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-display font-black text-2xl text-foreground tracking-tight">
                              {formatPrice(p.price)}
                            </span>
                            {p.deal_type === "locacao" && (
                              <span className="text-xs font-semibold text-muted-foreground">/mês</span>
                            )}
                          </div>
                        </div>

                        {fullWa ? (
                          <a
                            href={`https://wa.me/${fullWa}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-black tracking-wide shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                          >
                            <WhatsappIcon className="w-4 h-4 shrink-0" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <Link
                            to="/marketplace/business/$propertyId"
                            params={{ propertyId: p.id }}
                            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition-all"
                          >
                            <span>Ver Detalhes</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>

                      {p.contact_phone && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                          <span className="font-semibold text-foreground/80 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Anunciante Verificado
                          </span>
                          <span className="font-mono text-muted-foreground font-semibold">
                            {p.contact_phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setPage((v) => Math.max(1, v - 1))}
                disabled={page === 1}
                className="px-4 h-11 rounded-2xl border border-border/70 bg-card text-xs font-bold disabled:opacity-40 hover:bg-muted transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                disabled={page === totalPages}
                className="px-4 h-11 rounded-2xl border border-border/70 bg-card text-xs font-bold disabled:opacity-40 hover:bg-muted transition-colors"
              >
                Próxima
              </button>
            </div>
          )}

          {/* Botão Flutuante de Alto Padrão: Anunciar Imóvel */}
          <button
            onClick={() => (user ? setShowForm(true) : navigate({ to: "/login" }))}
            className="fixed bottom-24 right-5 z-40 h-13 pl-4 pr-6 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm flex items-center gap-2.5 shadow-2xl shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all border border-amber-300/40"
          >
            <div className="w-6 h-6 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span>Anunciar Imóvel</span>
          </button>

          {showForm && (
            <NewPropertySheet
              onClose={() => setShowForm(false)}
              onCreated={() => {
                setShowForm(false);
                queryClient.invalidateQueries({ queryKey: ["properties"] });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

const MONTHS_OPTIONS = [
  { months: 1, label: "1 Mês" },
  { months: 2, label: "2 Meses" },
  { months: 3, label: "3 Meses" },
  { months: 6, label: "6 Meses" },
  { months: 12, label: "1 Ano" },
];

function NewPropertySheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [dealType, setDealType] = useState<PropertyDeal>("locacao");
  const [propertyType, setPropertyType] = useState<PropertyType>("casa");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Primavera do Leste");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");
  const [parking, setParking] = useState("1");
  const [totalArea, setTotalArea] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [planMonths, setPlanMonths] = useState<number>(1);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatação de telefone / WhatsApp com máscara e pontuação correta
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

  // Formatação de Moeda com pontuação correta (R$ 0,00)
  const handlePriceChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setPrice("");
      return;
    }
    const num = Number(digits) / 100;
    setPrice(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const bucketName = "avatars";
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `prop_${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${ext}`;
        const filePath = user?.id ? `${user.id}/${fileName}` : fileName;

        const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || undefined,
        });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        if (urlData?.publicUrl) uploaded.push(urlData.publicUrl);
      }
      setImages((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} foto(s) adicionada(s)!`);
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + (err.message || "Tente novamente"));
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!user) return;
    if (!neighborhood.trim()) {
      setError("Por favor, informe o bairro onde o imóvel está localizado.");
      return;
    }
    if (!contact.trim()) {
      setError("Por favor, informe o seu telefone ou WhatsApp de contato.");
      return;
    }
    setSaving(true);
    setError(null);

    const cleanPrice = price ? Number(price.replace(/\./g, "").replace(",", ".")) : null;

    const { data: insertedProp, error: err } = await supabase
      .from("properties")
      .insert({
        owner_id: user.id,
        deal_type: dealType,
        property_type: propertyType,
        neighborhood: neighborhood.trim(),
        city: city.trim() || "Primavera do Leste",
        state: "MT",
        price: cleanPrice,
        bedrooms: bedrooms ? Number(bedrooms.replace(/\D/g, "")) : null,
        bathrooms: bathrooms ? Number(bathrooms.replace(/\D/g, "")) : null,
        parking: parking ? Number(parking.replace(/\D/g, "")) : null,
        total_area: totalArea ? Number(totalArea.replace(/\D/g, "")) : null,
        agency_name: agencyName.trim() || null,
        contact_phone: contact.trim() || null,
        description: description.trim() || null,
        images: images.length > 0 ? images : null,
        is_active: false, // Ativação após confirmação do pagamento com o Administrador
      })
      .select("id")
      .single();

    setSaving(false);

    if (err || !insertedProp) {
      setError("Não foi possível cadastrar no momento. Verifique sua conexão e tente novamente.");
      console.info("[properties insert]", err?.code, err?.message);
      return;
    }

    const propId = insertedProp.id;
    const shortId = `#IMV-${propId.slice(0, 8).toUpperCase()}`;
    const valorFormatado = cleanPrice ? `R$ ${cleanPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A combinar";

    const periodoStr = planMonths === 1 ? "1 mês" : planMonths === 12 ? "1 ano" : `${planMonths} meses`;

    // Mensagem limpa enviando os dados do imóvel e combinando mensalidade com o Admin
    const msg =
      `Olá Administrador! Cadastrei um anúncio de Imóvel no MT 24horas express e solicito a ativação:

*ID do Anúncio:* ${shortId} (${propId})
*Modalidade:* ${dealType === "venda" ? "Venda" : "Locação"}
*Tipo:* ${TYPE_LABEL[propertyType] ?? propertyType} em ${neighborhood.trim()} (${city.trim() || "Primavera do Leste"})
*Valor do Imóvel:* ${valorFormatado}${dealType === "locacao" ? " /mês" : ""}
*Tempo Desejado:* ${periodoStr}
*Objetivo:* Combinar o valor da mensalidade e efetuar o pagamento via Pix com o Administrador para liberação.

*Quartos:* ${bedrooms || "0"} | *Banheiros:* ${bathrooms || "0"} | *Vagas:* ${parking || "0"}
*Área Total:* ${totalArea ? `${totalArea} m²` : "Não informada"}
*Anunciante:* ${agencyName.trim() || "Particular"}
*WhatsApp:* ${contact.trim()}
*Descrição:* ${description.trim() || "Sem observações adicionais"}
${images.length > 0 ? `*Fotos:* ${images.length} foto(s) anexada(s)` : ""}

Por favor, me informe o valor da mensalidade e a chave Pix para eu efetuar o pagamento e liberar o anúncio.`;

    const adminWaUrl = `https://wa.me/556697196937?text=${encodeURIComponent(msg)}`;
    window.open(adminWaUrl, "_blank", "noopener,noreferrer");

    toast.success(`Imóvel ${shortId} cadastrado com sucesso! Enviando para o WhatsApp do Administrador.`, {
      duration: 6000,
    });

    onCreated();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-card border border-border/80 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col">

        {/* Header Fixo */}
        <div className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-r from-muted/40 via-card to-muted/40 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Central de Negócios
              </span>
            </div>
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-foreground mt-0.5">Anunciar Imóvel</h2>
            <p className="text-xs text-muted-foreground">Preencha os detalhes e envie para ativação</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo Rolável */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm flex-1">

          {/* SEÇÃO 1: Finalidade & Categoria */}
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" /> 1. Finalidade do Anúncio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDealType("locacao")}
                className={`py-3 px-4 rounded-2xl text-xs font-black border transition-all flex flex-col items-center gap-1 ${dealType === "locacao"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.01]"
                    : "bg-background text-muted-foreground border-border/60 hover:border-border"
                  }`}
              >
                <span>🔑 Locação (Aluguel)</span>
                <span className="text-[10px] font-medium opacity-80">Valor mensal recorrente</span>
              </button>
              <button
                type="button"
                onClick={() => setDealType("venda")}
                className={`py-3 px-4 rounded-2xl text-xs font-black border transition-all flex flex-col items-center gap-1 ${dealType === "venda"
                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20 scale-[1.01]"
                    : "bg-background text-muted-foreground border-border/60 hover:border-border"
                  }`}
              >
                <span>🏷️ Venda</span>
                <span className="text-[10px] font-medium opacity-80">Valor total do imóvel</span>
              </button>
            </div>

            {/* Tipo de Imóvel */}
            <div className="pt-1">
              <span className="text-xs font-bold text-foreground block mb-2">Tipo de Imóvel:</span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(Object.keys(TYPE_LABEL) as PropertyType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPropertyType(t)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center truncate ${propertyType === t
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border/60 hover:border-border"
                      }`}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Localização */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> 2. Localização do Imóvel
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Bairro <span className="text-destructive">*</span></span>
                <input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro, Castelândia, Milano..."
                  className="w-full h-11 px-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Cidade</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                  className="w-full h-11 px-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Valor & Dimensões */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> 3. Valor & Medidas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">
                  {dealType === "locacao" ? "Valor do Aluguel (R$/mês)" : "Preço de Venda (R$)"}
                </span>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-black text-muted-foreground pointer-events-none">R$</span>
                  <input
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-background border border-border/70 text-sm font-bold text-foreground outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Área Total (m²)</span>
                <div className="relative">
                  <Ruler className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={totalArea}
                    onChange={(e) => setTotalArea(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="Ex: 80"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Cômodos com seletores rápidos de toque */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-foreground block">Cômodos & Garagem:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Quartos */}
                <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-primary" /> Quartos
                  </span>
                  <div className="flex gap-1">
                    {["0", "1", "2", "3", "4+"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setBedrooms(num)}
                        className={`flex-1 py-1 rounded-xl text-xs font-bold border transition-all ${bedrooms === num
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border/60 hover:border-border"
                          }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banheiros */}
                <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-primary" /> Banheiros
                  </span>
                  <div className="flex gap-1">
                    {["1", "2", "3", "4+"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setBathrooms(num)}
                        className={`flex-1 py-1 rounded-xl text-xs font-bold border transition-all ${bathrooms === num
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border/60 hover:border-border"
                          }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vagas */}
                <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-primary" /> Vagas Garagem
                  </span>
                  <div className="flex gap-1">
                    {["0", "1", "2", "3+"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setParking(num)}
                        className={`flex-1 py-1 rounded-xl text-xs font-bold border transition-all ${parking === num
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border/60 hover:border-border"
                          }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: Fotos do Imóvel */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-primary" /> 4. Fotos do Imóvel ({images.length})
              </label>
              <span className="text-[10px] text-muted-foreground font-semibold">1ª foto será a capa</span>
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={handleUploadPhotos}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhotos}
              className="w-full border-2 border-dashed border-primary/40 hover:border-primary rounded-2xl p-4 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1.5 text-xs font-bold text-foreground cursor-pointer"
            >
              {uploadingPhotos ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span>Enviando fotos selecionadas...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-primary" />
                  <span className="text-sm font-black">Selecionar fotos do celular / galeria</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Toque para adicionar uma ou várias fotos do imóvel</span>
                </>
              )}
            </button>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted shadow-sm group">
                    <img src={img} alt={`Imóvel ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-wider shadow">
                        Capa
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center text-xs shadow-md hover:scale-110 active:scale-90 transition-transform"
                      title="Excluir foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 5: Descrição */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" /> 5. Descrição & Diferenciais (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva opcionais e vantagens: armários planejados, portão eletrônico, churrasqueira, sacada, sol da manhã..."
              rows={3}
              className="w-full p-3.5 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary resize-none transition-all"
            />
          </div>

          {/* SEÇÃO 6: Dados de Contato */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" /> 6. Dados do Anunciante
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Seu Nome / Imobiliária</span>
                <input
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Ex: Particular ou Imobiliária X"
                  className="w-full h-11 px-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all"
                />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">WhatsApp de Contato <span className="text-destructive">*</span></span>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={contact}
                    onChange={(e) => handleContactChange(e.target.value)}
                    inputMode="tel"
                    placeholder="(66) 99999-9999"
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-background border border-border/70 text-sm font-bold outline-none focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 7: Período de Ativação / Mensalidade */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-emerald-500" /> 7. Tempo que Deseja Manter Ativo
              </label>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {planMonths === 1 ? "1 Mês" : planMonths === 12 ? "1 Ano" : `${planMonths} Meses`}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {MONTHS_OPTIONS.map((opt) => (
                <button
                  key={opt.months}
                  type="button"
                  onClick={() => setPlanMonths(opt.months)}
                  className={`py-3 px-1 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${planMonths === opt.months
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.02]"
                      : "bg-background text-muted-foreground border-border/70 hover:border-border"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Card Explicativo de Ativação com Admin */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400 text-xs">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Mensalidade & Ativação no Sistema</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você falará diretamente com o Administrador no WhatsApp para combinar os <strong>{planMonths === 1 ? "1 mês" : planMonths === 12 ? "1 ano" : `${planMonths} meses`}</strong> que seu anúncio ficará ativo e efetuar o pagamento da mensalidade via Pix. Após a confirmação, seu imóvel será liberado imediatamente!
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Footer Fixo com Botão de Ação */}
        <div className="p-4 sm:p-5 border-t border-border/60 bg-card shrink-0 space-y-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <button
            onClick={submit}
            disabled={saving || uploadingPhotos || !neighborhood.trim() || !contact.trim()}
            className="w-full h-13 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg shadow-[#25D366]/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registrando anúncio...</span>
              </>
            ) : (
              <>
                <WhatsappIcon className="w-5 h-5" />
                <span>Combinar Mensalidade ({planMonths === 1 ? "1 mês" : planMonths === 12 ? "1 ano" : `${planMonths} meses`}) no WhatsApp</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-muted-foreground">
            O anúncio será revisado e liberado pelo Administrador após o contato via WhatsApp.
          </p>
        </div>

      </div>
    </div>
  );
}

export function PropertyImageCarousel({
  images,
  propertyId,
  dealType,
  propertyType,
  isFav,
  onToggleFav,
}: {
  images?: string[] | null;
  propertyId: string;
  dealType: PropertyDeal;
  propertyType: PropertyType;
  isFav?: boolean;
  onToggleFav?: () => void;
}) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const list = useMemo(() => (images || []).filter(Boolean), [images]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((curr) => (curr === 0 ? list.length - 1 : curr - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((curr) => (curr === list.length - 1 ? 0 : curr + 1));
  };

  return (
    <div
      onClick={() => navigate({ to: "/marketplace/business/$propertyId", params: { propertyId } })}
      className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-950 overflow-hidden cursor-pointer select-none group/carousel"
    >
      {list.length > 0 ? (
        <img
          src={list[index]}
          alt={propertyType}
          className="w-full h-full object-cover transition-all duration-500 group-hover/carousel:scale-105"
        />
      ) : (
        <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-br from-slate-950 via-zinc-900 to-neutral-900">
          {/* Subtle architectural grid pattern */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-amber-400" />
            </div>
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-400/90 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              MT 24HORAS EXPRESS • EXCLUSIVIDADE
            </span>
            <p className="text-xs font-bold text-zinc-300">
              {TYPE_LABEL[propertyType] ?? propertyType} para {dealType === "venda" ? "Venda" : "Locação"}
            </p>
          </div>
        </div>
      )}

      {/* Subtle bottom shadow vignette for high contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

      {/* Badges de Modalidade e Tipo */}
      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 pointer-events-none flex-wrap">
        <span
          className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg ${
            dealType === "venda"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/30"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30"
          }`}
        >
          {dealType === "venda" ? "Venda" : "Locação"}
        </span>
        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur-md border border-white/20 shadow-md">
          {TYPE_LABEL[propertyType] ?? propertyType}
        </span>
      </div>

      {/* Favorite button on top-right */}
      {onToggleFav && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFav();
          }}
          aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className="absolute top-3.5 right-3.5 z-20 w-10 h-10 rounded-full grid place-items-center bg-slate-900/70 hover:bg-slate-900/90 border border-white/20 backdrop-blur-md shadow-lg transition-transform active:scale-90"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFav ? "text-rose-500 fill-rose-500 scale-110" : "text-white/80 hover:text-white"
            }`}
          />
        </button>
      )}

      {/* Carrossel: Contador de Fotos */}
      {list.length > 1 && (
        <span className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-full bg-slate-950/80 text-white text-[10px] font-black tracking-wider backdrop-blur-md pointer-events-none shadow-md border border-white/10">
          📷 {index + 1} de {list.length}
        </span>
      )}

      {/* Botões de Navegação Anterior / Próxima */}
      {list.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto anterior"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próxima foto"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-90"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicador de Bolinhas */}
      {list.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 pointer-events-none">
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-amber-400 shadow-sm" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PropertyAttrs({ property: p }: { property: Property }) {
  const attrs: Array<{ icon: any; text: string }> = [];
  if (p.total_area) attrs.push({ icon: Ruler, text: `${p.total_area} m² total` });
  if (p.built_area) attrs.push({ icon: Ruler, text: `${p.built_area} m² constr.` });
  if (p.bedrooms) attrs.push({ icon: BedDouble, text: `${p.bedrooms} quartos` });
  if (p.bathrooms) attrs.push({ icon: Bath, text: `${p.bathrooms} banheiros` });
  if (p.parking) attrs.push({ icon: Car, text: `${p.parking} vagas` });
  if (attrs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {attrs.map((a, i) => {
        const Icon = a.icon;
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/50 text-[11px] font-bold text-foreground"
          >
            <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{a.text}</span>
          </span>
        );
      })}
    </div>
  );
}