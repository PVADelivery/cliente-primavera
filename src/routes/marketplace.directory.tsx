import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Phone, MapPin, Search, Globe, MessageCircle, Star, BookUser, Clock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const { data: dynamicCategories = [] } = useQuery<string[]>({
    queryKey: ["directory_categories"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("value")
        .eq("key", "directory_categories")
        .maybeSingle();

      if (error || !data || !data.value) {
        return ["Tudo", "Restaurante", "Hamburgueria", "Mercado", "Farmácia", "Padaria", "Pet Shop", "Beleza", "Saúde", "Automotivo"];
      }
      return ["Tudo", ...(data.value as string[])];
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

  const grouped = useMemo(() => {
    const map = new Map<string, Business[]>();
    filtered.forEach((b) => {
      const firstLetter = (b.name || "E").charAt(0).toUpperCase();
      // Se não for letra de A-Z, agrupa no "#"
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(b);
    });
    // Ordena as chaves: # vem depois das letras
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map(k => ({ letter: k, items: map.get(k)! }));
  }, [filtered]);

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

      <div className="relative z-10">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-full bg-card border-border rounded-2xl py-6 shadow-[var(--shadow-card)]">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] rounded-2xl">
            {dynamicCategories.map((c) => (
              <SelectItem key={c} value={c} className="rounded-xl py-2.5">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <section className="relative">
        {/* Barra lateral A-Z */}
        {grouped.length > 0 && (
          <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col items-center z-[100] py-2 px-1 bg-background/60 backdrop-blur-md rounded-full border border-border shadow-lg">
            {grouped.map(g => (
              <button 
                key={g.letter} 
                onClick={() => {
                  const el = document.getElementById(`letter-${g.letter}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-[11px] font-bold text-primary/70 hover:text-primary hover:scale-125 transition-transform py-0.5 px-1.5"
              >
                {g.letter}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-8 pr-6">
          {grouped.map((g) => (
            <div key={g.letter} id={`letter-${g.letter}`} className="scroll-mt-24">
              <h2 className="font-display text-xl font-bold mb-4 text-foreground/90 pl-2">
                {g.letter}
              </h2>
              <ul className="space-y-3">
                {g.items.map((b, i) => (
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
                    {(b.name || "E").charAt(0).toUpperCase()}
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
          </ul>
        </div>
      ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Nenhuma empresa encontrada.
        </div>
      )}
      </section>
    </div>
  );
}