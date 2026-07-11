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
              className="relative overflow-hidden bg-card rounded-[2rem] border border-border/60 group"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Business Card Content */}
              {b.card_image_url ? (
                <div className="w-full aspect-[1.58] bg-muted relative">
                   <img src={b.card_image_url} alt={b.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full aspect-[1.58] relative overflow-hidden text-white flex flex-col justify-between p-5 sm:p-7" style={{ background: b.card_style === 'light' ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' : 'linear-gradient(135deg, #18181b 0%, #000000 100%)', color: b.card_style === 'light' ? '#0f172a' : '#ffffff' }}>
                  {/* Decorative Elements */}
                  {b.card_style === 'light' ? (
                     <>
                       <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-blue-500/10 blur-[80px] rounded-full translate-x-1/4 -translate-y-1/2 pointer-events-none" />
                       <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600 rounded-full translate-x-1/3 translate-y-1/3 opacity-[0.05] pointer-events-none" />
                     </>
                  ) : (
                     <>
                       <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-primary/20 blur-[80px] rounded-full translate-x-1/4 -translate-y-1/2 pointer-events-none" />
                       <div className="absolute inset-y-0 right-0 w-1/3 bg-primary transform -skew-x-12 translate-x-10 pointer-events-none opacity-90 shadow-2xl" />
                     </>
                  )}
                  
                  <div className="relative z-10 flex items-start justify-between">
                     <div className="max-w-[70%]">
                       <h3 className="font-display font-black text-2xl sm:text-3xl leading-none drop-shadow-sm">{b.name}</h3>
                       <p className={`text-xs font-bold uppercase tracking-wider mt-2 ${b.card_style === 'light' ? 'text-blue-600' : 'text-primary'}`}>{b.category}</p>
                     </div>
                     {b.rating != null && (
                       <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${b.card_style === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-primary/20 text-primary'}`}>
                         <Star className={`w-3 h-3 ${b.card_style === 'light' ? 'fill-blue-600 text-blue-600' : 'fill-primary text-primary'}`} /> {b.rating.toFixed(1)}
                       </span>
                     )}
                  </div>
                  
                  <div className="relative z-10 space-y-2.5 mt-auto">
                    {b.address && (
                      <p className={`text-xs sm:text-sm font-medium flex items-center gap-2.5 ${b.card_style === 'light' ? 'text-slate-600' : 'text-zinc-300'}`}>
                        <MapPin className={`w-4 h-4 shrink-0 ${b.card_style === 'light' ? 'text-blue-500' : 'text-primary'}`} />
                        <span className="truncate">{b.address}</span>
                      </p>
                    )}
                    {b.hours && (
                      <p className={`text-xs sm:text-sm font-medium flex items-center gap-2.5 ${b.card_style === 'light' ? 'text-slate-600' : 'text-zinc-300'}`}>
                        <Clock className={`w-4 h-4 shrink-0 ${b.card_style === 'light' ? 'text-blue-500' : 'text-primary'}`} />
                        <span>{b.hours}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons Bar */}
              <div className="p-3 bg-card border-t border-border/50 grid grid-cols-3 gap-2">
                {b.phone ? (
                  <a href={`tel:${b.phone.replace(/\D/g, "")}`} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> Ligar
                  </a>
                ) : <span />}
                {b.whatsapp ? (
                  <a href={`https://wa.me/${b.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-transform" style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}>
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                ) : <span />}
                {b.website ? (
                  <a href={`https://${b.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Site
                  </a>
                ) : (
                  b.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
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