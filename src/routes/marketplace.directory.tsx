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
    <div className="min-h-screen bg-[#FDF8E7] text-stone-900 font-serif pb-20 -mx-4 px-4 pt-4 sm:-mx-6 sm:px-6">
      {/* Texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 z-0 mix-blend-multiply" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />

      <div className="relative z-10 space-y-6">
        <header className="text-center pb-4 border-b-2 border-stone-800">
          <h1 className="font-black text-3xl sm:text-4xl uppercase tracking-tighter text-stone-900">
            Páginas Amarelas
          </h1>
          <p className="font-serif italic text-stone-600 mt-1">Guia Comercial & Telefônico</p>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa ou categoria..."
            className="w-full pl-11 pr-4 py-3 rounded-none bg-[#FDF8E7] border-2 border-stone-800 focus:outline-none focus:ring-0 focus:border-red-700 text-sm font-sans placeholder:text-stone-500 transition-colors"
          />
        </div>

        <div className="relative z-10">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full bg-[#FDF8E7] border-2 border-stone-800 rounded-none py-6 font-sans font-bold uppercase tracking-wider text-sm">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] rounded-none border-2 border-stone-800 bg-[#FDF8E7]">
              {dynamicCategories.map((c) => (
                <SelectItem key={c} value={c} className="font-sans uppercase font-bold text-sm focus:bg-stone-200">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Destaques - Agora em estilo "Anúncio de Jornal" */}
        {featured.length > 0 && cat === "Tudo" && !q && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4 border-b border-stone-400 pb-1">
              <Star className="w-4 h-4 text-stone-800 fill-stone-800" />
              <h2 className="font-sans font-black uppercase tracking-widest text-sm text-stone-800">Anunciantes em Destaque</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featured.map((b) => (
                <div key={b.id} className="border-4 border-stone-900 p-4 bg-white relative">
                  <div className="absolute top-0 right-0 bg-red-700 text-white text-[10px] font-bold uppercase px-2 py-0.5 font-sans">
                    Destaque
                  </div>
                  <h3 className="font-black text-xl uppercase tracking-tight text-stone-900 leading-none">{b.name}</h3>
                  <p className="font-sans text-xs uppercase font-bold text-stone-600 mt-1 mb-3">{b.category}</p>
                  
                  {b.address && <p className="font-serif text-sm text-stone-700 leading-snug mb-2">{b.address}</p>}
                  
                  <div className="flex flex-col gap-1 mt-auto">
                    {b.phone && (
                      <a href={`tel:${b.phone.replace(/\D/g, "")}`} className="font-mono font-bold text-lg text-stone-900 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> {b.phone}
                      </a>
                    )}
                    {b.whatsapp && (
                      <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer" className="font-mono font-bold text-stone-900 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" /> {b.whatsapp}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="relative mt-8">
          {/* Barra lateral estilo Abas de Papel */}
          {grouped.length > 0 && (
            <div className="fixed right-0 top-1/3 flex flex-col z-[100] drop-shadow-md">
              {grouped.map(g => (
                <button 
                  key={g.letter} 
                  onClick={() => {
                    const el = document.getElementById(`letter-${g.letter}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="bg-[#F5E6B4] border border-r-0 border-stone-400 text-stone-900 font-sans font-bold text-xs py-1.5 px-2 mb-0.5 rounded-l-md hover:bg-stone-800 hover:text-white transition-colors"
                >
                  {g.letter}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-10 pr-8">
            {grouped.map((g) => (
              <div key={g.letter} id={`letter-${g.letter}`} className="scroll-mt-24">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="font-black text-5xl text-red-700 font-serif leading-none">
                    {g.letter}
                  </h2>
                  <div className="h-0.5 flex-1 bg-stone-900 mt-2" />
                </div>
                
                <ul className="space-y-4">
                  {g.items.map((b) => (
                    <li key={b.id} className="group">
                      <div className="flex items-end justify-between w-full">
                        <h3 className="font-black text-lg sm:text-xl uppercase tracking-tighter text-stone-900 leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[60%]">
                          {b.name}
                        </h3>
                        
                        {/* Linha pontilhada */}
                        <div className="flex-1 border-b-[3px] border-dotted border-stone-400 mx-3 mb-1.5 opacity-50" />
                        
                        {/* Telefone primário */}
                        <a 
                          href={b.phone ? `tel:${b.phone.replace(/\D/g, "")}` : (b.whatsapp ? `https://wa.me/${b.whatsapp}` : '#')} 
                          className="font-mono font-bold text-sm sm:text-base text-stone-900 whitespace-nowrap"
                        >
                          {b.phone || b.whatsapp || "S/ Número"}
                        </a>
                      </div>
                      
                      {/* Sub-informações em fonte pequena */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-sans font-medium text-stone-600 uppercase">
                        <span className="text-red-700">{b.category}</span>
                        {b.address && <span>• {b.address}</span>}
                        {b.phone && b.whatsapp && (
                          <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold ml-auto flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> WPP
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-stone-500 font-serif italic text-lg">
              Nenhuma página encontrada.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}