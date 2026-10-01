import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Plus, Loader2, X, Phone, Gauge, Calendar, Fuel, Car, UploadCloud, Image as ImageIcon, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, CalendarClock, DollarSign, User, FileText, ShieldCheck, Tag, Info, Layers, Camera, Trash2, Check, AlertCircle, Building2, Bike, Truck, ArrowUpDown, Shield, SlidersHorizontal, MapPin } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/property";
import type { Vehicle, VehicleType } from "@/types/database";
import { AeroSkeletonList, AeroEmptyState } from "@/components/aero";
import { toast } from "sonner";

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

const TYPES: Array<{ key: VehicleType | "all"; label: string; icon: any }> = [
  { key: "all", label: "Todos os tipos", icon: Sparkles },
  { key: "carro", label: "Carros", icon: Car },
  { key: "moto", label: "Motos", icon: Bike },
  { key: "caminhao", label: "Caminhões", icon: Truck },
  { key: "utilitario", label: "Utilitários", icon: Car },
  { key: "outro", label: "Outros", icon: Sparkles },
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
    <div className="space-y-6 pb-28">
      {/* HERO BANNER DE LUXO: CENTRAL DE NEGÓCIOS - VEÍCULOS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-zinc-900 to-black p-5 sm:p-7 text-white shadow-2xl border border-white/10">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate({ to: "/marketplace/business" })}
              className="w-10 h-10 rounded-2xl grid place-items-center bg-white/10 hover:bg-white/20 active:scale-95 text-white backdrop-blur-md border border-white/15 transition-all shadow-md"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-black uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" /> Garagem VIP
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/15 text-[11px] font-bold">
                {list.length} {list.length === 1 ? "anúncio" : "anúncios"}
              </span>
            </div>
          </div>

          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Central de Veículos <Car className="w-6 h-6 text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium mt-1">
              Carros, motos, caminhões e utilitários selecionados em Primavera do Leste e região.
            </p>
          </div>

          {/* Abas de Segmento Luxo */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              to="/marketplace/business"
              className="min-h-[46px] rounded-2xl text-xs sm:text-sm font-bold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 flex items-center justify-center gap-2 px-3 text-center transition-all active:scale-[0.98]"
            >
              <Building2 className="w-4 h-4 shrink-0 text-zinc-400" />
              <span>Imóveis & Locação</span>
            </Link>
            <div className="min-h-[46px] rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 border border-amber-300 shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 px-3 text-center select-none">
              <Car className="w-4 h-4 shrink-0 text-slate-950" />
              <span>Veículos & Cargas</span>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA ELEGANTE */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por marca, modelo, ano ou cidade..."
          className="w-full h-13 pl-11 pr-10 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 text-sm font-medium outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-sm"
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

      {/* FILTROS DE CATEGORIA POR TIPO */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 py-1">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const isActive = type === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                isActive
                  ? "bg-slate-950 text-amber-400 border-amber-400/50 shadow-amber-500/10 scale-[1.02]"
                  : "bg-card/80 text-muted-foreground border-border/60 hover:bg-card hover:text-foreground"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-muted-foreground"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* BARRA DE CONTAGEM E ORDENAÇÃO */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-bold text-muted-foreground">
          Mostrando <span className="text-foreground">{list.length}</span> {list.length === 1 ? "veículo disponível" : "veículos disponíveis"}
        </p>

        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Ordenar veículos"
            className="h-10 pl-3 pr-8 rounded-xl bg-card border border-border/80 text-xs font-bold outline-none focus:border-amber-400 appearance-none cursor-pointer shadow-sm"
          >
            <option value="price_asc">Menor valor</option>
            <option value="price_desc">Maior valor</option>
            <option value="recent">Atualizados recentemente</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
      </div>

      {/* LISTAGEM DE CARDS DE MILHÕES */}
      {isLoading ? (
        <AeroSkeletonList count={3} lines={3} label="Carregando catálogo de veículos..." />
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-400/10 border border-amber-400/20 text-amber-500 grid place-items-center mx-auto">
            <Car className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-black text-lg text-foreground">Nenhum veículo encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {q ? "Nenhum resultado corresponde à sua pesquisa. Tente buscar por outros termos." : "Seja o primeiro a anunciar seu carro, moto ou caminhão na Central de Negócios."}
            </p>
          </div>
          <button
            onClick={() => (user ? setShowForm(true) : navigate({ to: "/login" }))}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs shadow-md hover:bg-amber-300 transition-all"
          >
            <Plus className="w-4 h-4" /> Anunciar Veículo Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {list.map((v) => (
            <div
              key={v.id}
              className="group rounded-3xl border border-border/70 bg-card overflow-hidden hover:border-amber-400/50 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div>
                {/* Carrossel ou Canvas Mockup */}
                <VehicleImageCarousel images={v.images} vehicleType={v.vehicle_type} />

                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* Badges de Venda e Tipo */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-sm">
                      Venda
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted/80 text-foreground border border-border/50">
                      {TYPE_LABEL[v.vehicle_type]}
                    </span>
                  </div>

                  {/* Título & Localização */}
                  <div>
                    <h2 className="font-display font-black text-lg sm:text-xl text-foreground leading-snug group-hover:text-amber-500 transition-colors">
                      {[v.brand, v.model].filter(Boolean).join(" ")}
                    </h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{[v.city, v.state].filter(Boolean).join(", ") || "Primavera do Leste, MT"}</span>
                    </p>
                  </div>

                  {/* Descrição */}
                  {v.description &&
                    v.description.trim().length > 3 &&
                    v.description.trim().toLowerCase() !== v.model.trim().toLowerCase() &&
                    v.description.trim().toLowerCase() !== (v.brand ?? "").trim().toLowerCase() && (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
                        {v.description}
                      </p>
                    )}

                  {/* Especificações do Veículo - Pílulas elegantes sem corte de texto */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {v.year && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold text-foreground shadow-xs">
                        <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{v.year}</span>
                      </span>
                    )}
                    {v.km != null && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold text-foreground shadow-xs">
                        <Gauge className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{v.km.toLocaleString("pt-BR")} km</span>
                      </span>
                    )}
                    {v.fuel && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold text-foreground shadow-xs">
                        <Fuel className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{v.fuel}</span>
                      </span>
                    )}
                    {v.transmission && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-bold text-foreground shadow-xs">
                        <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{v.transmission}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé de Milhões: Preço e WhatsApp CTA */}
              <div className="p-4 sm:p-5 pt-3.5 border-t border-border/60 bg-muted/15 flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                      Valor de Venda
                    </span>
                    <p className="font-display font-black text-2xl sm:text-[26px] text-foreground tracking-tight leading-none mt-1">
                      {formatPrice(v.price)}
                    </p>
                  </div>

                  {v.contact_phone && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-card px-2.5 py-1 rounded-full border border-border/60 shadow-xs">
                      <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{v.contact_phone}</span>
                    </div>
                  )}
                </div>

                {v.contact_phone && (
                  <a
                    href={`https://wa.me/55${v.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Olá! Tenho interesse no veículo *${v.brand ? `${v.brand} ` : ""}${v.model}* anunciado na Central de Negócios do MT 24horas express.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#25D366] to-emerald-500 hover:brightness-110 active:scale-[0.98] text-white text-sm font-black flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                    title="Negociar no WhatsApp"
                  >
                    <WhatsappIcon className="w-4 h-4 shrink-0" />
                    <span>Negociar no WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOTÃO FLUTUANTE DE ANUNCIAR VEÍCULO */}
      <button
        onClick={() => (user ? setShowForm(true) : navigate({ to: "/login" }))}
        className="fixed bottom-24 right-5 z-40 h-13 pl-5 pr-6 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-black text-sm flex items-center gap-2.5 shadow-2xl shadow-amber-400/40 border border-amber-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Plus className="w-5 h-5 text-slate-950 stroke-[3]" />
        <span>Anunciar Veículo</span>
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

const MONTHS_OPTIONS = [
  { months: 1, label: "1 Mês" },
  { months: 2, label: "2 Meses" },
  { months: 3, label: "3 Meses" },
  { months: 6, label: "6 Meses" },
  { months: 12, label: "1 Ano" },
];

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

  // Formatação de Quilometragem com separador de milhar (ex: 45.000)
  const handleKmChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setKm("");
      return;
    }
    setKm(Number(digits).toLocaleString("pt-BR"));
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
        const fileName = `veh_${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${ext}`;
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
    if (!model.trim() || !user) return;
    if (!contact.trim()) {
      setError("Por favor, informe seu telefone ou WhatsApp de contato.");
      return;
    }
    setSaving(true);
    setError(null);

    const cleanPrice = price ? Number(price.replace(/\./g, "").replace(",", ".")) : null;

    const { data: insertedVeh, error: err } = await supabase
      .from("vehicles")
      .insert({
        owner_id: user.id,
        vehicle_type: vehicleType,
        brand: brand.trim() || null,
        model: model.trim(),
        year: year ? Number(year) : null,
        km: km ? Number(km.replace(/\D/g, "")) : null,
        price: cleanPrice,
        description: description.trim() || null,
        contact_phone: contact.trim() || null,
        images: images.length > 0 ? images : null,
        is_active: false, // Ativação após confirmação do pagamento com o Administrador
      })
      .select("id")
      .single();

    setSaving(false);

    if (err || !insertedVeh) {
      setError("Não foi possível enviar o anúncio no momento. Tente novamente.");
      console.info("[vehicles insert]", err?.code, err?.message);
      return;
    }

    const vehId = insertedVeh.id;
    const shortId = `#VEH-${vehId.slice(0, 8).toUpperCase()}`;
    const valorFormatado = cleanPrice ? `R$ ${cleanPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A combinar";
    const kmFormatado = km ? `${km} km` : "Não informado";
    const periodoStr = planMonths === 1 ? "1 mês" : planMonths === 12 ? "1 ano" : `${planMonths} meses`;
    const msg = 
`Olá Administrador! Cadastrei um anúncio de Veículo no MT 24horas express e solicito a ativação:

*ID do Anúncio:* ${shortId} (${vehId})
*Tipo:* ${TYPE_LABEL[vehicleType] ?? vehicleType}
*Veículo:* ${brand.trim() ? `${brand.trim()} ` : ""}${model.trim()}${year ? ` (${year})` : ""}
*Quilometragem:* ${kmFormatado}
*Preço Pedido:* ${valorFormatado}
*Tempo Desejado:* ${periodoStr}
*Objetivo:* Combinar o valor da mensalidade e efetuar o pagamento via Pix para liberação.

*WhatsApp:* ${contact.trim()}
*Descrição:* ${description.trim() || "Sem observações adicionais"}
${images.length > 0 ? `*Fotos:* ${images.length} foto(s) anexada(s)` : ""}

Por favor, me informe o valor da mensalidade e a chave Pix para eu efetuar o pagamento.`;

    const adminWaUrl = `https://wa.me/556697196937?text=${encodeURIComponent(msg)}`;
    window.open(adminWaUrl, "_blank", "noopener,noreferrer");

    toast.success(`Veículo ${shortId} cadastrado com sucesso! Enviando para o WhatsApp do Administrador.`, {
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
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-foreground mt-0.5">Anunciar Veículo</h2>
            <p className="text-xs text-muted-foreground">Carros, motos, caminhões e utilitários à venda</p>
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
          
          {/* SEÇÃO 1: Categoria do Veículo */}
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" /> 1. Tipo de Veículo
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(Object.keys(TYPE_LABEL) as VehicleType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setVehicleType(t)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all text-center truncate ${
                    vehicleType === t
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.01]"
                      : "bg-background text-muted-foreground border-border/60 hover:border-border"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* SEÇÃO 2: Marca & Modelo */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-primary" /> 2. Identificação do Veículo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Marca</span>
                <input 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  placeholder="Ex: Fiat, Honda, Toyota, VW..." 
                  className="w-full h-11 px-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all" 
                />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Modelo / Versão <span className="text-destructive">*</span></span>
                <input 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)} 
                  placeholder="Ex: Strada 1.4 Freedom, CG 160..." 
                  className="w-full h-11 px-4 rounded-2xl bg-background border border-border/70 text-sm font-bold outline-none focus:border-primary transition-all" 
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Ano de Fabricação / Modelo</span>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input 
                    value={year} 
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} 
                    inputMode="numeric" 
                    placeholder="Ex: 2022" 
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all" 
                  />
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Quilometragem (km)</span>
                <div className="relative">
                  <Gauge className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input 
                    value={km} 
                    onChange={(e) => handleKmChange(e.target.value)} 
                    inputMode="numeric" 
                    placeholder="Ex: 45.000" 
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Preço Pedido */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> 3. Preço Pedido
            </label>
            <div>
              <span className="text-xs font-bold text-foreground block mb-1">Valor de Venda (R$)</span>
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
          </div>

          {/* SEÇÃO 4: Fotos do Veículo */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-primary" /> 4. Fotos do Veículo ({images.length})
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
                  <span className="text-[11px] font-normal text-muted-foreground">Toque para adicionar fotos de vários ângulos</span>
                </>
              )}
            </button>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted shadow-sm group">
                    <img src={img} alt={`Veículo ${idx + 1}`} className="w-full h-full object-cover" />
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

          {/* SEÇÃO 5: Descrição & Opcionais */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" /> 5. Opcionais & Observações (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva opcionais, estado dos pneus, revisões feitas, se aceita troca ou financiamento..."
              rows={3}
              className="w-full p-3.5 rounded-2xl bg-background border border-border/70 text-sm font-medium outline-none focus:border-primary resize-none transition-all"
            />
          </div>

          {/* SEÇÃO 6: Contato */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <label className="text-[11px] uppercase tracking-wider font-extrabold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" /> 6. Dados do Vendedor
            </label>
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
                  className={`py-3 px-1 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                    planMonths === opt.months
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
                Você falará diretamente com o Administrador no WhatsApp para combinar os <strong>{planMonths === 1 ? "1 mês" : planMonths === 12 ? "1 ano" : `${planMonths} meses`}</strong> que seu anúncio ficará ativo e efetuar o pagamento da mensalidade via Pix. Após a confirmação, seu veículo será liberado imediatamente!
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
            disabled={saving || uploadingPhotos || !model.trim() || !contact.trim()}
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

function VehicleImageCarousel({
  images,
  vehicleType,
}: {
  images?: string[] | null;
  vehicleType: VehicleType;
}) {
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

  if (list.length === 0) {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-zinc-900 via-slate-900 to-black select-none flex flex-col items-center justify-center p-6 text-center border-b border-border/40 group-hover:brightness-105 transition-all">
        {/* Subtle grid pattern & glow */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            {vehicleType === "moto" ? (
              <Bike className="w-7 h-7" />
            ) : vehicleType === "caminhao" ? (
              <Truck className="w-7 h-7" />
            ) : (
              <Car className="w-7 h-7" />
            )}
          </div>
          <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 backdrop-blur-sm">
            MT 24HORAS EXPRESS • GARAGEM VIP
          </span>
          <p className="text-[11px] text-zinc-400 font-medium">Fotos disponíveis via WhatsApp com o anunciante</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] w-full bg-muted overflow-hidden select-none group/carousel border-b border-border/40">
      <img
        src={list[index]}
        alt={vehicleType}
        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
      />

      {/* Carrossel: Contador de Fotos */}
      {list.length > 1 && (
        <span className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-full bg-black/80 text-white text-[10px] font-black tracking-wider backdrop-blur-md pointer-events-none shadow-md border border-white/10">
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
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-90 border border-white/15"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próxima foto"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-md active:scale-90 border border-white/15"
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
                i === index ? "w-5 bg-amber-400 shadow-sm" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}