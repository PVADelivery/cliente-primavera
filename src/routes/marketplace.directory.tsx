import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Phone, MapPin, Search, Globe, MessageCircle, Star, BookUser, Clock, Mail, Navigation, Copy, Check } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/marketplace/directory")({
  head: () => ({
    meta: [
      { title: "PPP — Painel Profissional Prestador de Serviços | MT 24horas express" },
      { name: "description", content: "Painel Profissional Prestador de Serviços: endereço, telefone, WhatsApp e horário das empresas da cidade." },
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
  email?: string | null;
  website: string | null;
  hours: string | null;
  rating: number | null;
  featured?: boolean;
  card_image_url?: string | null;
  card_style?: string | null;
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const waLink = (v: string) => {
  const d = onlyDigits(v);
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
};
const mapsLink = (addr: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
  accent,
  copyValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  accent?: string;
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);
  const content = (
    <>
      <span
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent ?? "bg-secondary text-secondary-foreground"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="block text-sm font-medium text-foreground truncate">{value}</span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-secondary/50 transition-colors">
      {href ? (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          {content}
        </a>
      ) : (
        <div className="flex items-center gap-3 min-w-0 flex-1">{content}</div>
      )}
      {copyValue && (
        <button
          type="button"
          aria-label={`Copiar ${label}`}
          onClick={() => {
            navigator.clipboard?.writeText(copyValue);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

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
      <AeroHero
        className="mb-8"
        eyebrow={<><BookUser className="w-3.5 h-3.5" /> Painel Profissional Prestador de Serviços</>}
        title={<>Toda a cidade<br />em um toque.</>}
        subtitle="Acesse rapidamente contatos, redes e rotas de todos os estabelecimentos locais."
      />

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
                      className="group bg-card rounded-[1.75rem] shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-border/40 hover:border-primary/30 hover:shadow-[0_14px_46px_rgb(0,0,0,0.09)] transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-amber-400/60 to-transparent" />
                      {/* Cabeçalho */}
                      <div className="p-5 pb-4 grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-center border-b border-border/40 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                          <span className="font-display font-black text-2xl leading-none">{(b.name || "E").charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-lg text-foreground leading-tight truncate">{b.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {b.category}
                            </span>
                            {b.rating != null && (
                              <span className="text-[11px] font-bold flex items-center gap-1 text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-amber-500" /> {b.rating.toFixed(1)}
                              </span>
                            )}
                            {b.hours && (
                              <span className="text-[11px] font-medium flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5" /> {b.hours}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dados de contato */}
                      <div className="p-3 space-y-0.5 relative z-10">
                        {b.whatsapp && (
                          <ContactRow
                            icon={<MessageCircle className="w-4 h-4" />}
                            label="WhatsApp"
                            value={b.whatsapp}
                            href={waLink(b.whatsapp)}
                            external
                            accent="bg-[#25D366]/15 text-[#1da851]"
                            copyValue={b.whatsapp}
                          />
                        )}
                        {b.phone && (
                          <ContactRow
                            icon={<Phone className="w-4 h-4" />}
                            label="Telefone"
                            value={b.phone}
                            href={`tel:${onlyDigits(b.phone)}`}
                            copyValue={b.phone}
                          />
                        )}
                        {b.address && (
                          <ContactRow
                            icon={<MapPin className="w-4 h-4" />}
                            label="Endereço"
                            value={b.address}
                            href={mapsLink(b.address)}
                            external
                            accent="bg-primary/10 text-primary"
                            copyValue={b.address}
                          />
                        )}
                        {b.email && (
                          <ContactRow
                            icon={<Mail className="w-4 h-4" />}
                            label="E-mail"
                            value={b.email}
                            href={`mailto:${b.email}`}
                            copyValue={b.email}
                          />
                        )}
                        {b.website && (
                          <ContactRow
                            icon={<Globe className="w-4 h-4" />}
                            label="Site"
                            value={b.website.replace(/^https?:\/\//, "")}
                            href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                            external
                          />
                        )}
                        {!b.phone && !b.whatsapp && !b.address && !b.email && !b.website && (
                          <div className="m-1 rounded-2xl border border-dashed border-border bg-secondary/40 px-5 py-8 text-center">
                            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
                              <BookUser className="h-5 w-5" />
                            </span>
                            <p className="text-sm font-bold text-foreground">Nenhum dado de contato cadastrado</p>
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              Telefone, WhatsApp, endereço, e-mail e site aparecem aqui assim que a empresa preencher a ficha.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Ações principais */}
                      <div className="grid grid-cols-2 gap-2 p-3 pt-0 relative z-10">
                        <a
                          href={b.whatsapp ? waLink(b.whatsapp) : b.phone ? `tel:${onlyDigits(b.phone)}` : "#"}
                          {...(b.whatsapp ? { target: "_blank", rel: "noreferrer" } : {})}
                          aria-disabled={!b.whatsapp && !b.phone}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold transition-all active:scale-95 ${
                            b.whatsapp || b.phone
                              ? "bg-[#25D366]/15 text-[#1da851] hover:bg-[#25D366]/25"
                              : "bg-secondary text-muted-foreground pointer-events-none opacity-50"
                          }`}
                        >
                          {b.whatsapp ? <MessageCircle className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          {b.whatsapp ? "WhatsApp" : "Ligar"}
                        </a>
                        <a
                          href={b.address ? mapsLink(b.address) : "#"}
                          target="_blank"
                          rel="noreferrer"
                          aria-disabled={!b.address}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold transition-all active:scale-95 ${
                            b.address
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-secondary text-muted-foreground pointer-events-none opacity-50"
                          }`}
                        >
                          <Navigation className="w-4 h-4" /> Rota
                        </a>
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