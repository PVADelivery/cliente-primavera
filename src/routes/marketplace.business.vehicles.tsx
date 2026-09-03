import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search, Plus, Loader2, X, Phone, Gauge, Calendar, Fuel, Car, UploadCloud, Image as ImageIcon, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, CalendarClock } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/property";
import type { Vehicle, VehicleType } from "@/types/database";
import { AeroSkeletonList, AeroEmptyState, AeroPageHeader } from "@/components/aero";
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
          className="aero-focus h-11 rounded-2xl grid place-items-center text-xs font-semibold bg-card border border-border/60 text-muted-foreground hover:bg-muted active:bg-btn-active active:text-btn-active-ink transition-colors"
        >
          Imóveis
        </Link>
        <span className="h-11 rounded-2xl grid place-items-center text-xs font-bold bg-btn-surface text-btn-ink border border-btn-line shadow-sm">
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
            className={`tap-target aero-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              type === t.key
                ? "bg-btn-surface text-btn-ink border-btn-line shadow-sm"
                : "bg-card text-muted-foreground border-border/60 hover:bg-muted active:bg-btn-active active:text-btn-active-ink"
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
        <AeroSkeletonList count={3} lines={3} label="Carregando veículos" />
      ) : list.length === 0 ? (
        <AeroEmptyState
          title="Nenhum veículo anunciado"
          description="Toque em “Anunciar” para publicar o seu veículo à venda."
        />
      ) : (
        <ul className="space-y-3">
          {list.map((v) => (
            <li
              key={v.id}
              className="rounded-3xl border border-border/50 bg-card p-4 sm:p-5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <VehicleImageCarousel images={v.images} vehicleType={v.vehicle_type} />

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

              {v.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{v.description}</p>}

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

              <div className="flex items-center justify-between mt-3 gap-3 pt-2 border-t border-border/50">
                <p className="font-display font-black text-xl text-black dark:text-white leading-tight">{formatPrice(v.price)}</p>
                {v.contact_phone && (
                  <a
                    href={`https://wa.me/55${v.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Olá! Tenho interesse no veículo *${v.brand ? `${v.brand} ` : ""}${v.model}* anunciado na Central de Negócios do MT 24horas express.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                    title="Chamar no WhatsApp"
                  >
                    <WhatsappIcon className="w-3.5 h-3.5" /> WhatsApp
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
  const [planMonths, setPlanMonths] = useState<number>(1);
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
      setError("Por favor, informe seu telefone / WhatsApp de contato.");
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
        km: km ? Number(km) : null,
        price: cleanPrice,
        description: description.trim() || null,
        contact_phone: contact.trim() || null,
        images: images.length > 0 ? images : null,
        is_active: false, // Só fica visível no app após aprovação e pagamento com admin!
      })
      .select("id")
      .single();

    setSaving(false);

    if (err || !insertedVeh) {
      setError("Não foi possível enviar agora. Tente novamente.");
      console.info("[vehicles insert]", err?.code, err?.message);
      return;
    }

    const vehId = insertedVeh.id;
    const shortId = `#VEH-${vehId.slice(0, 8).toUpperCase()}`;

    // Monta a mensagem limpa com ID e emojis reduzidos para o WhatsApp da administração
    const valorFormatado = cleanPrice ? `R$ ${cleanPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A combinar";
    const msg = 
`Olá Administrador! Cadastrei um anúncio de Veículo no MT 24horas express e solicito a liberação:

*ID do Anúncio:* ${shortId} (${vehId})
*Tipo:* ${TYPE_LABEL[vehicleType] ?? vehicleType}
*Veículo:* ${brand.trim() ? `${brand.trim()} ` : ""}${model.trim()}${year ? ` (${year})` : ""}
*Quilometragem:* ${km ? `${km} km` : "Não informado"}
*Preço Pedido:* ${valorFormatado}
*Tempo de Permanência:* ${planMonths} ${planMonths === 1 ? "mês" : "meses"}
*Objetivo:* Combinar valor da mensalidade e efetuar pagamento Pix para liberação.

*WhatsApp:* ${contact.trim()}
*Detalhes:* ${description.trim() || "Sem observações adicionais"}
${images.length > 0 ? `*Fotos:* ${images.length} foto(s) anexada(s)` : ""}

Por favor, me informe o valor da mensalidade e a chave Pix para eu efetuar o pagamento.`;

    const adminWaUrl = `https://wa.me/556697196937?text=${encodeURIComponent(msg)}`;
    window.open(adminWaUrl, "_blank", "noopener,noreferrer");

    toast.success(`Anúncio ${shortId} enviado com sucesso! Combine a mensalidade no WhatsApp para ativação.`, {
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
            <h2 className="font-display font-bold text-lg">Anunciar veículo</h2>
            <p className="text-[11px] text-muted-foreground">O anúncio será revisado pelo administrador antes de ir ao ar</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
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

        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca (ex.: Fiat, Honda, Toyota)" className={field} />
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Modelo (ex.: Strada 1.4 Freedom, CG 160)" className={field} />
        
        <div className="grid grid-cols-2 gap-2">
          <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Ano (ex: 2022)" className={field} />
          <input value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Quilometragem (km)" className={field} />
        </div>
        
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="Preço pedido (R$)" className={field} />
        
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva opcionais, estado dos pneus, revisões, documentação..."
          rows={3}
          className="w-full p-4 rounded-2xl bg-background border border-border/60 text-sm outline-none focus:border-primary resize-none"
        />

        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Seu Telefone / WhatsApp de contato *" className={field} />

        {/* Upload de Fotos do Veículo */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-primary" /> Fotos do Veículo ({images.length})
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
                <span>Selecionar fotos do celular / galeria</span>
              </>
            )}
          </button>

          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 pt-1">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group">
                  <img src={img} alt={`Veículo ${idx + 1}`} className="w-full h-full object-cover" />
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

        {/* Escolha do Tempo de Permanência / Mensalidade */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-emerald-500" />
              Tempo que deseja manter ativo:
            </label>
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
              {planMonths} {planMonths === 1 ? "Mês" : "Meses"}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPlanMonths(m)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                  planMonths === m
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]"
                    : "bg-background text-muted-foreground border-border/60 hover:border-border"
                }`}
              >
                {m === 12 ? "1 Ano" : `${m} ${m === 1 ? "mês" : "meses"}`}
              </button>
            ))}
          </div>

          {/* Card explicativo sobre Mensalidade e Pagamento com Admin */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Mensalidade & Ativação no Sistema</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Você falará diretamente com o Administrador no WhatsApp para combinar os <strong>{planMonths} {planMonths === 1 ? "mês" : "meses"}</strong> que seu anúncio ficará ativo e efetuar o <strong>pagamento da mensalidade via Pix</strong>. Após a confirmação, seu veículo será liberado imediatamente!
            </p>
          </div>
        </div>

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}

        <div className="pt-2">
          <button
            onClick={submit}
            disabled={saving || uploadingPhotos || !model.trim()}
            className="w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md active:scale-98 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Enviando anúncio...
              </>
            ) : (
              <>
                <WhatsappIcon className="w-4 h-4" /> Combinar Mensalidade ({planMonths} {planMonths === 1 ? "mês" : "meses"}) no WhatsApp
              </>
            )}
          </button>
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

  if (list.length === 0) return null;

  return (
    <div className="relative aspect-[16/9] w-full bg-muted rounded-2xl overflow-hidden select-none mb-3 group/carousel">
      <img
        src={list[index]}
        alt={vehicleType}
        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
      />

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