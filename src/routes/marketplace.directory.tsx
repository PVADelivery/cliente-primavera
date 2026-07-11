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
    <div className="min-h-screen bg-background pb-24">
      {/* Premium Header */}
      <section
        className="rounded-b-[2.5rem] p-8 text-primary-foreground relative overflow-hidden mb-8"
        style={{ background: "var(--gradient-sunset)", boxShadow: "0 10px 30px -10px rgba(var(--primary), 0.3)" }}
      >
        <div className="absolute inset-0 opacity-30 bg-noise" style={{ background: "var(--gradient-mesh)" }} />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 pt-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest bg-white/20 text-white backdrop-blur-md px-4 py-1.5 rounded-full mb-4 shadow-sm"
          >
            <BookUser className="w-3.5 h-3.5" /> Agenda Digital
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-black leading-none tracking-tight mb-3"
          >
            Toda a cidade<br />em um toque.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-white/90 max-w-[280px] font-medium"
          >
            Acesse rapidamente contatos, redes e rotas de todos os estabelecimentos locais.
          </motion.p>
        </div>
      </section>

      <div className="px-4 sm:px-6 space-y-6">
        {/* Search & Filter */}
        <div className="flex flex-col gap-3 relative z-20">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou endereço..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border-2 border-transparent shadow-sm focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 text-sm transition-all"
            />
          </div>

          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full bg-card border-none rounded-2xl py-6 shadow-sm focus:ring-4 focus:ring-primary/5 transition-all">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] rounded-2xl border-none shadow-xl">
              {dynamicCategories.map((c) => (
                <SelectItem key={c} value={c} className="rounded-xl py-3 cursor-pointer font-medium">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Featured Section */}
        {featured.length > 0 && cat === "Tudo" && !q && (
          <section className="pt-2">
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-foreground/90">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Destaques
            </h2>
            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-4 scrollbar-none snap-x">
              {featured.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="shrink-0 snap-center w-[260px] p-5 rounded-[1.5rem] relative overflow-hidden bg-white dark:bg-zinc-900 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                      {b.category}
                    </span>
                  </div>
                  
                  <h3 className="font-display font-bold text-lg leading-tight mb-1 relative z-10">{b.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-4 relative z-10">{b.address || "Endereço não informado"}</p>
                  
                  <div className="flex gap-2 relative z-10">
                    {b.phone && (
                      <a href={`tel:${b.phone.replace(/\D/g, "")}`} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors rounded-xl py-2 text-xs font-semibold">
                        <Phone className="w-3.5 h-3.5" /> Ligar
                      </a>
                    )}
                    {b.whatsapp && (
                      <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#25D366]/10 text-[#1da851] hover:bg-[#25D366]/20 transition-colors rounded-xl py-2 text-xs font-bold">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Directory List */}
        <section className="relative pt-2">
          {/* Modern A-Z Sidebar */}
          {grouped.length > 0 && (
            <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col items-center z-[100] py-3 px-1.5 bg-card/80 backdrop-blur-xl rounded-full shadow-lg border border-border/50">
              {grouped.map(g => (
                <button 
                  key={g.letter} 
                  onClick={() => {
                    const el = document.getElementById(`letter-${g.letter}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-[10px] font-bold text-muted-foreground hover:text-primary hover:scale-125 transition-all py-1 px-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-primary/10"
                >
                  {g.letter}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-10 pr-10">
            {grouped.map((g) => (
              <div key={g.letter} id={`letter-${g.letter}`} className="scroll-mt-28">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-sm">
                    {g.letter}
                  </div>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                
                <ul className="space-y-3">
                  {g.items.map((b, i) => (
                    <motion.li
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4) }}
                      className="group p-4 bg-card rounded-[1.25rem] shadow-sm border border-transparent hover:border-primary/20 hover:shadow-md transition-all relative overflow-hidden"
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-bold text-base text-foreground leading-tight truncate mb-1">
                            {b.name}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/5 px-2 py-0.5 rounded-md">
                              {b.category}
                            </span>
                            {b.rating != null && (
                              <span className="text-[10px] font-bold flex items-center gap-1 text-amber-500">
                                <Star className="w-3 h-3 fill-amber-500" /> {b.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          
                          {b.address && (
                            <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-snug">
                              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground/30" />
                              <span className="line-clamp-1">{b.address}</span>
                            </p>
                          )}
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="flex gap-1.5 shrink-0">
                          {b.phone && (
                            <a 
                              href={`tel:${b.phone.replace(/\D/g, "")}`}
                              className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {b.whatsapp && (
                            <a 
                              href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer"
                              className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#1da851] flex items-center justify-center hover:bg-[#25D366]/20 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-display font-bold text-foreground">Nada encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">Tente remover ou alterar seus filtros.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}