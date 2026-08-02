import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Ruler, BedDouble, Bath, Car, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Property, PropertyType } from "@/types/database";
import { formatPrice } from "@/lib/property";

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

function BusinessPage() {
  const navigate = useNavigate();
  const [deal, setDeal] = useState<"all" | "locacao" | "venda">("all");
  const [type, setType] = useState<PropertyType | "all">("all");
  const [q, setQ] = useState("");

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

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return properties
      .filter((p) => (deal === "all" ? true : p.deal_type === deal))
      .filter((p) => (type === "all" ? true : p.property_type === type))
      .filter((p) =>
        term
          ? `${p.neighborhood ?? ""} ${p.city ?? ""} ${p.description ?? ""}`.toLowerCase().includes(term)
          : true
      )
      .sort((a, b) => {
        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return a.price - b.price;
      });
  }, [properties, deal, type, q]);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/marketplace" })}
          className="w-9 h-9 rounded-full grid place-items-center bg-card border border-border/50 text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">Central de Negócios</h1>
          <p className="text-xs text-muted-foreground">Imóveis para locação e venda</p>
        </div>
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
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              type === t.key
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 rounded-3xl bg-card border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-border/50 bg-card p-8 text-center">
          <p className="font-display font-bold text-base">Nenhum imóvel encontrado</p>
          <p className="text-xs text-muted-foreground mt-1.5">Ajuste os filtros ou tente outro bairro.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                to="/marketplace/business/$propertyId"
                params={{ propertyId: p.id }}
                className="block rounded-3xl border border-border/50 bg-card p-5 hover:border-primary/50 transition-colors"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-2">
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