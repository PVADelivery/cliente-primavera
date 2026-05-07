import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Company } from "@/types/database";

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
  { id: "m1", user_id: null, name: "Cantina da Nona", document: null, phone: null, email: null, address: "Rua das Flores, 123", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: null, description: "Massas artesanais", category: "Italiana", rating: 4.8, latitude: null, longitude: null, opening_hours: null, delivery_mode: "platform", city_id: null, delivery_fee: 6.9, is_open: true, business_hours: "18:00-23:00", active: true },
  { id: "m2", user_id: null, name: "Burger Hub", document: null, phone: null, email: null, address: "Av. Central, 500", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: null, description: "Hambúrgueres autorais", category: "Burguer", rating: 4.6, latitude: null, longitude: null, opening_hours: null, delivery_mode: "own", city_id: null, delivery_fee: 4.9, is_open: true, business_hours: "18:00-00:00", active: true },
  { id: "m3", user_id: null, name: "Mercadinho Bom Preço", document: null, phone: null, email: null, address: "Praça Velha", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: null, description: "Mercado completo", category: "Mercado", rating: 4.4, latitude: null, longitude: null, opening_hours: null, delivery_mode: "platform", city_id: null, delivery_fee: 5.5, is_open: false, business_hours: "07:00-22:00", active: true },
  { id: "m4", user_id: null, name: "Farmácia Saúde+", document: null, phone: null, email: null, address: "Rua A", city: "Primavera", state: "SP", zip_code: null, logo_url: null, banner_url: null, cover_url: null, description: "24 horas", category: "Farmácia", rating: 4.9, latitude: null, longitude: null, opening_hours: null, delivery_mode: "platform", city_id: null, delivery_fee: 0, is_open: true, business_hours: "24h", active: true },
];

const CATEGORIES = ["Tudo", "Italiana", "Burguer", "Mercado", "Farmácia", "Pizza", "Japonesa", "Doces"];

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
      <section className="rounded-3xl p-6 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}>
        <h1 className="font-display text-2xl font-bold leading-tight">
          Sua cidade<br />no app.
        </h1>
        <p className="mt-2 text-sm opacity-90 max-w-xs">Comida, mercado e farmácia em minutos — direto na sua porta.</p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs bg-background/15 backdrop-blur px-3 py-1.5 rounded-full">
          <MapPin className="w-3.5 h-3.5" /> Primavera, SP
        </div>
      </section>

      <section>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {CATEGORIES.map((c, i) => (
            <button
              key={c}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                i === 0 ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:border-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-accent fill-accent" /> Mais bem avaliados
        </h2>
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
        <h2 className="font-display text-lg font-bold mb-3">Lojas próximas</h2>
        <ul className="space-y-3">
          {stores.map((s) => (
            <li key={s.id}>
              <Link to="/marketplace/store/$storeId" params={{ storeId: s.id }} className="flex gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/40 transition-colors" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="w-16 h-16 rounded-xl bg-secondary shrink-0 grid place-items-center font-display font-bold text-xl text-muted-foreground overflow-hidden">
                  {s.logo_url ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold truncate">{s.name}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s.is_open ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {s.is_open ? "Aberto" : "Fechado"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.category} · {s.address ?? "—"}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-accent text-accent" />{s.rating?.toFixed(1) ?? "—"}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.business_hours ?? "—"}</span>
                    <span>R$ {(s.delivery_fee ?? 0).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
