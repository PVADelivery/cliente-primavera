import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Ruler, BedDouble, Bath, Car, ChevronRight, ArrowUpDown, X, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Property, PropertyType } from "@/types/database";
import { formatPrice } from "@/lib/property";
import { usePropertyFavorites } from "@/hooks/usePropertyFavorites";
import { AeroPageHeader, AeroSkeletonList, AeroEmptyState } from "@/components/aero";

export const Route = createFileRoute("/marketplace/business/")({
  head: () => ({
    meta: [
      { title: "Central de Negócios — Imóveis em Primavera do Leste" },
      { name: "description", content: "Casas, apartamentos, kitnets, salas comerciais e terrenos para locação e venda em Primavera do Leste, MT." },
      { property: "og:title", content: "Central de Negócios — Imóveis e locação" },
      { property: "og:description", content: "Casas, apartamentos, kitnets, salas e terrenos para locação e venda na sua cidade." },
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
    <div className="space-y-5 pb-6">
      <AeroPageHeader
        title="Central de Negócios"
        subtitle="Imóveis para locação e venda"
        onBack={() => navigate({ to: "/marketplace" })}
      />

      <div className="grid grid-cols-2 gap-2">
        <span className="h-11 rounded-2xl grid place-items-center text-[13px] font-bold bg-primary text-primary-foreground border border-primary">
          Imóveis
        </span>
        <Link
          to="/marketplace/business/vehicles"
          className="aero-focus h-11 rounded-2xl grid place-items-center text-[13px] font-bold bg-card border border-border text-muted-foreground hover:border-primary/50 transition-colors"
        >
          Veículos
        </Link>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por bairro ou descrição"
          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card border border-border/60 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
        {DEALS.map((d) => (
          <button
            key={d.key}
            onClick={() => setDeal(d.key)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
              deal === d.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/60"
            }`}
          >
            {d.label}
          </button>
        ))}
        <button
          onClick={() => setOnlyFavorites((v) => !v)}
          aria-pressed={onlyFavorites}
          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
            onlyFavorites
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border/60"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-current" : ""}`} />
          Favoritos{hydrated && favorites.length > 0 ? ` (${favorites.length})` : ""}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              type === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Filtrar por cidade"
          className="h-11 px-3 rounded-2xl bg-card border border-border/60 text-xs font-semibold outline-none focus:border-primary"
        >
          <option value="all">Todas as cidades</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          aria-label="Filtrar por bairro"
          className="h-11 px-3 rounded-2xl bg-card border border-border/60 text-xs font-semibold outline-none focus:border-primary"
        >
          <option value="all">Todos os bairros</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[11px] font-semibold"
              aria-label={`Remover filtro ${chip.label}`}
            >
              {chip.label}
              <X className="w-3 h-3" />
            </button>
          ))}
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/60 text-[11px] font-semibold text-muted-foreground"
          >
            Limpar tudo
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-muted-foreground">
          {list.length} {list.length === 1 ? "imóvel" : "imóveis"}
        </p>
        <label className="inline-flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Ordenar imóveis"
            className="h-9 px-2.5 rounded-xl bg-card border border-border/60 text-xs font-semibold outline-none focus:border-primary"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
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
        <ul className="space-y-3">
          {pageItems.map((p) => (
            <li key={p.id} className="relative">
              <button
                onClick={() => toggleFavorite(p.id)}
                aria-label={isFavorite(p.id) ? "Remover dos favoritos" : "Salvar nos favoritos"}
                aria-pressed={isFavorite(p.id)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full grid place-items-center bg-background/80 border border-border/60 backdrop-blur"
              >
                <Heart
                  className={`w-4 h-4 ${isFavorite(p.id) ? "text-primary fill-current" : "text-muted-foreground"}`}
                />
              </button>
              <Link
                to="/marketplace/business/$propertyId"
                params={{ propertyId: p.id }}
                className="block rounded-3xl border border-border/50 bg-card p-5 hover:border-primary/50 transition-colors"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-2 pr-10">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                    {p.deal_type === "venda" ? "Venda" : "Locação"}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">{TYPE_LABEL[p.property_type]}</span>
                </div>

                <h2 className="font-display font-bold text-base mt-2.5 leading-tight">
                  {p.neighborhood ?? "Bairro não informado"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {[p.city, p.state].filter(Boolean).join(", ")}
                </p>

                {p.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                )}

                <PropertyAttrs property={p} />

                <div className="flex items-center justify-between mt-3">
                  <p className="font-display font-bold text-primary">{formatPrice(p.price)}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              disabled={page === 1}
              className="px-4 h-10 rounded-2xl border border-border/60 bg-card text-xs font-semibold disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs font-semibold text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
              disabled={page === totalPages}
              className="px-4 h-10 rounded-2xl border border-border/60 bg-card text-xs font-semibold disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export function PropertyAttrs({ property: p }: { property: Property }) {
  const attrs: Array<{ icon: typeof Ruler; text: string }> = [];
  if (p.total_area) attrs.push({ icon: Ruler, text: `${p.total_area} m² total` });
  if (p.built_area) attrs.push({ icon: Ruler, text: `${p.built_area} m² constr.` });
  if (p.bedrooms) attrs.push({ icon: BedDouble, text: `${p.bedrooms} quartos` });
  if (p.parking) attrs.push({ icon: Car, text: `${p.parking} vagas` });
  if (p.bathrooms) attrs.push({ icon: Bath, text: `${p.bathrooms} banheiros` });
  if (attrs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
      {attrs.map((a, i) => {
        const Icon = a.icon;
        return (
          <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Icon className="w-3.5 h-3.5 text-primary" /> {a.text}
          </span>
        );
      })}
    </div>
  );
}