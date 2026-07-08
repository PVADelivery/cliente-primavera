import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Phone, MapPin, Search, Globe, MessageCircle, Star, BookUser } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/marketplace/directory")({
  head: () => ({
    meta: [
      { title: "Agenda Empresarial — Primavera Delivery" },
      { name: "description", content: "Agenda telefônica das empresas da cidade: endereço, telefone, WhatsApp e horário." },
    ],
  }),
  component: DirectoryPage,
});

type Business = {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  website: string | null;
  hours: string | null;
  rating: number | null;
  featured?: boolean;
};

// ─── Mock data removido para produção ──────────────────────────────────────────

const CATEGORIES = ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Automotivo"];

function DirectoryPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tudo");

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["directory"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await (supabase as any)
        .from("business_directory")
        .select("*")
        .order("name");
      if (error || !data) return [];
      return data as Business[];
    },
  });

  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      const matchCat = cat === "Tudo" || b.category === cat;
      const t = q.trim().toLowerCase();
      const matchQ = !t || b.name.toLowerCase().includes(t) || (b.address ?? "").toLowerCase().includes(t) || b.category.toLowerCase().includes(t);
      return matchCat && matchQ;
    });
  }, [businesses, q, cat]);

  const featured = businesses.filter((b) => b.featured).slice(0, 4);

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl p-6 text-primary-foreground relative overflow-hidden"
        style={{ background: "var(--gradient-sunset)", boxShadow: "var(--shadow-premium)" }}
      >
        <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-mesh)" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs bg-background/20 backdrop-blur px-3 py-1.5 rounded-full mb-3">
            <BookUser className="w-3.5 h-3.5" /> Agenda Empresarial
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight">
            Toda a cidade<br />no seu bolso.
          </h1>
          <p className="mt-2 text-sm opacity-90 max-w-xs">
            Telefone, WhatsApp, endereço e horário das empresas locais — tudo a um toque.
          </p>
        </div>
      </section>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar empresa, categoria ou endereço…"
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          style={{ boxShadow: "var(--shadow-card)" }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              cat === c
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card text-foreground border-border hover:border-primary/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {featured.length > 0 && cat === "Tudo" && !q && (
        <section>
          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-accent fill-accent" /> Destaques da cidade
          </h2>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-none snap-x">
            {featured.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="shrink-0 snap-start w-56 p-4 rounded-2xl text-primary-foreground relative overflow-hidden"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
              >
                <p className="text-[10px] uppercase tracking-wider opacity-80">{b.category}</p>
                <h3 className="mt-1 font-display font-bold text-base leading-tight">{b.name}</h3>
                <p className="mt-1 text-xs opacity-90 line-clamp-1">{b.address}</p>
                <div className="mt-3 flex gap-2">
                  {b.phone && (
                    <a href={`tel:${b.phone.replace(/\D/g, "")}`} className="flex-1 inline-flex items-center justify-center gap-1 bg-background/20 backdrop-blur rounded-full py-1.5 text-xs font-medium">
                      <Phone className="w-3 h-3" /> Ligar
                    </a>
                  )}
                  {b.whatsapp && (
                    <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1 bg-background text-foreground rounded-full py-1.5 text-xs font-semibold">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-bold mb-3">
          {filtered.length} empresa{filtered.length === 1 ? "" : "s"} {cat !== "Tudo" && `em ${cat}`}
        </h2>
        <ul className="space-y-3">
          {filtered.map((b, i) => (
            <motion.li
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="p-4 bg-card rounded-2xl border border-border"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl shrink-0 grid place-items-center font-display font-bold text-lg text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {b.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{b.name}</h3>
                    {b.rating != null && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 fill-accent text-accent" /> {b.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.category} · {b.hours ?? "Horário não informado"}</p>
                  {b.address && (
                    <p className="mt-1.5 text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{b.address}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {b.phone ? (
                  <a href={`tel:${b.phone.replace(/\D/g, "")}`} className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> Ligar
                  </a>
                ) : <span />}
                {b.whatsapp ? (
                  <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                ) : <span />}
                {b.website ? (
                  <a href={`https://${b.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Site
                  </a>
                ) : (
                  b.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Mapa
                    </a>
                  )
                )}
              </div>
            </motion.li>
          ))}
          {filtered.length === 0 && (
            <li className="text-center py-12 text-sm text-muted-foreground">
              Nenhuma empresa encontrada.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}