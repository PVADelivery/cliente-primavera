import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AeroField, aeroInput } from "@/components/aero";
import {
  Loader2,
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  ShieldCheck,
  X,
  Star,
  Search,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { onlyDigits, formatPhone } from "@/lib/ppp";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { searchCityStreets, type CityStreet } from "@/data/primaveraStreets";

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

  const [step, setStep] = useState<"form" | "success">("form");

  const [name, setName] = useState("");
  const cleanCategories = categories.filter((c) => c.toLowerCase() !== "tudo");
  const [category, setCategory] = useState(cleanCategories[0] || "Serviços");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  
  // Endereço e Mapa
  const [address, setAddress] = useState("");
  const [streetQuery, setStreetQuery] = useState("");
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hours, setHours] = useState("Seg a Sex 08:00 às 18:00");
  const [locating, setLocating] = useState(false);
  
  // Foto
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const autocompleteRef = useRef<HTMLDivElement | null>(null);

  // Sugestões de ruas de Primavera do Leste
  const streetSuggestions = useMemo(() => {
    if (!streetQuery || streetQuery.trim().length < 2) return [];
    return searchCityStreets(streetQuery, 5);
  }, [streetQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowStreetSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const reset = () => {
    setStep("form");
    setName("");
    setCategory(cleanCategories[0] || "Serviços");
    setWhatsapp("");
    setDescription("");
    setAddress("");
    setStreetQuery("");
    setShowStreetSuggestions(false);
    setHours("Seg a Sex 08:00 às 18:00");
    setCoords(null);
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handlePhoneChange = (val: string) => {
    const raw = onlyDigits(val).slice(0, 11);
    setWhatsapp(formatPhone(raw));
  };

  const handleSelectStreet = (st: CityStreet) => {
    const full = `${st.name} - ${st.bairro}, Primavera do Leste - MT`;
    setAddress(full);
    setStreetQuery(st.name);
    setCoords({ lat: st.lat, lng: st.lon });
    setShowStreetSuggestions(false);
    toast.success(`Endereço selecionado no mapa: ${st.name}`);
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
        if (!address) {
          setAddress("Localização atual (GPS)");
        }
        toast.success("Localização GPS capturada para o mapa!");
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter a localização. Selecione a rua pelo buscador.");
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
      // Se não escolheu coordenadas manualmente, tenta resolver via busca de ruas
      let finalLat = coords?.lat ?? null;
      let finalLng = coords?.lng ?? null;

      if (!finalLat || !finalLng) {
        const found = searchCityStreets(address || streetQuery || name, 1);
        if (found.length > 0) {
          finalLat = found[0].lat;
          finalLng = found[0].lon;
        } else {
          // Coordenadas padrão do centro de Primavera com leve dispersão
          finalLat = -15.5583 + (Math.random() - 0.5) * 0.01;
          finalLng = -54.2965 + (Math.random() - 0.5) * 0.01;
        }
      }

      let cardImageUrl: string | null = photoPreview;

      if (photo) {
        try {
          const ext = photo.name.split(".").pop() || "jpg";
          const path = `ppp/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("public-assets").upload(path, photo, { upsert: true });
          if (!upErr) {
            cardImageUrl = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
          }
        } catch {}
      }

      const businessData = {
        id: `local_ppp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        category: category.trim(),
        whatsapp: onlyDigits(whatsapp),
        phone: onlyDigits(whatsapp),
        address: address.trim() || (streetQuery ? `${streetQuery}, Primavera do Leste - MT` : "Primavera do Leste - MT"),
        hours: hours.trim() || "Seg a Sex 08:00 às 18:00",
        website: description.trim() || null,
        rating: 5.0,
        featured: true,
        card_image_url: cardImageUrl,
        card_style: "dark",
        latitude: finalLat,
        longitude: finalLng,
        owner_id: user?.id ?? null,
        created_at: new Date().toISOString(),
      };

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
        console.warn("[PPP] Offline fallback:", e);
      }

      try {
        const localList = JSON.parse(localStorage.getItem("pva_local_directory_providers") || "[]");
        localList.unshift(businessData);
        localStorage.setItem("pva_local_directory_providers", JSON.stringify(localList.slice(0, 50)));
      } catch {}

      return businessData;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["directory"] });
      setStep("success");
      toast.success("Cadastro realizado com sucesso!");
    },
    onError: (err: any) => {
      console.error("[PPP] Erro ao cadastrar:", err);
      setStep("success");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o Nome do Profissional ou Empresa.");
      return;
    }
    if (onlyDigits(whatsapp).length < 10) {
      toast.error("Informe o WhatsApp de contato com DDD (mínimo 10 dígitos).");
      return;
    }
    if (!address.trim() && !streetQuery.trim() && !coords) {
      toast.error("Informe o Endereço ou selecione a rua para aparecer no mapa.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-xl w-[calc(100vw-1.5rem)] max-h-[92vh] overflow-y-auto rounded-3xl p-0 border border-border shadow-2xl bg-card">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-primary/20 p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center font-black text-sm shadow-sm">
                PPP
              </span>
              <div>
                <DialogTitle className="text-base font-black text-foreground tracking-tight">
                  Cadastro de Prestador & Empresa
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium">
                  Anuncie no catálogo oficial e apareça no Mapa do MT 24horas express
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span>Preencha os dados e o endereço para que os clientes de Primavera encontrem seus serviços no catálogo e no mapa.</span>
            </div>

            {/* 1. Nome do Negócio */}
            <AeroField label="Nome do Profissional ou Empresa *" hint="Como será exibido no app">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className={aeroInput()}
                placeholder="Ex.: Oficina Buritis, Dra. Mariana, Eletricista Silva"
                required
              />
            </AeroField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 2. Categoria */}
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

              {/* 3. WhatsApp */}
              <AeroField label="WhatsApp para Contato *" hint="Clientes chamarão direto aqui">
                <div className="relative">
                  <input
                    value={whatsapp}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    inputMode="tel"
                    maxLength={15}
                    className={`${aeroInput()} pl-10`}
                    placeholder="(66) 99999-9999"
                    required
                  />
                  <WhatsappIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#25D366]" />
                </div>
              </AeroField>
            </div>

            {/* 4. SEÇÃO DE ENDEREÇO & MAPA */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Endereço & Localização no Mapa *
                </span>
                {coords && (
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ponto Marcado
                  </span>
                )}
              </div>

              {/* Campo com Autocomplete de Ruas */}
              <div className="relative" ref={autocompleteRef}>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Digite a Rua / Avenida ou Bairro (Primavera do Leste)
                </label>
                <div className="relative">
                  <input
                    value={address || streetQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddress(val);
                      setStreetQuery(val);
                      setShowStreetSuggestions(true);
                      if (coords) setCoords(null);
                    }}
                    onFocus={() => setShowStreetSuggestions(true)}
                    maxLength={160}
                    className={`${aeroInput()} pl-10`}
                    placeholder="Ex: Rua Ari Kriefe, Av. Cuiabá, Buritis..."
                    required
                  />
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {(address || streetQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddress("");
                        setStreetQuery("");
                        setCoords(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown de Sugestões de Ruas de Primavera */}
                {showStreetSuggestions && streetSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-xl overflow-hidden divide-y divide-border/60 max-h-56 overflow-y-auto">
                    {streetSuggestions.map((st, idx) => (
                      <button
                        key={`${st.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectStreet(st)}
                        className="w-full text-left p-3 hover:bg-amber-400/10 transition-colors flex items-start gap-2.5"
                      >
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{st.name}</p>
                          <p className="text-[10px] text-muted-foreground">{st.bairro} • Primavera do Leste - MT</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão GPS */}
              <button
                type="button"
                onClick={useMyLocation}
                className="w-full h-10 rounded-xl border border-border bg-card hover:bg-muted/60 flex items-center justify-center gap-2 text-xs font-bold text-foreground transition-all active:scale-[0.99]"
              >
                {locating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <Navigation className="w-4 h-4 text-amber-500" />
                )}
                <span>{coords ? "Localização GPS Atualizada ✓" : "Usar meu GPS atual"}</span>
              </button>
            </div>

            {/* 5. Horário de Atendimento */}
            <AeroField label="Horário de Atendimento" hint="Exibido no card do prestador">
              <div className="relative">
                <input
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  maxLength={80}
                  className={`${aeroInput()} pl-10`}
                  placeholder="Seg a Sex 08:00 às 18:00, Sáb 08:00 às 12:00"
                />
                <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </AeroField>

            {/* 6. Descrição dos Serviços */}
            <AeroField label="Descrição dos Serviços / Especialidades (Opcional)" hint="Destaque seus diferenciais para os clientes">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={250}
                rows={2}
                className={`${aeroInput()} resize-none`}
                placeholder="Ex.: Atendimento 24h, peças originais, orçamento sem compromisso..."
              />
            </AeroField>

            {/* 7. Foto de Capa / Logotipo */}
            <AeroField label="Foto de Capa ou Logotipo (Opcional)" hint="PNG, JPG até 5MB">
              <label className="w-full h-28 rounded-2xl border-2 border-dashed border-border hover:border-amber-400/60 flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-muted/20 hover:bg-muted/40 transition-all relative">
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Prévia" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1.5">
                      <Camera className="w-4 h-4" /> Trocar foto
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-amber-400/15 text-amber-500 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Toque para selecionar foto ou logotipo</span>
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

            {/* Prévia do Card */}
            {name && (
              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-sm space-y-1.5">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> Prévia no catálogo:
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase() || "P"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-foreground truncate">{name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-bold">{category}</span>
                      <span className="truncate">{address || "Primavera do Leste"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Envio */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full tap-target inline-flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 shadow-lg shadow-amber-400/25 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Cadastrar e Anunciar no Mapa</span>
              </button>
            </div>
          </form>
        ) : (
          /* TELA DE SUCESSO & ATIVAÇÃO */
          <div className="p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-black text-foreground">
                Cadastro Salvo com Sucesso! 🎉
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Seu perfil foi registrado e já pode ser localizado no mapa. Para ativar o seu <strong>Selo de Destaque VIP</strong>, entre em contato com o suporte.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-card border border-amber-400/30 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Perfil Prestador MT 24 Horas
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950">
                  Pronto
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
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Endereço no Mapa:</span>
                  <span className="font-bold text-foreground truncate max-w-[200px]">{address}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={openAdminWhatsApp}
                className="w-full tap-target inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl text-sm font-black bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg shadow-[#25D366]/25 hover:brightness-105 active:scale-[0.98] transition-all"
              >
                <WhatsappIcon className="w-5 h-5 text-white" />
                <span>Falar com o Admin no WhatsApp</span>
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
      </DialogContent>
    </Dialog>
  );
}
