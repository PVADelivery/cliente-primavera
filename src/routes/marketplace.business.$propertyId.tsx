import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, MapPin, Heart, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { supabase } from "@/lib/supabase";
import type { Property } from "@/types/database";
import { formatPrice } from "@/lib/property";
import { PropertyAttrs } from "./marketplace.business.index";
import { usePropertyFavorites } from "@/hooks/usePropertyFavorites";

export const Route = createFileRoute("/marketplace/business/$propertyId")({
  head: () => ({
    meta: [
      { title: "Imóvel — Central de Negócios | MT 24horas express" },
      { name: "description", content: "Detalhes do imóvel: área, quartos, vagas, banheiros, valor e contato da imobiliária." },
      { property: "og:title", content: "Imóvel — Central de Negócios" },
      { property: "og:description", content: "Veja área, cômodos, valor e fale direto com a imobiliária." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropertyDetail,
});

const TYPE_LABEL: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  sala: "Sala",
  kitnet: "Kitnet",
  terreno: "Terreno",
};

function PropertyDetail() {
  const { propertyId } = useParams({ from: "/marketplace/business/$propertyId" });
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = usePropertyFavorites();

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async (): Promise<Property | null> => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .maybeSingle();
      if (error) {
        console.info("[property]", error.code, error.message);
        return null;
      }
      return (data as Property) ?? null;
    },
  });

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
        <h1 className="font-display text-lg font-bold leading-tight">Detalhes do imóvel</h1>
        <button
          onClick={() => toggleFavorite(propertyId)}
          aria-label={isFavorite(propertyId) ? "Remover dos favoritos" : "Salvar nos favoritos"}
          aria-pressed={isFavorite(propertyId)}
          className="ml-auto w-9 h-9 rounded-full grid place-items-center bg-card border border-border/50"
        >
          <Heart
            className={`w-4 h-4 ${isFavorite(propertyId) ? "text-primary fill-current" : "text-muted-foreground"}`}
          />
        </button>
      </div>

      {isLoading ? (
        <div className="h-52 rounded-3xl bg-card border border-border/40 animate-pulse" />
      ) : !property ? (
        <div className="rounded-3xl border border-border/50 bg-card p-8 text-center">
          <p className="font-display font-bold text-base">Imóvel não encontrado</p>
          <p className="text-xs text-muted-foreground mt-1.5">Ele pode ter sido removido pela imobiliária.</p>
        </div>
      ) : (
        <div
          className="rounded-3xl border border-border/50 bg-card overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {/* Carrossel de Fotos do Imóvel */}
          <PropertyDetailCarousel
            images={property.images}
            dealType={property.deal_type}
            propertyType={property.property_type}
          />

          <div className="p-6">
            <h2 className="font-display font-bold text-xl mt-1 leading-tight">
              {TYPE_LABEL[property.property_type] ?? property.property_type} em {property.neighborhood ?? "Bairro não informado"}
            </h2>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> {[property.city, property.state].filter(Boolean).join(", ")}
            </p>

            {property.description && (
              <p className="text-sm text-muted-foreground mt-4 whitespace-pre-line leading-relaxed">{property.description}</p>
            )}

            <div className="mt-4">
              <PropertyAttrs property={property} />
            </div>

            <p className="font-display font-black text-2xl text-black dark:text-white mt-5">
              {formatPrice(property.price)}
              {property.deal_type === "locacao" && <span className="text-sm font-normal text-muted-foreground"> /mês</span>}
            </p>

            {property.agency_name && (
              <p className="text-xs text-muted-foreground mt-2">Anunciado por: <span className="font-bold text-foreground">{property.agency_name}</span></p>
            )}

            {property.contact_phone && (
              <a
                href={`https://wa.me/55${property.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Olá! Tenho interesse no imóvel *${TYPE_LABEL[property.property_type] ?? property.property_type}* (${property.deal_type === "venda" ? "Venda" : "Locação"}) no bairro *${property.neighborhood ?? "Primavera do Leste"}* anunciado na Central de Negócios do MT 24horas express.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
              >
                <WhatsappIcon className="w-5 h-5" /> Falar no WhatsApp ({property.contact_phone})
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyDetailCarousel({
  images,
  dealType,
  propertyType,
}: {
  images?: string[] | null;
  dealType: "locacao" | "venda";
  propertyType: string;
}) {
  const [index, setIndex] = useState(0);
  const list = useMemo(() => (images || []).filter(Boolean), [images]);

  const handlePrev = () => {
    setIndex((curr) => (curr === 0 ? list.length - 1 : curr - 1));
  };

  const handleNext = () => {
    setIndex((curr) => (curr === list.length - 1 ? 0 : curr + 1));
  };

  return (
    <div className="relative aspect-[16/9] w-full bg-muted overflow-hidden select-none">
      {list.length > 0 ? (
        <img
          src={list[index]}
          alt={propertyType}
          className="w-full h-full object-cover transition-all duration-300"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-1 bg-gradient-to-b from-muted/60 to-muted">
          <Home className="h-12 w-12 text-muted-foreground/30" />
          <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground/50">Sem fotos cadastradas</span>
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
        <span className="absolute bottom-3 right-3 z-10 px-2.5 py-0.5 rounded-full bg-black/75 text-white text-[11px] font-black tracking-wider backdrop-blur-sm pointer-events-none shadow">
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
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próxima foto"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm transition-all shadow-md active:scale-90"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Indicador de Bolinhas */}
      {list.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 pointer-events-none">
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-white shadow-sm" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}