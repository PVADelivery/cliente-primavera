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
      { title: "Agenda Empresarial — MT Express" },
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
        <div className="flex flex-col gap-4 relative z-20 -mt-4">
          <div className="relative group mx-4 sm:mx-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou endereço..."
              className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] bg-card/90 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/10 text-[15px] transition-all"
            />
          </div>

          {/* Categories Dropdown */}
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full bg-card/90 backdrop-blur-md border border-white/20 rounded-[1.5rem] py-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-muted-foreground mx-4 sm:mx-6" style={{ width: 'calc(100% - 2rem)' }}>
              <SelectValue placeholder="Selecione uma categoria..." />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="max-h-[300px] overflow-y-auto rounded-2xl border-none shadow-xl scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {dynamicCategories.map((c) => (
                <SelectItem key={c} value={c} className="rounded-xl py-3 cursor-pointer font-medium text-[15px]">
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

        <section className="relative px-4 sm:px-6 pt-4">
          {/* Modern A-Z Sidebar */}
          {grouped.length > 0 && (
            <div className="fixed right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center z-[100] py-3 px-1 bg-card/60 backdrop-blur-xl rounded-full shadow-lg border border-border/40">
              {grouped.map(g => (
                <button 
                  key={g.letter} 
                  onClick={() => {
                    const el = document.getElementById(`letter-${g.letter}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-[9px] sm:text-[10px] font-bold text-muted-foreground hover:text-primary hover:scale-125 transition-all py-1 px-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full hover:bg-primary/10"
                >
                  {g.letter}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-10 pr-6 sm:pr-8">
            {grouped.map((g) => (
              <div key={g.letter} id={`letter-${g.letter}`} className="scroll-mt-32">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-display font-black text-2xl text-foreground/80 tracking-tight">
                    {g.letter}
                  </h2>
                </div>
                
                <ul className="space-y-4">
                  {g.items.map((b, i) => (
                    <motion.li
                      key={b.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4), type: "spring", stiffness: 100 }}
                      className="group p-5 bg-card rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-border/30 hover:border-primary/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Modern Avatar */}
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex flex-col items-center justify-center shrink-0 border border-primary/10">
                            <span className="font-display font-bold text-xl leading-none">{(b.name || "E").charAt(0).toUpperCase()}</span>
                          </div>
                          
                          <div className="min-w-0">
                            <h3 className="font-display font-bold text-lg text-foreground leading-tight truncate mb-1">
                              {b.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {b.category}
                              </span>
                              {b.rating != null && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span className="text-[11px] font-bold flex items-center gap-1 text-amber-500">
                                    <Star className="w-3.5 h-3.5 fill-amber-500" /> {b.rating.toFixed(1)}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {b.address && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 line-clamp-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/40" />
                                <span>{b.address}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Quick Actions - Vertical on small screens, horizontal on larger */}
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                          {b.phone && (
                            <a 
                              href={`tel:${b.phone.replace(/\D/g, "")}`}
                              className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 hover:scale-105 active:scale-95 transition-all shadow-sm"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {b.whatsapp && (
                            <a 
                              href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer"
                              className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#1da851] flex items-center justify-center hover:bg-[#25D366]/20 hover:scale-105 active:scale-95 transition-all shadow-sm"
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