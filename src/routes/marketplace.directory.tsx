import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Phone, MapPin, Search, Globe, MessageCircle, Star, BookUser, Clock } from "lucide-react";
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
  card_image_url?: string | null;
  card_style?: string | null;
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
              className="p-4 bg-card rounded-2xl border border-border group transition-all hover:border-primary/30 hover:shadow-md"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {b.card_image_url && (
                <div className="w-full aspect-[16/9] mb-4 rounded-xl overflow-hidden bg-muted border border-border/50 relative">
                  <img src={b.card_image_url} alt={b.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              )}
              
              <div className="flex items-start gap-3.5">
                {!b.card_image_url && (
                  <div className="w-12 h-12 rounded-xl grid place-items-center bg-primary text-primary-foreground font-display font-bold text-xl shrink-0 shadow-sm">
                    {b.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base leading-tight text-foreground truncate">{b.name}</h3>
                    {b.rating != null && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1 shrink-0">
                        <Star className="w-3 h-3 fill-primary text-primary" /> {b.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider mt-0.5">{b.category || "Empresa"}</p>
                  
                  <div className="mt-2.5 space-y-1.5">
                    {b.address && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-snug">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground/40" />
                        <span className="line-clamp-2">{b.address}</span>
                      </p>
                    )}
                    {b.hours && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-foreground/40" />
                        <span className="truncate">{b.hours}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-2 gap-2.5">
                <a 
                  href={b.phone ? `tel:${String(b.phone).replace(/\D/g, "")}` : '#'} 
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${b.phone ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'}`}
                  onClick={e => !b.phone && e.preventDefault()}
                >
                  <Phone className="w-4 h-4" /> Ligar
                </a>
                <a 
                  href={b.whatsapp ? `https://wa.me/${String(b.whatsapp).replace(/\D/g, "")}` : '#'} 
                  target={b.whatsapp ? "_blank" : undefined}
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${b.whatsapp ? 'bg-[#25D366] text-white shadow-md shadow-[#25D366]/20 hover:bg-[#20bd5a]' : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'}`}
                  onClick={e => !b.whatsapp && e.preventDefault()}
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
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