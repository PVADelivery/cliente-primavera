import { motion } from "framer-motion";
import { MapPin, Star, ChevronRight } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { waLink, type Business } from "@/lib/ppp";

/**
 * Card do PPP otimizado para mobile:
 * lista em coluna única, nome e endereço sempre completos (sem recorte),
 * botão direto de WhatsApp e toque no card abre o pop-up de detalhes.
 */
export function ProviderCard({
  business: b,
  onOpen,
  isVip = false,
}: {
  business: Business;
  onOpen: (b: Business) => void;
  isVip?: boolean;
}) {
  const initial = (b.name || "P").trim().charAt(0).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={`rounded-2xl border bg-card overflow-hidden ${
        isVip ? "border-primary/30 shadow-[var(--shadow-card)]" : "border-border shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(b)}
        className="w-full text-left p-3 flex flex-col gap-2 active:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {b.card_image_url ? (
            <img
              src={b.card_image_url}
              alt={b.name}
              className="w-11 h-11 rounded-xl object-cover shrink-0 border border-border"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary font-black flex items-center justify-center shrink-0">
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-black text-foreground leading-snug break-words whitespace-normal">
              {b.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {b.category || "Serviços"}
              </span>
              {b.featured && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-primary text-black">
                  VIP
                </span>
              )}
              <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" />
                {(b.rating ?? 5).toFixed(1)}
              </span>
            </div>
            {b.address && (
              <p className="text-[11px] text-muted-foreground leading-snug break-words whitespace-normal flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                <span>{b.address}</span>
              </p>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        </div>

        {b.whatsapp ? (
          <a
            href={waLink(b.whatsapp, b.name)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full h-9 rounded-xl bg-[#25D366] hover:bg-[#1fb457] text-white font-bold text-[11px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <WhatsappIcon className="w-4 h-4" />
            Chamar no WhatsApp
          </a>
        ) : (
          <span className="w-full h-9 rounded-xl bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center">
            Sem WhatsApp cadastrado
          </span>
        )}
      </button>
    </motion.div>
  );
}
