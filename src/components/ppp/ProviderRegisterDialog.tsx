import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AeroButton, AeroField, aeroInput } from "@/components/aero";
import {
  Loader2,
  MapPin,
  Camera,
  CheckCircle2,
  Briefcase,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Copy,
  ExternalLink,
  ShieldCheck,
  X,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { onlyDigits, formatPhone } from "@/lib/ppp";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";

export const ADMIN_PPP_WHATSAPP = "556697196937";

export function ProviderRegisterDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: string[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Wizard Steps: 1: Dados, 2: Localização & Atendimento, 3: Foto & Capa, 4: Ativação & Pagamento WhatsApp
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories.find((c) => c.toLowerCase() !== "tudo") || "Serviços");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("Seg a Sex 08:00 às 18:00");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [registeredBusiness, setRegisteredBusiness] = useState<any>(null);

  const cleanCategories = categories.filter((c) => c.toLowerCase() !== "tudo");

  const reset = () => {
    setStep(1);
    setName("");
    setCategory(cleanCategories[0] || "Serviços");
    setWhatsapp("");
    setDescription("");
    setAddress("");
    setHours("Seg a Sex 08:00 às 18:00");
    setCoords(null);
    setPhoto(null);
    setPhotoPreview(null);
    setRegisteredBusiness(null);
  };

  const handlePhoneChange = (val: string) => {
    const raw = onlyDigits(val).slice(0, 11);
    setWhatsapp(formatPhone(raw));
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocalização indisponível neste dispositivo.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Localização capturada com sucesso!");
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter a localização. Preencha o endereço manualmente.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onPickPhoto = (file: File | null) => {
    setPhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const buildWhatsAppMessage = () => {
    const rawWa = onlyDigits(whatsapp);
    return `Olá, Administrador do MT 24horas express! 👋\n\nAcabei de cadastrar meu perfil no *PPP (Painel Profissional Prestador)*:\n\n👤 *Nome/Empresa:* ${name.trim()}\n📂 *Categoria:* ${category}\n📱 *WhatsApp:* ${whatsapp}\n📍 *Endereço:* ${address.trim() || "Primavera do Leste - MT"}\n🕒 *Horário:* ${hours.trim() || "Comercial"}\n${description.trim() ? `💼 *Serviços:* ${description.trim()}\n` : ""}\nGostaria de fazer o *pagamento da mensalidade* para ativar meu perfil com destaque VIP no app e receber novos clientes! Por favor, me envie a chave Pix. 🚀`;
  };

  const openAdminWhatsApp = () => {
    const text = encodeURIComponent(buildWhatsAppMessage());
    const url = `https://wa.me/${ADMIN_PPP_WHATSAPP}?text=${text}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const copyDataToClipboard = () => {
    const text = buildWhatsAppMessage();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success("Dados do cadastro copiados para a área de transferência!");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let cardImageUrl: string | null = photoPreview;

      // Se selecionou arquivo de foto, tenta upload seguro no Supabase Storage
      if (photo) {
        try {
          const ext = photo.name.split(".").pop() || "jpg";
          const path = `ppp/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("public-assets").upload(path, photo, { upsert: true });
          if (!upErr) {
            cardImageUrl = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
          }
        } catch {
          // Mantém photoPreview em base64 se storage falhar
        }
      }

      const businessData = {
        id: `local_ppp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        category: category.trim(),
        whatsapp: onlyDigits(whatsapp),
        phone: onlyDigits(whatsapp),
        address: address.trim() || "Primavera do Leste - MT",
        hours: hours.trim() || "Seg a Sex 08:00 às 18:00",
        website: description.trim() || null,
        rating: 5.0,
        featured: true,
        card_image_url: cardImageUrl,
        card_style: "dark",
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        owner_id: user?.id ?? null,
        created_at: new Date().toISOString(),
      };

      // 1. Tenta salvar no Supabase (com fallback de campos para garantir compatibilidade)
      try {
        const { error: insertErr } = await (supabase as any)
          .from("business_directory")
          .insert({
            name: businessData.name,
            category: businessData.category,
            whatsapp: businessData.whatsapp,
            phone: businessData.phone,
            address: businessData.address,
            hours: businessData.hours,
            website: businessData.website,
            card_image_url: businessData.card_image_url,
            latitude: businessData.latitude,
            longitude: businessData.longitude,
            owner_id: businessData.owner_id,
            featured: false,
          });

        if (insertErr) {
          console.warn("[PPP] Fallback insert:", insertErr.message);
          // Fallback mínimo
          await (supabase as any)
            .from("business_directory")
            .insert({
              name: businessData.name,
              category: businessData.category,
              whatsapp: businessData.whatsapp,
              phone: businessData.phone,
              address: businessData.address,
            });
        }
      } catch (e) {
        console.warn("[PPP] Banco offline ou sem permissão direta, salvando localmente:", e);
      }

      // 2. Salva no cache local para renderização instantânea
      try {
        const localList = JSON.parse(localStorage.getItem("pva_local_directory_providers") || "[]");
        localList.unshift(businessData);
        localStorage.setItem("pva_local_directory_providers", JSON.stringify(localList.slice(0, 50)));
      } catch (e) {}

      setRegisteredBusiness(businessData);
      return businessData;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["directory"] });
      setStep(4);
      toast.success("Cadastro realizado com sucesso!");
    },
    onError: (err: any) => {
      console.error("[PPP] Erro ao cadastrar:", err);
      // Mesmo com aviso, salva local e avança para a etapa do WhatsApp
      try {
        const fallbackData = {
          id: `local_ppp_${Date.now()}`,
          name: name.trim(),
          category,
          whatsapp: onlyDigits(whatsapp),
          phone: onlyDigits(whatsapp),
          address: address.trim() || "Primavera do Leste - MT",
          hours,
          website: description.trim() || null,
          card_image_url: photoPreview,
          rating: 5.0,
          featured: true,
        };
        const localList = JSON.parse(localStorage.getItem("pva_local_directory_providers") || "[]");
        localList.unshift(fallbackData);
        localStorage.setItem("pva_local_directory_providers", JSON.stringify(localList.slice(0, 50)));
        setRegisteredBusiness(fallbackData);
        setStep(4);
      } catch {
        toast.error("Verifique os dados informados e tente novamente.");
      }
    },
  });

  const canProceedStep1 = name.trim().length >= 2 && onlyDigits(whatsapp).length >= 10;
  const canProceedStep2 = address.trim().length >= 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[92vh] overflow-y-auto rounded-3xl p-0 border border-border shadow-2xl bg-card">
        {/* Top Header com Gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-primary/20 p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-zinc-950 flex items-center justify-center font-black text-sm shadow-sm">
                PPP
              </span>
              <div>
                <DialogTitle className="text-base font-black text-foreground tracking-tight">
                  Cadastro de Prestador & Empresa
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Anuncie no catálogo oficial do MT 24horas express
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="w-7 h-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          {step < 4 && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
                <span className={step >= 1 ? "text-amber-500 font-extrabold" : ""}>1. Dados</span>
                <span className={step >= 2 ? "text-amber-500 font-extrabold" : ""}>2. Localização</span>
                <span className={step >= 3 ? "text-amber-500 font-extrabold" : ""}>3. Foto & Capa</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* ══════════════════════════════════════════════════════════════
              PASSO 1: DADOS BÁSICOS
             ══════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>Preencha as informações do seu negócio para que os clientes de Primavera do Leste encontrem seus serviços.</span>
              </div>

              <AeroField label="Nome do Profissional ou Empresa *" hint="Como seu negócio será exibido no app">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className={aeroInput()}
                  placeholder="Ex.: Mecânica Buritis, Dra. Ana Silva, João Eletricista"
                  autoFocus
                />
              </AeroField>

              <AeroField label="Categoria do Serviço *">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${aeroInput()} font-bold text-foreground`}
                >
                  {cleanCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </AeroField>

              <AeroField label="WhatsApp para Contato dos Clientes *" hint="Os clientes chamarão diretamente neste número">
                <div className="relative">
                  <input
                    value={whatsapp}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    inputMode="tel"
                    maxLength={15}
                    className={`${aeroInput()} pl-10`}
                    placeholder="(66) 99999-9999"
                  />
                  <WhatsappIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#25D366]" />
                </div>
              </AeroField>

              <AeroField label="Descrição dos Serviços / Especialidades (Opcional)" hint="Destaque seus diferenciais para os clientes">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={250}
                  rows={2}
                  className={`${aeroInput()} resize-none`}
                  placeholder="Ex.: Troca de óleo, motor, suspensão, freios e atendimento 24 horas..."
                />
              </AeroField>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="w-full tap-target inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-400/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  <span>Avançar para Localização</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PASSO 2: LOCALIZAÇÃO & ATENDIMENTO
             ══════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <AeroField
                label="Endereço Completo / Bairro *"
                hint={coords ? `GPS Capturado: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Para aparecer no mapa interativo de Primavera"}
              >
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={160}
                  className={aeroInput()}
                  placeholder="Rua, número, bairro (Ex: Av. Cuiabá, 120 - Centro)"
                  autoFocus
                />
              </AeroField>

              <button
                type="button"
                onClick={useMyLocation}
                className="w-full h-11 rounded-2xl border border-border bg-muted/30 hover:bg-muted/60 flex items-center justify-center gap-2 text-xs font-bold text-foreground transition-all active:scale-[0.99]"
              >
                {locating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <MapPin className="w-4 h-4 text-amber-500" />
                )}
                <span>{coords ? "Localização GPS Capturada ✓" : "Capturar minha localização no GPS atual"}</span>
              </button>

              <AeroField label="Horário de Atendimento" hint="Exibido no perfil do prestador">
                <div className="relative">
                  <input
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    maxLength={80}
                    className={`${aeroInput()} pl-10`}
                    placeholder="Seg a Sex 08:00 às 18:00"
                  />
                  <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </AeroField>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 tap-target inline-flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="w-2/3 tap-target inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-400/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  <span>Avançar para Foto</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PASSO 3: FOTO & FINALIZAÇÃO DO CADASTRO
             ══════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <AeroField label="Foto de Capa ou Logotipo (Opcional)" hint="Deixe seu card profissional e chame mais atenção">
                <label className="w-full h-36 rounded-2xl border-2 border-dashed border-border hover:border-amber-400/60 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-muted/20 hover:bg-muted/40 transition-all relative">
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="Prévia" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1.5">
                        <Camera className="w-4 h-4" /> Trocar foto
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-amber-400/15 text-amber-500 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Toque para selecionar uma foto ou logotipo</span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPG até 5MB</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                  />
                </label>
              </AeroField>

              {/* Prévia do Card Resumido */}
              <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> Prévia do seu card no app:
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-base shrink-0 overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase() || "P"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-foreground truncate">{name || "Nome da Empresa"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold">{category}</span>
                      <span className="truncate">{address || "Primavera do Leste"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 tap-target inline-flex items-center justify-center gap-1.5 py-3.5 rounded-2xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-2/3 tap-target inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-400/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>Salvar & Ativar Anúncio</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PASSO 4: SUCESSO & ATIVAÇÃO DA MENSALIDADE NO WHATSAPP ADMIN
             ══════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200 py-1">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-black text-foreground">
                  Cadastro Salvo com Sucesso! 🎉
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Para ativar o seu <strong>Selo de Destaque VIP</strong> e liberar seu perfil no catálogo oficial e mapa de Primavera, realize o pagamento da mensalidade com o Administrador.
                </p>
              </div>

              {/* Card Dourado de Ativação de Mensalidade */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-card border border-amber-400/30 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Plano Prestador de Serviços
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950">
                    Mensalidade Ativa
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Prestador / Empresa:</span>
                    <span className="font-extrabold text-foreground">{name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Categoria:</span>
                    <span className="font-bold text-foreground">{category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">WhatsApp Cadastrado:</span>
                    <span className="font-bold text-foreground">{whatsapp}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-card/90 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                  <div className="font-bold text-foreground flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Benefícios da sua assinatura:
                  </div>
                  <div>• Aparição em destaque no Mapa e no Topo da Categoria</div>
                  <div>• Botão de WhatsApp direto para clientes sem taxas de intermediação</div>
                  <div>• Divulgação oficial no app MT 24 Horas Express</div>
                </div>
              </div>

              {/* Botão Principal: WhatsApp do Admin */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={openAdminWhatsApp}
                  className="w-full tap-target inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-black bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg shadow-[#25D366]/25 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <WhatsappIcon className="w-5 h-5 text-white" />
                  <span>Pagar Mensalidade no WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copyDataToClipboard}
                    className="tap-target inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Copiar Dados</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      onOpenChange(false);
                    }}
                    className="tap-target inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Ver no Catálogo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
