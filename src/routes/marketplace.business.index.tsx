import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Ruler, BedDouble, Bath, Car, ChevronRight, ChevronLeft, ArrowUpDown, X, Heart, MapPin, Home, Plus, UploadCloud, Loader2 } from "lucide-react";
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
    <div className="space-y-5 pb-6">
      <AeroPageHeader
        title="Central de Negócios"
        subtitle="Imóveis para locação e venda"
        onBack={() => navigate({ to: "/marketplace" })}
      />

      <div className="grid grid-cols-2 gap-2">
        <span className="h-11 rounded-2xl grid place-items-center text-[13px] font-bold bg-btn-surface text-btn-ink border border-btn-line shadow-sm">
          Imóveis
        </span>
        <Link
          to="/marketplace/business/vehicles"
          className="aero-focus h-11 rounded-2xl grid place-items-center text-[13px] font-bold bg-card border border-border text-muted-foreground hover:bg-muted active:bg-btn-active active:text-btn-active-ink transition-colors"
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
            className={`tap-target aero-focus shrink-0 px-4 min-h-11 inline-flex items-center rounded-full text-xs font-semibold border transition-colors ${
              deal === d.key
                ? "bg-btn-surface text-btn-ink border-btn-line shadow-sm"
                : "bg-card text-muted-foreground border-border/60 hover:bg-muted active:bg-btn-active active:text-btn-active-ink"
            }`}
          >
            {d.label}
          </button>
        ))}
        <button
          onClick={() => setOnlyFavorites((v) => !v)}
          aria-pressed={onlyFavorites}
          className={`tap-target aero-focus shrink-0 inline-flex items-center gap-1.5 px-4 min-h-11 rounded-full text-xs font-semibold border transition-colors ${
            onlyFavorites
              ? "bg-btn-surface text-btn-ink border-btn-line shadow-sm"
              : "bg-card text-muted-foreground border-border/60 hover:bg-muted active:bg-btn-active active:text-btn-active-ink"
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
            className={`shrink-0 px-3.5 min-h-11 inline-flex items-center rounded-full text-xs font-semibold border transition-colors ${
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
            className="h-11 px-2.5 rounded-xl bg-card border border-border/60 text-xs font-semibold outline-none focus:border-primary"
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
        <ul className="space-y-4">
          {pageItems.map((p) => {
            const cover = p.images?.[0] || null;
            const waNumber = p.contact_phone ? p.contact_phone.replace(/\D/g, "") : "";
            const fullWa = waNumber ? (waNumber.startsWith("55") ? waNumber : `55${waNumber}`) : "";
            const waText = encodeURIComponent(
              `Olá! Tenho interesse no imóvel *${TYPE_LABEL[p.property_type] ?? p.property_type}* (${p.deal_type === "venda" ? "Venda" : "Locação"}) no bairro *${p.neighborhood ?? "Primavera do Leste"}* anunciado na Central de Negócios do MT 24horas express.`
            );

            return (
              <li key={p.id} className="relative group">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(p.id);
                  }}
                  aria-label={isFavorite(p.id) ? "Remover dos favoritos" : "Salvar nos favoritos"}
                  aria-pressed={isFavorite(p.id)}
                  className="absolute top-3.5 right-3.5 z-20 w-10 h-10 rounded-full grid place-items-center bg-background/80 border border-border/60 backdrop-blur shadow-sm transition-transform active:scale-90"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${isFavorite(p.id) ? "text-rose-500 fill-rose-500" : "text-muted-foreground"}`}
                  />
                </button>

                <div className="overflow-hidden rounded-3xl border border-border/60 bg-card hover:border-primary/50 transition-all shadow-sm">
                  {/* Carrossel de Fotos com navegação e badges */}
                  <PropertyImageCarousel
                    images={p.images}
                    propertyId={p.id}
                    dealType={p.deal_type}
                    propertyType={p.property_type}
                  />

                  {/* Conteúdo do Card */}
                  <div className="p-4 space-y-3">
                    <Link
                      to="/marketplace/business/$propertyId"
                      params={{ propertyId: p.id }}
                      className="block group-hover:text-primary transition-colors"
                    >
                      <h2 className="font-display font-bold text-base leading-tight">
                        {TYPE_LABEL[p.property_type]} em {p.neighborhood ?? "Primavera do Leste"}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary shrink-0" />
                        {[p.city, p.state].filter(Boolean).join(", ")}
                      </p>
                    </Link>

                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    <PropertyAttrs property={p} />

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Valor:</p>
                        <p className="font-display font-black text-xl text-black dark:text-white leading-tight">
                          {formatPrice(p.price)}
                          {p.deal_type === "locacao" && <span className="text-xs font-normal text-muted-foreground"> /mês</span>}
                        </p>
                      </div>

                      {fullWa ? (
                        <a
                          href={`https://wa.me/${fullWa}?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                          title="Falar direto no WhatsApp"
                        >
                          <WhatsappIcon className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <Link
                          to="/marketplace/business/$propertyId"
                          params={{ propertyId: p.id }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    {p.contact_phone && (
                      <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 pt-1">
                        <WhatsappIcon className="w-3 h-3 text-[#25D366]" />
                        <span>Contato: {p.contact_phone}</span>
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
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
        {/* Botão Flutuante: Anunciar Imóvel */}
        <button
          onClick={() => (user ? setShowForm(true) : navigate({ to: "/login" }))}
          className="fixed bottom-24 right-5 z-40 h-12 pl-4 pr-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Anunciar Imóvel
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

function NewPropertySheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [dealType, setDealType] = useState<PropertyDeal>("locacao");
  const [propertyType, setPropertyType] = useState<PropertyType>("casa");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("Primavera do Leste");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [parking, setParking] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError("Por favor, informe o bairro do imóvel.");
      return;
    }
    if (!contact.trim()) {
      setError("Por favor, informe seu telefone / WhatsApp de contato.");
      return;
    }
    setSaving(true);
    setError(null);

    const cleanPrice = price ? Number(price.replace(/\./g, "").replace(",", ".")) : null;

    const { error: err } = await supabase.from("properties").insert({
      owner_id: user.id,
      deal_type: dealType,
      property_type: propertyType,
      neighborhood: neighborhood.trim(),
      city: city.trim() || "Primavera do Leste",
      state: "MT",
      price: cleanPrice,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      parking: parking ? Number(parking) : null,
      total_area: totalArea ? Number(totalArea) : null,
      agency_name: agencyName.trim() || null,
      contact_phone: contact.trim() || null,
      description: description.trim() || null,
      images: images.length > 0 ? images : null,
      is_active: false, // Só fica visível no app após aprovação do admin!
    });

    setSaving(false);

    if (err) {
      setError("Não foi possível cadastrar agora. Tente novamente.");
      console.info("[properties insert]", err.code, err.message);
      return;
    }

    const valorFormatado = cleanPrice ? `R$ ${cleanPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A combinar";
    const msg =
`Olá Administrador! Acabei de cadastrar meu anúncio de *Imóvel* no app MT 24horas express e aguardo aprovação:

🏠 *Modalidade:* ${dealType === "venda" ? "Venda" : "Locação"}
🏢 *Tipo:* ${TYPE_LABEL[propertyType] ?? propertyType} em ${neighborhood.trim()} (${city.trim() || "Primavera do Leste"})
💰 *Valor:* ${valorFormatado}${dealType === "locacao" ? " /mês" : ""}
🛏️ *Quartos:* ${bedrooms || "0"} | 🚿 *Banheiros:* ${bathrooms || "0"} | 🚗 *Vagas:* ${parking || "0"}
📐 *Área:* ${totalArea ? `${totalArea} m²` : "Não informada"}
👤 *Anunciante:* ${agencyName.trim() || "Particular"}
📱 *Meu WhatsApp:* ${contact.trim()}
📝 *Descrição:* ${description.trim() || "Sem observações adicionais"}
${images.length > 0 ? `📸 *Fotos anexadas:* ${images.length} foto(s)` : ""}

Solicito a aprovação e liberação do meu imóvel na Central de Negócios!`;

    const adminWaUrl = `https://wa.me/556697196937?text=${encodeURIComponent(msg)}`;
    window.open(adminWaUrl, "_blank", "noopener,noreferrer");

    toast.success("Imóvel enviado com sucesso! Aguarde a aprovação do administrador para aparecer no aplicativo.", {
      duration: 6000,
    });

    onCreated();
  };

  const field = "w-full h-11 px-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg">Anunciar imóvel</h2>
            <p className="text-[11px] text-muted-foreground">O anúncio será revisado pelo administrador antes de ir ao ar</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modalidade */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setDealType("locacao")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              dealType === "locacao" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-background text-muted-foreground border-border/60"
            }`}
          >
            Locação (Aluguel)
          </button>
          <button
            type="button"
            onClick={() => setDealType("venda")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              dealType === "venda" ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm" : "bg-background text-muted-foreground border-border/60"
            }`}
          >
            Venda
          </button>
        </div>

        {/* Tipo de Imóvel */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(Object.keys(TYPE_LABEL) as PropertyType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPropertyType(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                propertyType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border/60"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Bairro *" className={field} />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" className={field} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input value={bedrooms} onChange={(e) => setBedrooms(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Quartos" className={field} />
          <input value={bathrooms} onChange={(e) => setBathrooms(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Banh." className={field} />
          <input value={parking} onChange={(e) => setParking(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Vagas" className={field} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input value={totalArea} onChange={(e) => setTotalArea(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Área Total (m²)" className={field} />
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder={dealType === "locacao" ? "Valor /mês (R$)" : "Valor (R$)"} className={field} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Seu nome / Imobiliária" className={field} />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="WhatsApp de contato *" className={field} />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva detalhes como armários embutidos, portão eletrônico, sacada, etc..."
          rows={3}
          className="w-full p-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary resize-none"
        />

        {/* Upload de Fotos do Imóvel */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Home className="w-4 h-4 text-primary" /> Fotos do Imóvel ({images.length})
            </span>
            <span className="text-[10px] text-muted-foreground">1ª foto será a capa</span>
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
            className="w-full border-2 border-dashed border-primary/40 hover:border-primary rounded-2xl p-3 bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-center gap-2 text-xs font-bold text-foreground"
          >
            {uploadingPhotos ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Enviando fotos...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-primary" />
                <span>Selecionar fotos do imóvel</span>
              </>
            )}
          </button>

          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 pt-1">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group">
                  <img src={img} alt={`Imóvel ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-primary text-primary-foreground font-black text-[8px] uppercase">
                      Capa
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive/90 text-white flex items-center justify-center text-xs shadow hover:scale-110 transition-transform"
                    title="Remover"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}

        <div className="pt-2">
          <p className="text-[11px] text-muted-foreground text-center pb-2">
            📲 Ao enviar, você será direcionado ao WhatsApp da Administração para validar seu imóvel.
          </p>

          <button
            onClick={submit}
            disabled={saving || uploadingPhotos || !neighborhood.trim()}
            className="w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md active:scale-98 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Enviando imóvel...
              </>
            ) : (
              <>
                <WhatsappIcon className="w-4 h-4" /> Enviar e Falar com Admin no WhatsApp
              </>
            )}
          </button>
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
}: {
  images?: string[] | null;
  propertyId: string;
  dealType: PropertyDeal;
  propertyType: PropertyType;
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
      className="relative aspect-[16/9] w-full bg-muted overflow-hidden cursor-pointer select-none group/carousel"
    >
      {list.length > 0 ? (
        <img
          src={list[index]}
          alt={propertyType}
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-1 bg-gradient-to-b from-muted/60 to-muted">
          <Home className="h-10 w-10 text-muted-foreground/30" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50">Sem fotos</span>
        </div>
      )}

      {/* Badges de Modalidade e Tipo */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-none">
        <span
          className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm ${
            dealType === "venda" ? "bg-amber-500 text-slate-950" : "bg-emerald-600 text-white"
          }`}
        >
          {dealType === "venda" ? "Venda" : "Locação"}
        </span>
        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-background/80 text-foreground backdrop-blur border border-border/50">
          {TYPE_LABEL[propertyType] ?? propertyType}
        </span>
      </div>

      {/* Carrossel: Contador de Fotos */}
      {list.length > 1 && (
        <span className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-black tracking-wider backdrop-blur-sm pointer-events-none shadow">
          {index + 1} / {list.length}
        </span>
      )}

      {/* Botões de Navegação Anterior / Próxima */}
      {list.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-90"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicador de Bolinhas */}
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 pointer-events-none">
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white shadow-sm" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
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