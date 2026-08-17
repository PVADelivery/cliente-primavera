import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Plus, Loader2, X, Phone, Gauge, Calendar, Fuel, Car } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/property";
import type { Vehicle, VehicleType } from "@/types/database";

export const Route = createFileRoute("/marketplace/business/vehicles")({
  head: () => ({
    meta: [
      { title: "Veículos à venda — Central de Negócios" },
      { name: "description", content: "Carros, motos, caminhões e utilitários à venda em Primavera do Leste, MT. Anuncie o seu veículo gratuitamente." },
      { property: "og:title", content: "Veículos à venda — Central de Negócios" },
      { property: "og:description", content: "Carros, motos e caminhões à venda na sua cidade. Anuncie o seu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VehiclesPage,
});

const TYPE_LABEL: Record<VehicleType, string> = {
  carro: "Carro",
  moto: "Moto",
  caminhao: "Caminhão",
  utilitario: "Utilitário",
  outro: "Outro",
};

const TYPES: Array<{ key: VehicleType | "all"; label: string }> = [
  { key: "all", label: "Todos os tipos" },
  { key: "carro", label: "Carro" },
  { key: "moto", label: "Moto" },
  { key: "caminhao", label: "Caminhão" },
  { key: "utilitario", label: "Utilitário" },
  { key: "outro", label: "Outro" },
];

type SortKey = "price_asc" | "price_desc" | "recent";

function VehiclesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [type, setType] = useState<VehicleType | "all">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("price_asc");
  const [showForm, setShowForm] = useState(false);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_active", true)
        .limit(200);
      if (error) {
        console.info("[vehicles]", error.code, error.message);
        return [];
      }
      return (data ?? []) as Vehicle[];
    },
  });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return vehicles
      .filter((v) => (type === "all" ? true : v.vehicle_type === type))
      .filter((v) =>
        term
          ? `${v.brand ?? ""} ${v.model} ${v.city ?? ""} ${v.description ?? ""}`.toLowerCase().includes(term)
          : true
      )
      .sort((a, b) => {
        if (sort === "recent") {
          return new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime();
        }
        if (a.price == null && b.price == null) return 0;
        if (a.price == null) return 1;
        if (b.price == null) return -1;
        return sort === "price_desc" ? b.price - a.price : a.price - b.price;
      });
  }, [vehicles, type, q, sort]);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/marketplace/business" })}
          className="w-9 h-9 rounded-full grid place-items-center bg-card border border-border/50 text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">Veículos</h1>
          <p className="text-xs text-muted-foreground">Carros, motos e utilitários à venda</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/marketplace/business"
          className="h-11 rounded-2xl grid place-items-center text-xs font-semibold bg-card border border-border/60 text-muted-foreground"
        >
          Imóveis
        </Link>
        <span className="h-11 rounded-2xl grid place-items-center text-xs font-semibold bg-primary text-primary-foreground border border-primary">
          Veículos
        </span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por marca, modelo ou descrição"
          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-card border border-border/60 text-sm outline-none focus:border-primary"
        />
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

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-muted-foreground">
          {list.length} {list.length === 1 ? "veículo" : "veículos"}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Ordenar veículos"
          className="h-9 px-2.5 rounded-xl bg-card border border-border/60 text-xs font-semibold outline-none focus:border-primary"
        >
          <option value="price_asc">Menor valor</option>
          <option value="price_desc">Maior valor</option>
          <option value="recent">Mais recentes</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-card border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-border/50 bg-card p-8 text-center">
          <p className="font-display font-bold text-base">Nenhum veículo anunciado</p>
          <p className="text-xs text-muted-foreground mt-1.5">Toque em “Anunciar” para publicar o seu veículo à venda.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((v) => (
            <li
              key={v.id}
              className="rounded-3xl border border-border/50 bg-card p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  Venda
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">{TYPE_LABEL[v.vehicle_type]}</span>
              </div>

              <h2 className="font-display font-bold text-base mt-2.5 leading-tight">
                {[v.brand, v.model].filter(Boolean).join(" ")}
              </h2>
              <p className="text-xs text-muted-foreground">{[v.city, v.state].filter(Boolean).join(", ")}</p>

              {v.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{v.description}</p>}

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {v.year && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> {v.year}
                  </span>
                )}
                {v.km != null && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Gauge className="w-3.5 h-3.5 text-primary" /> {v.km.toLocaleString("pt-BR")} km
                  </span>
                )}
                {v.fuel && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Fuel className="w-3.5 h-3.5 text-primary" /> {v.fuel}
                  </span>
                )}
                {v.transmission && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Car className="w-3.5 h-3.5 text-primary" /> {v.transmission}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 gap-3">
                <p className="font-display font-bold text-primary">{formatPrice(v.price)}</p>
                {v.contact_phone && (
                  <a
                    href={`https://wa.me/55${v.contact_phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" /> Falar
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => (user ? setShowForm(true) : navigate({ to: "/login" }))}
        className="fixed bottom-24 right-5 z-40 h-12 pl-4 pr-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-lg"
      >
        <Plus className="w-4 h-4" /> Anunciar
      </button>

      {showForm && (
        <NewVehicleSheet
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
          }}
        />
      )}
    </div>
  );
}

function NewVehicleSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [vehicleType, setVehicleType] = useState<VehicleType>("carro");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [km, setKm] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!model.trim() || !user) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("vehicles").insert({
      owner_id: user.id,
      vehicle_type: vehicleType,
      brand: brand.trim() || null,
      model: model.trim(),
      year: year ? Number(year) : null,
      km: km ? Number(km) : null,
      price: price ? Number(price.replace(/\./g, "").replace(",", ".")) : null,
      description: description.trim() || null,
      contact_phone: contact.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError("Não foi possível publicar agora. Tente novamente.");
      console.info("[vehicles insert]", err.code, err.message);
      return;
    }
    onCreated();
  };

  const field = "w-full h-11 px-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg">Anunciar veículo</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABEL) as VehicleType[]).map((t) => (
            <button
              key={t}
              onClick={() => setVehicleType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                vehicleType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border/60"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca (ex.: Fiat)" className={field} />
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo (ex.: Strada 1.4)" className={field} />
        <div className="grid grid-cols-2 gap-2">
          <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Ano" className={field} />
          <input value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Km" className={field} />
        </div>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="Valor (R$)" className={field} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes: estado, opcionais, documentação..."
          rows={4}
          className="w-full p-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary resize-none"
        />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telefone / WhatsApp" className={field} />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={submit}
          disabled={saving || !model.trim()}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Publicar anúncio
        </button>
      </div>
    </div>
  );
}