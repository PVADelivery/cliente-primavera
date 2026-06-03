import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Clock, Search, Zap, Tag, ChevronRight, UtensilsCrossed, ShoppingBasket, Pill, Pizza, IceCream, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Company } from "@/types/database";
import heroFood from "@/assets/hero-food.jpg";
import coverItalian from "@/assets/cover-italian.jpg";
import coverBurger from "@/assets/cover-burger.jpg";
import coverMarket from "@/assets/cover-market.jpg";
import coverPharmacy from "@/assets/cover-pharmacy.jpg";

export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Primavera Delivery — Comida, mercado e farmácia na sua porta" },
      { name: "description", content: "Descubra restaurantes, mercados e farmácias da sua cidade. Peça pelo Primavera Delivery." },
    ],
  }),
  component: MarketplaceHome,
});

const MOCK: Company[] = [
  { id: "m1", user_id: null, name: "Cantina da Nona", document: null, phone: null, email: null, address: "Rua das Flores, 123", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: coverItalian, description: "Massas artesanais", category: "Italiana", rating: 4.8, latitude: null, longitude: null, opening_hours: null, delivery_mode: "platform", city_id: null, delivery_fee: 6.9, is_open: true, business_hours: "18:00-23:00", active: true },
  { id: "m2", user_id: null, name: "Burger Hub", document: null, phone: null, email: null, address: "Av. Central, 500", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: coverBurger, description: "Hambúrgueres autorais", category: "Burguer", rating: 4.6, latitude: null, longitude: null, opening_hours: null, delivery_mode: "own", city_id: null, delivery_fee: 4.9, is_open: true, business_hours: "18:00-00:00", active: true },
  { id: "m3", user_id: null, name: "Mercadinho Bom Preço", document: null, phone: null, email: null, address: "Praça Velha", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: coverMarket, description: "Mercado completo", category: "Mercado", rating: 4.4, latitude: null, longitude: null, opening_hours: null, delivery_mode: "platform", city_id: null, delivery_fee: 5.5, is_open: false, business_hours: "07:00-22:00", active: true },
  { id: "m4", user_id: null, name: "Farmácia Saúde+", document: null, phone: null, email: null, address: "Rua A", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: coverPharmacy, description: "24 horas", category: "Farmácia", rating: 4.9, latitude: null, longitude: null, opening_hours: null, delivery_mode: "platform", city_id: null, delivery_fee: 0, is_open: true, business_hours: "24h", active: true },
];

const CATEGORIES: Array<{ label: string; icon: typeof UtensilsCrossed }> = [
  { label: "Restaurantes", icon: UtensilsCrossed },
  { label: "Mercado", icon: ShoppingBasket },
  { label: "Farmácia", icon: Pill },
  { label: "Pizza", icon: Pizza },
  { label: "Doces", icon: IceCream },
  { label: "Cafés", icon: Coffee },
];

function MarketplaceHome() {
  const { data: stores = MOCK } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK;
      const { data, error } = await supabase.from("companies").select("*").eq("active", true).limit(40);
      if (error || !data || data.length === 0) return MOCK;
      return data as Company[];
    },
  });

  const top = [...stores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);

  return (
    <div className="space-y-8">
      <section
        className="rounded-3xl p-6 pb-7 text-primary-foreground relative overflow-hidden"
        style={{ background: "var(--gradient-sunset)", boxShadow: "var(--shadow-premium)" }}
      >
        <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-mesh)" }} />
        <img
          src={heroFood}
          alt=""
          aria-hidden
          className="absolute -right-10 -top-6 w-44 h-44 object-cover rounded-full opacity-90 ring-8 ring-background/10"
          style={{ boxShadow: "var(--shadow-glow)" }}
        />
        <div className="relative max-w-[60%]">
          <button className="inline-flex items-center gap-1 text-xs bg-background/15 backdrop-blur px-3 py-1.5 rounded-full font-medium">
            <MapPin className="w-3.5 h-3.5" /> Primavera, SP <ChevronRight className="w-3 h-3" />
          </button>
          <h1 className="mt-3 font-display text-[28px] font-extrabold leading-[1.05] tracking-tight">
            Sua cidade,<br />em minutos.
          </h1>
          <p className="mt-2 text-xs opacity-90">Delivery, mercado, farmácia e a agenda completa do seu bairro.</p>
        </div>
        <Link
          to="/marketplace/search"
          className="relative mt-5 flex items-center gap-2 bg-background/95 backdrop-blur text-foreground rounded-2xl px-4 py-3 text-sm font-medium"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Buscar lojas, pratos…</span>
        </Link>
      </section>

      <section>
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.button
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span
                  className="w-12 h-12 rounded-2xl grid place-items-center bg-card border border-border group-hover:border-primary/40 transition-colors"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </span>
                <span className="text-[10px] font-medium text-foreground/80 text-center leading-tight">{c.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}>
          <Zap className="w-5 h-5 mb-2" />
          <p className="font-display font-bold text-sm leading-tight">Entrega expressa</p>
          <p className="text-[11px] opacity-90 mt-0.5">Em até 30 min</p>
        </div>
        <Link to="/marketplace/directory" className="p-4 rounded-2xl bg-foreground text-background relative overflow-hidden">
          <Tag className="w-5 h-5 mb-2" />
          <p className="font-display font-bold text-sm leading-tight">Agenda da cidade</p>
          <p className="text-[11px] opacity-80 mt-0.5">Telefones e contatos</p>
        </Link>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Star className="w-4 h-4 text-accent fill-accent" /> Mais bem avaliados
          </h2>
          <button className="text-xs font-medium text-primary">Ver tudo</button>
        </div>
        <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-none snap-x">
          {top.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 snap-start w-44"
            >
              <Link to="/marketplace/store/$storeId" params={{ storeId: s.id }} className="block">
                <div className="aspect-[4/3] rounded-2xl bg-secondary relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
                  {s.cover_url ? (
                    <img src={s.cover_url} alt={s.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-3xl font-display font-bold text-muted-foreground">
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute top-2 left-2 text-[10px] font-medium bg-background/90 text-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-accent text-accent" /> {s.rating?.toFixed(1) ?? "—"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.category}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Lojas próximas</h2>
            <p className="text-xs text-muted-foreground">Selecionadas para você</p>
          </div>
          <button className="text-xs font-medium text-primary flex items-center gap-0.5">Filtrar <ChevronRight className="w-3 h-3" /></button>
        </div>
        <ul className="space-y-4">
          {stores.map((s, i) => {
            const eta = 20 + ((i * 7) % 25);
            const freeShip = (s.delivery_fee ?? 0) === 0;
            return (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
              >
                <Link
                  to="/marketplace/store/$storeId"
                  params={{ storeId: s.id }}
                  className="block group rounded-3xl overflow-hidden bg-card border border-border/60 hover:border-primary/50 transition-all duration-300 active:scale-[0.985]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="relative aspect-[16/9] bg-secondary overflow-hidden">
                    {s.cover_url ? (
                      <img
                        src={s.cover_url}
                        alt={s.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: "var(--gradient-primary)" }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* Top chips */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {freeShip && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-500 text-white px-2 py-1 rounded-full flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 fill-white" /> Grátis
                          </span>
                        )}
                        {s.rating && s.rating >= 4.7 && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-accent text-accent-foreground px-2 py-1 rounded-full">
                            Top rated
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur ${
                          s.is_open ? "bg-white/90 text-emerald-700" : "bg-black/60 text-white"
                        }`}
                      >
                        ● {s.is_open ? "Aberto" : "Fechado"}
                      </span>
                    </div>

                    {/* Bottom info on image */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white shrink-0 grid place-items-center font-display font-extrabold text-xl text-foreground ring-2 ring-white/80 overflow-hidden" style={{ boxShadow: "var(--shadow-elegant)" }}>
                          {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" /> : s.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-base truncate drop-shadow">{s.name}</h3>
                          <p className="text-[11px] opacity-90 truncate">{s.category} · {s.address ?? "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                      {s.rating?.toFixed(1) ?? "—"}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" /> {eta}–{eta + 10} min
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className={`font-medium ${freeShip ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {freeShip ? "Entrega grátis" : `R$ ${(s.delivery_fee ?? 0).toFixed(2).replace(".", ",")}`}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-0.5 text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Abrir <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
