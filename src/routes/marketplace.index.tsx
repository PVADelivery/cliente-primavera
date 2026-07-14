import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Star, Clock, Search, Zap, Tag, ChevronRight,
  UtensilsCrossed, ShoppingBasket, Pill, Pizza, IceCream, Coffee,
  SlidersHorizontal, CheckCircle2, X, History, TrendingUp, ShoppingBag, Wine, Car
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Company } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

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

const CATEGORIES: Array<{ label: string; icon: typeof UtensilsCrossed }> = [
  { label: "Restaurantes", icon: UtensilsCrossed },
  { label: "Mercado", icon: ShoppingBasket },
  { label: "Farmácia", icon: Pill },
  { label: "Pizza", icon: Pizza },
  { label: "Doces", icon: IceCream },
  { label: "Cafés", icon: Coffee },
  { label: "Shopping", icon: ShoppingBag },
  { label: "Bebidas", icon: Wine },
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
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-[200%]"
        animate={{ x: ["-100%", "50%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const recents = loadRecents();
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
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
      {/* Search bar */}
      <motion.div
        animate={focused ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <div
          className={`flex items-center gap-3 bg-black/90 backdrop-blur-md text-white rounded-2xl px-4 py-3.5 border transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] ${focused ? "border-primary ring-2 ring-primary/40" : "border-black/60 hover:bg-black"}`}
        >
          <Search className={`w-4 h-4 shrink-0 transition-colors ${focused ? "text-primary" : "text-white/70"}`} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar lojas, pratos…"
            className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/50 min-w-0"
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
                className="text-white/50 hover:text-white"
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
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 text-white border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
            >
              {recents.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                    <History className="w-3.5 h-3.5 text-white/50" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Buscas recentes</span>
                  </div>
                  {recents.map((r, i) => (
                    <motion.button
                      key={r}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors text-left"
                      onClick={() => handleSearch(r)}
                    >
                      <History className="w-3.5 h-3.5 text-white/40 shrink-0" />
                      {r}
                    </motion.button>
                  ))}
                  <div className="h-px bg-white/10 mx-4 my-1" />
                </>
              )}
              <div className="flex items-center gap-2 px-4 pt-2 pb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Populares</span>
              </div>
              {["Pizza", "Hambúrguer", "Japonês", "Mercado", "Farmácia"].map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors text-left"
                  onClick={() => handleSearch(s)}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-white/40 shrink-0" />
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
const SORT_OPTIONS: { key: Exclude<SortKey, "open">; label: string }[] = [
  { key: "relevance", label: "Para você" },
  { key: "rating", label: "Melhor avaliado" },
  { key: "fee", label: "Menor taxa" },
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
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-bold border whitespace-nowrap transition-all duration-300 ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_24px_-4px_var(--tw-shadow-color)] shadow-primary/40 ring-1 ring-primary/20"
                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            {active && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {opt.label}
          </motion.button>
        );
      })}
      <motion.button
        onClick={() => setOpenOnly(!openOnly)}
        whileTap={{ scale: 0.92 }}
        layout
        className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-bold border whitespace-nowrap transition-all duration-300 ${
          openOnly
            ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_4px_24px_-4px_var(--tw-shadow-color)] shadow-emerald-500/40 ring-2 ring-emerald-500/20"
            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
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
  const freeShip = s.delivery_fee === 0;
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
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="rounded-3xl overflow-hidden border border-border/40 group-hover:border-blue-500/50 transition-all duration-400 relative z-0 bg-card"
          style={{
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* 16:9 image */}
          <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
            {s.cover_url ? (
              <img
                src={s.cover_url}
                alt={s.name}
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07] ${!s.is_open ? "grayscale" : ""}`}
              />
            ) : (
              <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #FDE047 0%, #3B82F6 100%)" }} />
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/25 to-transparent" />
            {/* Blue glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 bg-gradient-to-t from-blue-500/25 via-transparent to-transparent pointer-events-none" />

            {/* Top chips */}
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {freeShip && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-lg">
                    <Zap className="w-2.5 h-2.5 fill-white" /> Grátis
                  </span>
                )}
                {(s.rating ?? 5) >= 4.7 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FACC15]/90 text-yellow-950 px-2.5 py-1 rounded-full backdrop-blur-sm shadow-lg">
                    Melhor avaliado
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
                <div className="w-14 h-14 rounded-2xl bg-white shrink-0 grid place-items-center font-display font-black text-2xl text-slate-900 ring-2 ring-white/25 overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  {s.logo_url ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" /> : s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1 pb-0.5">
                  <h3 className="font-display font-black text-xl tracking-tight leading-tight text-white truncate" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
                    {s.name}
                  </h3>
                  <p className="text-xs font-medium text-white/80 truncate mt-1 drop-shadow-md">{s.category} • {s.address ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 flex items-center gap-2.5 text-xs border-t border-border/30">
            <span className="flex items-center gap-1.5 font-black text-[14px] text-foreground">
              <Star className="w-4 h-4 fill-[#FACC15] text-[#FACC15]" />
              {(s.rating ?? 5).toFixed(1)}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Clock className="w-4 h-4" /> {eta}–{eta + 10} min
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className={`font-semibold ${freeShip ? "text-emerald-500" : "text-muted-foreground"}`}>
              {freeShip ? "Entrega grátis" : s.delivery_fee != null ? `R$ ${s.delivery_fee.toFixed(2).replace(".", ",")}` : "Taxa a calcular"}
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
  const { user } = useAuth();
  const firstName = (
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "visitante"
  ).split(" ")[0];
  const [greeting, setGreeting] = useState<string>("Olá");
  const [heroReady, setHeroReady] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [openOnly, setOpenOnly] = useState<boolean>(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");
    const saved = loadFilters();
    if (saved.sort) setSort(saved.sort);
    if (typeof saved.openOnly === "boolean") setOpenOnly(saved.openOnly);
    setHeroReady(true);
  }, []);

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
    placeholderData: [],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      try {
        const result = await Promise.race([
          supabase.from("companies").select("*").eq("is_active", true).limit(40),
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 4000),
          ),
        ]);
        const { data, error } = result as { data: Company[] | null; error: unknown };
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
  });

  const allStores = stores ?? [];
  const top = useMemo(() => [...allStores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 6), [allStores]);

  const filtered = useMemo(() => {
    let list = openOnly ? allStores.filter(s => s.is_open) : [...allStores];
    if (sort === "fee") {
      list.sort((a, b) => {
        const openDiff = (b.is_open ? 1 : 0) - (a.is_open ? 1 : 0);
        if (openDiff !== 0) return openDiff;
        return (a.delivery_fee ?? 99) - (b.delivery_fee ?? 99);
      });
    } else {
      // default: abertas primeiro, ordenadas por avaliação; fechadas no fim
      list.sort((a, b) => {
        const openDiff = (b.is_open ? 1 : 0) - (a.is_open ? 1 : 0);
        if (openDiff !== 0) return openDiff;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });
    }
    return list;
  }, [allStores, sort, openOnly]);

  const visibleStores = filtered;

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <section
        className="group rounded-[28px] p-7 sm:p-10 lg:p-14 text-white relative overflow-hidden isolate"
        style={{
          background:
            "radial-gradient(120% 100% at 100% 0%, #1a1408 0%, #0a0803 40%, #000000 75%)",
          boxShadow:
            "0 40px 80px -32px rgba(0,0,0,0.9), 0 0 0 1px rgba(250,204,21,0.10), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Sol interno — halo suave */}
        <div
          aria-hidden
          className="absolute -top-40 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none transition-[filter,opacity] duration-700 ease-out group-hover:opacity-100 opacity-95 will-change-[filter]"
          style={{
            background:
              "radial-gradient(circle, rgba(253,224,71,0.95) 0%, rgba(250,204,21,0.55) 25%, rgba(234,179,8,0.15) 55%, rgba(0,0,0,0) 75%)",
            filter: "blur(28px)",
          }}
        />
        {/* Núcleo do sol — brilho concentrado */}
        <div
          aria-hidden
          className="absolute -top-16 -right-4 w-40 h-40 rounded-full pointer-events-none opacity-80 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle, rgba(255,236,153,1) 0%, rgba(250,204,21,0.7) 40%, rgba(250,204,21,0) 70%)",
            filter: "blur(6px)",
          }}
        />
        {/* Textura de grão sutil */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 space-y-5 sm:space-y-6 max-w-2xl"
        >
          <h1 className="font-display font-black text-[36px] sm:text-[54px] lg:text-[64px] leading-[0.95] tracking-[-0.025em] drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
            {greeting},<br />
            <span
              className={`bg-clip-text text-transparent inline-block transition-opacity duration-500 ${heroReady ? "opacity-100" : "opacity-70"}`}
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #fde047 0%, #facc15 45%, #f59e0b 100%)",
              }}
            >
              {firstName}
            </span>
            <span className="text-primary">.</span>
          </h1>

          <p className="text-[15px] sm:text-base text-white/80 font-medium max-w-md leading-relaxed">
            O que você quer pedir hoje na sua cidade?
          </p>

          <SmartSearchBar />
        </motion.div>
      </section>

      {/* ── Categories ── */}
      <section>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.button
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center gap-2 group"
              >
                <div
                  className="w-14 h-14 rounded-full grid place-items-center bg-primary border border-primary group-hover:bg-black group-hover:border-black transition-all duration-300 relative overflow-hidden"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-60" />
                  <Icon className="w-6 h-6 text-black group-hover:text-primary transition-colors relative z-10" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-semibold text-foreground/80 text-center leading-tight">{c.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Quick banners ── */}
      <section className="grid grid-cols-2 gap-3">
        <Link to="/marketplace/errands" className="p-5 rounded-3xl relative overflow-hidden block group bg-card border border-border/50 hover:border-primary/40 transition-colors" style={{ boxShadow: "var(--shadow-card)" }}>
          <Zap className="w-6 h-6 mb-3 text-primary" strokeWidth={1.5} />
          <p className="font-display font-bold text-base leading-tight">Solicitar<br/>Entrega</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Motoboy rápido</p>
        </Link>
        <Link to="/marketplace/directory" className="p-5 rounded-3xl relative overflow-hidden block group bg-card border border-border/50 hover:border-primary/40 transition-colors" style={{ boxShadow: "var(--shadow-card)" }}>
          <Tag className="w-6 h-6 mb-3 text-foreground/70 group-hover:text-primary transition-colors" strokeWidth={1.5} />
          <p className="font-display font-bold text-base leading-tight">Agenda da<br/>Cidade</p>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">Telefones úteis</p>
        </Link>
      </section>

      {/* ── Taxi ── */}
      <section>
        <Link to="/marketplace/taxi" className="block p-6 rounded-3xl relative overflow-hidden group bg-card border border-border/50 hover:border-primary/50 transition-colors" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-gradient-to-l from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-[90px] opacity-[0.03] font-black italic tracking-tighter mix-blend-overlay pointer-events-none transition-transform group-hover:scale-110">TAXI</div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display font-bold text-2xl leading-tight drop-shadow-sm text-foreground">Táxi & Moto Táxi</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-[70%] font-medium mt-2">Corridas rápidas e seguras na sua porta agora.</p>
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
                const freeShip = s.delivery_fee === 0;
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
                          <Star className="w-3 h-3 fill-primary text-primary" /> {(s.rating ?? 5).toFixed(1)}
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

            </>
          )}
        </div>
      </section>

      {/* ── BONASOFT Watermark ── */}
      <div className="pt-8 pb-4 flex justify-center opacity-40 select-none pointer-events-none">
        <span className="text-[10px] font-black tracking-[0.5em] text-muted-foreground uppercase">
          B O N A S O F T
        </span>
      </div>
    </div>
  );
}
