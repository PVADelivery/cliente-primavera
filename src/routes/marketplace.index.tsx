import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Star, MapPin, Clock, Search, Zap, Tag, ChevronRight,
  UtensilsCrossed, ShoppingBasket, Pill, Pizza, IceCream, Coffee,
  SlidersHorizontal, CheckCircle2, X, History, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Company } from "@/types/database";
import heroFood from "@/assets/hero-food.jpg";
import coverItalian from "@/assets/cover-italian.jpg";
import coverBurger from "@/assets/cover-burger.jpg";
import coverMarket from "@/assets/cover-market.jpg";
import coverPharmacy from "@/assets/cover-pharmacy.jpg";
import logoIcon from "@/assets/logo-icon.png";
import logoBanner from "@/assets/logo-banner.png";
import heroPrimavera from "@/assets/hero-primavera.png";

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Primavera Delivery — Comida, mercado e farmácia na sua porta" },
      { name: "description", content: "Descubra restaurantes, mercados e farmácias da sua cidade." },
    ],
  }),
  component: MarketplaceHome,
});

// ─── Mock data ────────────────────────────────────────────────────────────────
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

const LOCATION_SUGGESTIONS = [
  "Centro, Primavera",
  "Jardim das Flores",
  "Bairro Alto",
  "Vila Nova",
  "Rua das Palmeiras",
  "Av. Brasil",
  "Parque Industrial",
  "Residencial Primavera",
];

// ─── Persistence ──────────────────────────────────────────────────────────────
type SortKey = "relevance" | "rating" | "fee" | "open";
const LS_FILTER = "pva_store_filters";
const LS_RECENTS = "pva_recent_searches";

function loadFilters() {
  try { return JSON.parse(localStorage.getItem(LS_FILTER) || "{}"); } catch { return {}; }
}
function saveFilters(v: object) {
  try { localStorage.setItem(LS_FILTER, JSON.stringify(v)); } catch {}
}
function loadRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_RECENTS) || "[]"); } catch { return []; }
}
function pushRecent(term: string) {
  const prev = loadRecents().filter(s => s !== term);
  localStorage.setItem(LS_RECENTS, JSON.stringify([term, ...prev].slice(0, 5)));
}

// ─── Skeleton components ──────────────────────────────────────────────────────
function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-card ${className}`}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden border border-border/40 bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
      <SkeletonPulse className="aspect-[16/9] rounded-none" />
      <div className="px-4 py-3 flex items-center gap-3">
        <SkeletonPulse className="w-20 h-3" />
        <SkeletonPulse className="w-12 h-3" />
        <SkeletonPulse className="w-16 h-3 ml-auto" />
      </div>
    </div>
  );
}

function SkeletonCarouselItem() {
  return (
    <div className="shrink-0 w-44">
      <SkeletonPulse className="aspect-[4/3] w-full" />
      <SkeletonPulse className="w-32 h-3 mt-2" />
      <SkeletonPulse className="w-20 h-2.5 mt-1.5" />
    </div>
  );
}

// ─── Smart Search Bar ─────────────────────────────────────────────────────────
function SmartSearchBar() {
  const [location, setLocation] = useState("");
  const [locOpen, setLocOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const recents = loadRecents();
  // State for autocomplete query
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  // Attempt to get user's location on mount
  useEffect(() => {
    if (!location) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // For a real app, use reverse geocoding API to get the city.
            // Since we don't have an API key right now, we default to Primavera do Leste, MT
            // so the user sees the actual city name instead of lat/long coordinates.
            setLocation("Primavera do Leste, MT");
          },
          () => {
            // Fallback if permission denied
            setLocation("Primavera, SP");
          }
        );
      } else {
        setLocation("Primavera, SP");
      }
    }
  }, []);

  const locSuggestions = query.length > 0
    ? LOCATION_SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : LOCATION_SUGGESTIONS;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
        setLocOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (term: string) => {
    if (term.trim()) pushRecent(term.trim());
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} className="relative mt-5">
      {/* Location pill */}
      <motion.button
        onClick={() => { setLocOpen(v => !v); setFocused(false); }}
        whileTap={{ scale: 0.96 }}
        className="inline-flex items-center gap-1 text-xs bg-background/15 backdrop-blur px-3 py-1.5 rounded-full font-medium mb-3 border border-white/10 hover:border-white/25 transition-colors"
      >
        <MapPin className="w-3.5 h-3.5" />
        {location}
        <ChevronRight className={`w-3 h-3 transition-transform ${locOpen ? "rotate-90" : ""}`} />
      </motion.button>

      {/* Location dropdown */}
      <AnimatePresence>
        {locOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-10 z-50 w-72 bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-3 border-b border-border/40">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar bairro ou rua…"
                className="w-full bg-background/60 rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground border border-border/50 focus:border-primary/60 transition-colors"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto py-1.5">
              {locSuggestions.map((s, i) => (
                <motion.li
                  key={s}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    onClick={() => { setLocation(s); setLocOpen(false); setQuery(""); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    {s}
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <motion.div
        animate={focused ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <div
          className={`flex items-center gap-3 bg-background/95 backdrop-blur text-foreground rounded-2xl px-4 py-3 border transition-all duration-300 ${focused ? "border-primary/60 shadow-[0_0_20px_oklch(0.58_0.23_22/0.3)]" : "border-white/10"}`}
        >
          <Search className={`w-4 h-4 shrink-0 transition-colors ${focused ? "text-primary" : "text-muted-foreground"}`} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar lojas, pratos…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
            onFocus={() => setFocused(true)}
            onKeyDown={e => e.key === "Enter" && handleSearch((e.target as HTMLInputElement).value)}
          />
          <AnimatePresence>
            {focused && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
                onClick={() => { setFocused(false); inputRef.current?.blur(); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Search suggestions dropdown */}
        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/60 rounded-2xl overflow-hidden z-50 shadow-2xl"
            >
              {recents.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buscas recentes</span>
                  </div>
                  {recents.map((r, i) => (
                    <motion.button
                      key={r}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors text-left"
                      onClick={() => handleSearch(r)}
                    >
                      <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {r}
                    </motion.button>
                  ))}
                  <div className="h-px bg-border/40 mx-4 my-1" />
                </>
              )}
              <div className="flex items-center gap-2 px-4 pt-2 pb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Populares</span>
              </div>
              {["Pizza", "Hambúrguer", "Japonês", "Mercado", "Farmácia"].map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors text-left"
                  onClick={() => handleSearch(s)}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {s}
                </motion.button>
              ))}
              <div className="h-3" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Para você" },
  { key: "rating", label: "⭐ Top rated" },
  { key: "fee", label: "Menor taxa" },
  { key: "open", label: "Aberto agora" },
];

function FilterBar({
  sort, setSort, openOnly, setOpenOnly,
}: {
  sort: SortKey; setSort: (s: SortKey) => void;
  openOnly: boolean; setOpenOnly: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
      {SORT_OPTIONS.map(opt => {
        const active = sort === opt.key;
        return (
          <motion.button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            whileTap={{ scale: 0.92 }}
            layout
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-200 ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_oklch(0.58_0.23_22/0.4)]"
                : "bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {active && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {opt.label}
          </motion.button>
        );
      })}
      <motion.button
        onClick={() => setOpenOnly(!openOnly)}
        whileTap={{ scale: 0.92 }}
        layout
        className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-200 ${
          openOnly
            ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_18px_oklch(0.72_0.18_145/0.4)]"
            : "bg-card border-border/60 text-muted-foreground hover:border-emerald-500/40 hover:text-foreground"
        }`}
      >
        {openOnly && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
        Aberto agora
      </motion.button>
    </div>
  );
}

// ─── Store card (16:9 premium) ────────────────────────────────────────────────
function StoreCard({ s, i }: { s: Company; i: number }) {
  const eta = 20 + ((i * 7) % 25);
  const freeShip = (s.delivery_fee ?? 0) === 0;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
    >
      <Link to="/marketplace/store/$storeId" params={{ storeId: s.id }} className="block group">
        <motion.div
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.975 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="rounded-3xl overflow-hidden border border-border/50 group-hover:border-primary/40 transition-colors duration-300"
          style={{
            boxShadow: "var(--shadow-card)",
            background: "var(--card)",
          }}
        >
          {/* 16:9 image */}
          <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
            {s.cover_url ? (
              <img
                src={s.cover_url}
                alt={s.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
              />
            ) : (
              <div className="w-full h-full" style={{ background: "var(--gradient-primary)" }} />
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/25 to-transparent" />
            {/* Red glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 bg-gradient-to-t from-primary/25 via-transparent to-transparent pointer-events-none" />

            {/* Top chips */}
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {freeShip && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-lg">
                    <Zap className="w-2.5 h-2.5 fill-white" /> Grátis
                  </span>
                )}
                {s.rating && s.rating >= 4.7 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/90 text-primary-foreground px-2.5 py-1 rounded-full backdrop-blur-sm shadow-lg">
                    ⭐ Top rated
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-lg ${s.is_open ? "bg-emerald-500/90 text-white" : "bg-black/60 text-white/60"}`}>
                {s.is_open ? "● Aberto" : "● Fechado"}
              </span>
            </div>

            {/* Bottom name inside image */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16">
              <div className="flex items-end gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white shrink-0 grid place-items-center font-display font-black text-2xl text-neutral-900 ring-2 ring-white/25 overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" /> : s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 pb-0.5">
                  <h3 className="font-display font-black text-lg leading-tight text-white truncate" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                    {s.name}
                  </h3>
                  <p className="text-[11px] text-white/70 truncate mt-0.5">{s.category} · {s.address ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 flex items-center gap-2.5 text-xs border-t border-border/30">
            <span className="flex items-center gap-1 font-bold text-[13px] text-foreground">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              {s.rating?.toFixed(1) ?? "—"}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {eta}–{eta + 10} min
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className={`font-semibold ${freeShip ? "text-emerald-400" : "text-muted-foreground"}`}>
              {freeShip ? "Entrega grátis" : `R$ ${(s.delivery_fee ?? 0).toFixed(2).replace(".", ",")}`}
            </span>
            <span className="ml-auto flex items-center gap-0.5 text-primary font-bold opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200">
              Abrir <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </motion.div>
      </Link>
    </motion.li>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function MarketplaceHome() {
  const saved = loadFilters();
  const [sort, setSort] = useState<SortKey>(saved.sort ?? "relevance");
  const [openOnly, setOpenOnly] = useState<boolean>(saved.openOnly ?? false);
  const [showAll, setShowAll] = useState(false);

  const handleSetSort = useCallback((s: SortKey) => {
    setSort(s);
    saveFilters({ sort: s, openOnly });
  }, [openOnly]);

  const handleSetOpen = useCallback((v: boolean) => {
    setOpenOnly(v);
    saveFilters({ sort, openOnly: v });
  }, [sort]);

  const { data: stores, isLoading } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK;
      const { data, error } = await supabase.from("companies").select("*").eq("active", true).limit(40);
      if (error || !data || data.length === 0) return MOCK;
      return data as Company[];
    },
  });

  const allStores = stores ?? [];
  const top = useMemo(() => [...allStores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 6), [allStores]);

  const filtered = useMemo(() => {
    let list = openOnly ? allStores.filter(s => s.is_open) : [...allStores];
    if (sort === "rating") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sort === "fee") list.sort((a, b) => (a.delivery_fee ?? 99) - (b.delivery_fee ?? 99));
    else if (sort === "open") list.sort((a, b) => (b.is_open ? 1 : 0) - (a.is_open ? 1 : 0));
    return list;
  }, [allStores, sort, openOnly]);

  const visibleStores = showAll ? filtered : filtered.slice(0, 3);

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <section
        className="rounded-3xl p-6 pb-7 text-primary-foreground relative overflow-hidden"
        style={{ background: "var(--gradient-sunset)", boxShadow: "var(--shadow-premium)" }}
      >
        <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-mesh)" }} />
        
        {/* Fundo preto na direita com borda esquerda arredondada (semi-círculo) */}
        <div className="absolute right-0 top-0 bottom-0 w-[55%] flex items-center justify-end z-0 pointer-events-none">
          <div className="w-full h-full bg-black rounded-l-[140px] flex items-center justify-center px-8 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
            <img 
              src={logoBanner} 
              alt="Primavera Delivery" 
              aria-hidden 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>

        <div className="relative z-10 max-w-[45%]">
          <h1 className="font-display text-[28px] font-extrabold leading-[1.05] tracking-tight">
            Sua cidade,<br />em minutos.
          </h1>
          <p className="mt-2 text-xs opacity-90">Delivery, mercado, farmácia e a agenda completa da sua cidade.</p>
        </div>
        <SmartSearchBar />
      </section>

      {/* ── Categories ── */}
      <section>
        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.button
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span
                  className="w-12 h-12 rounded-2xl grid place-items-center bg-card border border-border/60 group-hover:border-primary/50 group-hover:shadow-[0_0_18px_oklch(0.58_0.23_22/0.3)] transition-all duration-300"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </span>
                <span className="text-[10px] font-medium text-foreground/70 text-center leading-tight">{c.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Quick banners ── */}
      <section className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}>
          <Zap className="w-5 h-5 mb-2" />
          <p className="font-display font-bold text-sm leading-tight">Entrega expressa</p>
          <p className="text-[11px] opacity-85 mt-0.5">Em até 30 min</p>
        </div>
        <Link to="/marketplace/directory" className="p-4 rounded-2xl bg-card border border-border/60 relative overflow-hidden hover:border-primary/40 transition-colors">
          <Tag className="w-5 h-5 mb-2 text-primary" />
          <p className="font-display font-bold text-sm leading-tight">Agenda da cidade</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Telefones e contatos</p>
        </Link>
      </section>

      {/* ── Errands ── */}
      <section>
        <Link to="/marketplace/errands" className="block p-5 rounded-2xl text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-sunset)", boxShadow: "var(--shadow-elegant)" }}>
          <div className="relative z-10">
            <Zap className="w-6 h-6 mb-2" />
            <h2 className="font-display font-bold text-xl leading-tight">Precisa enviar algo?</h2>
            <p className="text-xs opacity-90 mt-1">Chame um entregador agora para buscar e levar qualquer coisa para você na cidade.</p>
          </div>
        </Link>
      </section>

      {/* ── Destaque carousel (Mais bem avaliados) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Star className="w-4 h-4 text-primary fill-primary" /> Em destaque
          </h2>
          <button className="text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline">
            Ver tudo <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-3 scrollbar-none snap-x snap-mandatory">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 snap-start w-48">
                  <SkeletonCarouselItem />
                </div>
              ))
            : top.map((s, i) => {
                const freeShip = (s.delivery_fee ?? 0) === 0;
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.35 }}
                    className="shrink-0 snap-start w-48"
                  >
                    <Link to="/marketplace/store/$storeId" params={{ storeId: s.id }} className="block group">
                      <motion.div
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.96 }}
                        className="aspect-[4/3] rounded-2xl bg-secondary relative overflow-hidden border border-border/40 group-hover:border-primary/40 transition-colors duration-300"
                        style={{ boxShadow: "var(--shadow-card)" }}
                      >
                        {s.cover_url
                          ? <img src={s.cover_url} alt={s.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]" />
                          : <div className="w-full h-full" style={{ background: "var(--gradient-primary)" }} />
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {/* Rating badge */}
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur">
                          <Star className="w-3 h-3 fill-primary text-primary" /> {s.rating?.toFixed(1)}
                        </span>

                        {freeShip && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold bg-emerald-500/90 text-white px-2 py-0.5 rounded-full">
                            Grátis
                          </span>
                        )}

                        {/* Store name inside */}
                        <div className="absolute bottom-2 left-3 right-3">
                          <p className="font-display font-black text-sm text-white leading-tight truncate drop-shadow-lg">{s.name}</p>
                        </div>
                      </motion.div>
                      <p className="mt-2 text-xs text-muted-foreground truncate">{s.category}</p>
                    </Link>
                  </motion.div>
                );
              })
          }
        </div>
      </section>

      {/* ── Lojas próximas com filtros ── */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Lojas próximas</h2>
            <p className="text-xs text-muted-foreground">Selecionadas para você</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            <SlidersHorizontal className="w-3.5 h-3.5" /> {filtered.length} lojas
          </span>
        </div>

        <FilterBar sort={sort} setSort={handleSetSort} openOnly={openOnly} setOpenOnly={handleSetOpen} />

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                <ul className="space-y-5">
                  {visibleStores.map((s, i) => <StoreCard key={s.id} s={s} i={i} />)}
                </ul>
              </AnimatePresence>

              {filtered.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
                  <p className="text-5xl mb-3">😴</p>
                  <p className="font-display font-bold text-foreground">Nenhuma loja encontrada</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente remover os filtros.</p>
                </motion.div>
              )}

              {/* Ver mais */}
              {!showAll && filtered.length > 3 && (
                <motion.button
                  onClick={() => setShowAll(true)}
                  whileTap={{ scale: 0.97 }}
                  className="mt-5 w-full py-3.5 rounded-2xl border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
                >
                  Ver mais {filtered.length - 3} lojas <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
