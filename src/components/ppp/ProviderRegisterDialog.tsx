import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AeroButton, AeroField, aeroInput } from "@/components/aero";
import { Loader2, MapPin, Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { onlyDigits } from "@/lib/ppp";

/** Cadastro real de prestadores no PPP (nome, categoria, WhatsApp, localização e foto). */
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
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Serviços");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const reset = () => {
    setName("");
    setWhatsapp("");
    setAddress("");
    setCoords(null);
    setPhoto(null);
    setPhotoPreview(null);
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
        toast.success("Localização capturada!");
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onPickPhoto = (file: File | null) => {
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const save = useMutation({
    mutationFn: async () => {
      let cardImageUrl: string | null = null;

      if (photo) {
        try {
          const ext = photo.name.split(".").pop() || "jpg";
          const path = `ppp/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("public-assets").upload(path, photo, { upsert: true });
          if (!upErr) {
            cardImageUrl = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
          }
        } catch {
          cardImageUrl = null;
        }
      }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        category,
        whatsapp: onlyDigits(whatsapp),
        phone: onlyDigits(whatsapp),
        address: address.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        card_image_url: cardImageUrl,
        owner_id: user?.id ?? null,
      };

      const { error } = await (supabase as any).from("business_directory").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cadastro enviado! Seu card já aparece no PPP.");
      void queryClient.invalidateQueries({ queryKey: ["directory"] });
      reset();
      onOpenChange(false);
    },
    onError: () => toast.error("Não foi possível salvar o cadastro. Verifique os dados e tente novamente."),
  });

  const canSave = name.trim().length > 1 && onlyDigits(whatsapp).length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black">Cadastrar prestador no PPP</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <AeroField label="Nome / Empresa">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={aeroInput()} placeholder="Ex.: Oficina do João" />
          </AeroField>

          <AeroField label="Categoria">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={aeroInput()}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </AeroField>

          <AeroField label="WhatsApp">
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" maxLength={20} className={aeroInput()} placeholder="(66) 99999-9999" />
          </AeroField>

          <AeroField label="Endereço" hint={coords ? `Localização: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Use sua localização para aparecer no mapa"}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} className={aeroInput()} placeholder="Rua, número, bairro" />
          </AeroField>

          <button
            type="button"
            onClick={useMyLocation}
            className="w-full h-10 rounded-xl border border-border flex items-center justify-center gap-2 text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-primary" />}
            Usar minha localização atual
          </button>

          <AeroField label="Foto do card">
            <label className="w-full h-24 rounded-2xl border border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden bg-muted/40">
              {photoPreview ? (
                <img src={photoPreview} alt="Prévia" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Camera className="w-4 h-4" /> Selecionar foto
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          </AeroField>

          <AeroButton onClick={() => save.mutate()} disabled={!canSave || save.isPending} className="flex items-center justify-center gap-2">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar cadastro
          </AeroButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
