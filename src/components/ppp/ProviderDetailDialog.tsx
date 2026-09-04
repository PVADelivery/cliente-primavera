import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { Phone, MapPin, Globe, Clock, Star, Navigation, Copy, Share2, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatPhone, getMapsUrl, onlyDigits, openMaps, waLink, type Business } from "@/lib/ppp";

export function ProviderDetailDialog({
  business: b,
  open,
  onOpenChange,
}: {
  business: Business | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!b) return null;
  const phoneDisplay = b.whatsapp || b.phone;

  const share = async () => {
    const text = `Confira *${b.name}* (${b.category}) no PPP — MT 24horas express!`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: b.name, text, url });
        return;
      } catch {}
    }
    navigator.clipboard?.writeText(`${text}\n${url}`);
    toast.success("Link copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-3xl p-0">
        {b.card_image_url ? (
          <div className="w-full aspect-[16/7] bg-muted overflow-hidden rounded-t-3xl">
            <img src={b.card_image_url} alt={b.name} className="w-full h-full object-cover" />
          </div>
        ) : null}

        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-black leading-snug break-words">{b.name}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {b.category || "Serviços"}
              </span>
              {b.featured && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary text-black flex items-center gap-1">
                  <Star className="w-2.5 h-2.5" /> VIP
                </span>
              )}
              <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {(b.rating ?? 5).toFixed(1)}
              </span>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 text-[13px]">
            {b.address && (
              <button
                type="button"
                onClick={(e) => openMaps(b.address!, e)}
                className="w-full flex items-start gap-2 text-left text-muted-foreground hover:text-foreground transition-colors"
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span className="break-words leading-snug">{b.address}</span>
              </button>
            )}

            {phoneDisplay && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-primary" />
                <span className="font-mono font-semibold">{formatPhone(phoneDisplay)}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(phoneDisplay);
                    toast.success("Telefone copiado!");
                  }}
                  aria-label="Copiar telefone"
                  className="ml-auto p-1 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {b.email && (
              <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground break-all">
                <Mail className="w-4 h-4 shrink-0 text-primary" />
                <span>{b.email}</span>
              </a>
            )}

            {b.hours && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span className="break-words">{b.hours}</span>
              </div>
            )}

            {b.website && (
              <a
                href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span>{b.website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {b.whatsapp ? (
              <a
                href={waLink(b.whatsapp, b.name)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl bg-[#25D366] hover:bg-[#1fb457] text-white font-bold text-xs active:scale-[0.97] transition-all"
              >
                <WhatsappIcon className="w-4 h-4" />
                Chamar no WhatsApp
              </a>
            ) : b.phone ? (
              <a
                href={`tel:${onlyDigits(b.phone)}`}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl bg-primary text-black font-bold text-xs"
              >
                <Phone className="w-4 h-4" /> Ligar agora
              </a>
            ) : (
              <div className="flex-1 h-11 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-semibold">
                Sem contato cadastrado
              </div>
            )}

            {b.address && (
              <a
                href={getMapsUrl(b.address)}
                onClick={(e) => openMaps(b.address!, e)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir rota no Google Maps"
                className="h-11 w-11 rounded-2xl border border-border flex items-center justify-center text-primary shrink-0"
              >
                <Navigation className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={share}
              aria-label="Compartilhar"
              className="h-11 w-11 rounded-2xl border border-border flex items-center justify-center text-muted-foreground shrink-0"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
