import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Property } from "@/types/database";
import { formatPrice } from "@/lib/property";
import { PropertyAttrs } from "./marketplace.business.index";

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
          className="rounded-3xl border border-border/50 bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/15 text-primary">
              {property.deal_type === "venda" ? "Venda" : "Locação"}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {TYPE_LABEL[property.property_type] ?? property.property_type}
            </span>
          </div>

          <h2 className="font-display font-bold text-xl mt-3 leading-tight">
            {property.neighborhood ?? "Bairro não informado"}
          </h2>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" /> {[property.city, property.state].filter(Boolean).join(", ")}
          </p>

          {property.description && (
            <p className="text-sm text-muted-foreground mt-4 whitespace-pre-line">{property.description}</p>
          )}

          <PropertyAttrs property={property} />

          <p className="font-display font-bold text-2xl text-primary mt-5">{formatPrice(property.price)}</p>

          {property.agency_name && (
            <p className="text-xs text-muted-foreground mt-2">Anunciado por {property.agency_name}</p>
          )}

          {property.contact_phone && (
            <a
              href={`https://wa.me/55${property.contact_phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" /> Falar com a imobiliária
            </a>
          )}
        </div>
      )}
    </div>
  );
}