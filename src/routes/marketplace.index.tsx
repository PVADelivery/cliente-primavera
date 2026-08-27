import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Star, Clock, Search, Zap, Tag, ChevronRight,
  UtensilsCrossed, ShoppingBasket, Pill, Pizza, IceCream, Coffee,
  SlidersHorizontal, CheckCircle2, X, History, TrendingUp, ShoppingBag, Wine, Car,
  Users, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Company } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { AeroTile, AeroPlate, AeroSection, AeroButton } from "@/components/aero";

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "MT 24horas express — Comida, mercado e farmácia na sua porta" },
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
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LS_FILTER) || "{}"); } catch { return {}; }
}
function saveFilters(v: object) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_FILTER, JSON.stringify(v)); } catch {}
}
function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_RECENTS) || "[]"); } catch { return []; }
}
function pushRecent(term: string) {
  if (typeof window === "undefined") return;
  const prev = loadRecents().filter(s => s !== term);
  try { localStorage.setItem(LS_RECENTS, JSON.stringify([term, ...prev].slice(0, 5))); } catch {}
}

// ─── Skeleton components ──────────────────────────────────────────────────────
function AeroPanel({
  to,
  icon: Icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="p-5 rounded-3xl relative block group clearcoat border border-black/10 hover:border-black/20 active:border-black/30 transition-colors bg-primary hover:bg-primary active:bg-primary"
      style={{
        boxShadow: "0 24px 40px -24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45)",
      }}
    >
      {/* Halo amarelo difuso atrás do botão */}
      <span aria-hidden className="absolute -inset-3 rounded-[2rem] bg-primary-glow/40 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
      <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.06] rounded-3xl pointer-events-none" />
      <span aria-hidden className="spec-sheen" />
      <div className="relative z-10">
        <div className="w-11 h-11 rounded-full grid place-items-center bg-black/15 ring-1 ring-black/25 mb-4">
          <Icon className="w-5 h-5 text-primary-foreground" strokeWidth={1.75} />
        </div>
        <p className="font-display font-bold italic text-base leading-tight text-primary-foreground">{title}</p>
        <p className="text-xs text-primary-foreground/80 mt-1.5 font-medium">{subtitle}</p>

      </div>
    </Link>
  );
}

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
function SmartSearchBar({
  searchTerm,
  setSearchTerm,
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
}) {
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
    setSearchTerm(term);
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
          className={`flex items-center gap-3 bg-black/90 backdrop-blur-md text-white rounded-2xl px-4 py-3.5 border transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] ${focused || searchTerm ? "border-primary ring-2 ring-primary/40" : "border-black/60 hover:bg-black"}`}
        >
          <Search className={`w-4 h-4 shrink-0 transition-colors ${focused || searchTerm ? "text-primary" : "text-white/70"}`} />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar lojas, pratos (ex: x tudo, pizza, açaí)…"
            className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/50 min-w-0"
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(searchTerm);
              }
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                inputRef.current?.focus();
              }}
              className="text-white/50 hover:text-white p-1"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search suggestions dropdown */}
        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 text-white border border-border rounded-2xl overflow-hidden z-50 shadow-2xl"
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
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-card/70 transition-colors text-left"
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
              {["X tudo", "Pizza", "Hambúrguer", "Açaí", "Lanches", "Mercado", "Farmácia"].map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium hover:bg-card/70 transition-colors text-left"
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
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 py-1 scrollbar-none" role="group" aria-label="Filtros de lojas">
      {SORT_OPTIONS.map(opt => {
        const active = sort === opt.key;
        return (
          <AeroPlate key={opt.key} active={active} onClick={() => setSort(opt.key)}>
            {active && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {opt.label}
          </AeroPlate>
        );
      })}
      <AeroPlate
        active={openOnly}
        onClick={() => setOpenOnly(!openOnly)}
        className={openOnly ? "bg-emerald-500 border-emerald-500 text-white" : undefined}
      >
        {openOnly && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
        Aberto agora
      </AeroPlate>
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
      className="relative group"
    >
      {/* Dynamic Futuristic Fire Aura behind the card */}
      <div className="absolute -inset-2 rounded-[32px] fire-glow opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none z-0" />
      <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-amber-500/30 via-orange-600/40 to-red-500/30 blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none z-0" />

      <Link to="/marketplace/store/$storeId" params={{ storeId: s.id }} className="block group relative z-10">
        <motion.div
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="rounded-3xl overflow-hidden border border-border/40 group-hover:border-amber-500/60 transition-all duration-400 relative z-10 bg-card"
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
              <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #FFBE5A 0%, #3B82F6 100%)" }} />
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/25 to-transparent" />
            {/* Blue glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 bg-gradient-to-t from-blue-500/25 via-transparent to-transparent pointer-events-none" />

            {/* Corner bracket lines on hover */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top-left */}
              <span className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-white/80 rounded-tl-sm opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:top-2 group-hover:left-2" />
              {/* Top-right */}
              <span className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white/80 rounded-tr-sm opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:top-2 group-hover:right-2" />
              {/* Bottom-left */}
              <span className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-white/80 rounded-bl-sm opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bottom-2 group-hover:left-2" />
              {/* Bottom-right */}
              <span className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-white/80 rounded-br-sm opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bottom-2 group-hover:right-2" />
            </div>

            {/* Top chips */}
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(s.rating ?? 5) >= 4.7 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F9A03F]/90 text-yellow-950 px-2.5 py-1 rounded-full backdrop-blur-sm shadow-lg">
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
              <Star className="w-4 h-4 fill-[#F9A03F] text-[#F9A03F]" />
              {(s.rating ?? 5).toFixed(1)}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Clock className="w-4 h-4" /> {eta}–{eta + 10} min
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="font-semibold text-muted-foreground">
              {s.delivery_fee && s.delivery_fee > 0 ? `R$ ${s.delivery_fee.toFixed(2).replace(".", ",")}` : "Entrega por região"}
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
  const [searchTerm, setSearchTerm] = useState<string>("");

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
      try {
        // Tenta primeiro via RPC pública (bypassa restrições RLS em tabelas para visitantes anon)
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_public_companies");
        if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
          return rpcData as Company[];
        }

        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .order("name", { ascending: true });
        if (error) {
          console.error("Error fetching companies:", error);
          return (rpcData as Company[]) || [];
        }
        return data || [];
      } catch (err) {
        console.error("Exception fetching companies:", err);
        return [];
      }
    },
  });

  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["all-products-search"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, description, category, company_id")
          .eq("is_active", true);
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const allStores = stores ?? [];
  const top = useMemo(() => [...allStores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8), [allStores]);

  const filtered = useMemo(() => {
    let list = [...allStores];
    const q = searchTerm.trim().toLowerCase();

    if (q) {
      const matchingCompanyIds = new Set(
        allProducts
          .filter(
            (p) =>
              p.name?.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q) ||
              p.category?.toLowerCase().includes(q)
          )
          .map((p) => p.company_id)
      );

      list = list.filter((s) => {
        const nameMatch = s.name?.toLowerCase().includes(q);
        const catMatch = s.category?.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q);
        const addressMatch = s.address?.toLowerCase().includes(q);
        const productMatch = matchingCompanyIds.has(s.id);
        return nameMatch || catMatch || descMatch || addressMatch || productMatch;
      });
    }

    if (openOnly) {
      list = list.filter((s) => s.is_open === true || s.is_open === null || s.is_open === undefined);
    }

    if (sort === "fee") {
      list.sort((a, b) => (a.delivery_fee ?? 99) - (b.delivery_fee ?? 99));
    } else if (sort === "rating") {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list;
  }, [allStores, allProducts, searchTerm, sort, openOnly]);

  const visibleStores = filtered;

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <section
        className="group rounded-[22px] p-4 sm:p-6 text-white relative z-20"
        style={{
          boxShadow:
            "0 40px 80px -32px rgba(0,0,0,0.9), 0 0 0 1px rgba(249,160,63,0.10), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Camada de fundo recortada para conter os efeitos visuais sem cortar o dropdown de busca */}
        <div
          className="absolute inset-0 rounded-[22px] overflow-hidden -z-10"
          style={{
            background:
              "radial-gradient(120% 100% at 100% 0%, #1a1408 0%, #0a0803 40%, #000000 75%)",
          }}
        >
          {/* Sol interno — halo suave */}
          <div
            aria-hidden
            className="absolute -top-32 -right-20 w-[320px] h-[320px] rounded-full pointer-events-none transition-[filter,opacity] duration-700 ease-out group-hover:opacity-100 opacity-95 will-change-[filter]"
            style={{
              background:
                "radial-gradient(circle, rgba(255,190,90,0.95) 0%, rgba(249,160,63,0.55) 25%, rgba(230,140,40,0.15) 55%, rgba(0,0,0,0) 75%)",
              filter: "blur(28px)",
            }}
          />
          {/* Núcleo do sol — brilho concentrado */}
          <div
            aria-hidden
            className="absolute -top-14 -right-4 w-32 h-32 rounded-full pointer-events-none opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(circle, rgba(255,214,150,1) 0%, rgba(249,160,63,0.7) 40%, rgba(249,160,63,0) 70%)",
              filter: "blur(6px)",
            }}
          />
          {/* Fibra de carbono */}
          <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.5] mix-blend-overlay pointer-events-none" />
          {/* Verniz — reflexo de lataria */}
          <div aria-hidden className="absolute inset-0 clearcoat pointer-events-none mix-blend-screen opacity-70" />
        </div>

        {/* Conteúdo do Hero e Barra de Busca */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 space-y-3 max-w-2xl"
        >
          <h1 className="font-display font-black italic text-[22px] sm:text-[30px] lg:text-[34px] leading-[1.3] pb-1 tracking-[-0.03em] drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] whitespace-nowrap overflow-hidden text-ellipsis">
            {greeting},{" "}
            <span
              className={`bg-clip-text text-transparent leading-[1.3] pr-[0.12em] transition-opacity duration-500 ${heroReady ? "opacity-100" : "opacity-70"}`}
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #ffbe5a 0%, #f9a03f 45%, #e8892b 100%)",
              }}
            >
              {firstName}
            </span>
            <span className="text-primary">.</span>
          </h1>

          <p className="text-[13px] sm:text-[14px] text-white/75 font-medium max-w-md leading-snug">
            O que você quer pedir hoje na sua cidade?
          </p>

          <SmartSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </motion.div>
      </section>

      {/* ── Categories ── */}
      <AeroSection title="Categorias" subtitle="Escolha por onde começar">
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1 snap-x snap-mandatory sm:grid sm:grid-cols-8 sm:gap-3 sm:overflow-visible sm:mx-0 sm:px-0">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            const isActive = searchTerm.toLowerCase() === c.label.toLowerCase();
            return (
              <motion.button
                key={c.label}
                type="button"
                aria-label={c.label}
                onClick={() => {
                  if (isActive) {
                    setSearchTerm("");
                  } else {
                    setSearchTerm(c.label);
                  }
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.94 }}
                whileHover={{ y: -3 }}
                className="flex flex-col items-center gap-2 group aero-focus rounded-2xl shrink-0 snap-start w-[68px] sm:w-auto cursor-pointer"
              >
                <div
                  className={`aero-plate w-full aspect-square max-w-[72px] min-h-[56px] grid place-items-center relative overflow-hidden -skew-x-[6deg] transition-all duration-300 group-hover:-skew-x-[3deg] bg-primary border border-black/10 group-hover:border-black/20 ${isActive ? "ring-2 ring-primary-glow/70 shadow-[0_0_20px_rgba(217,180,91,0.45)]" : ""}`}
                  style={{
                    boxShadow: "0 14px 26px -14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45)",
                  }}
                >
                  {/* Halo amarelo difuso atrás da placa */}
                  <span aria-hidden className="absolute -inset-3 rounded-full bg-primary-glow/40 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
                  <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.06] rounded-2xl" />
                  <div aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-2xl" />
                  <span aria-hidden className="spec-sheen" />
                  <Icon className="w-6 h-6 text-primary-foreground skew-x-[6deg] relative z-10" strokeWidth={1.75} />
                </div>
                <span className={`text-[12px] font-semibold text-center leading-tight ${isActive ? "text-primary font-bold" : "text-foreground"}`}>{c.label}</span>

              </motion.button>
            );
          })}
        </div>
      </AeroSection>

      {/* ── Quick banners ── */}
      <section className="grid grid-cols-2 gap-3">
        <AeroPanel to="/marketplace/errands" icon={Zap} title={<>Solicitar<br/>Entrega</>} subtitle="Motoboy rápido" />
        <AeroPanel to="/marketplace/directory" icon={Tag} title="PPP" subtitle="Painel Profissional Prestador de Serviços" />
      </section>

      {/* ── Taxi ── */}
      <section>
        <Link
          to="/marketplace/taxi"
          className="block p-6 rounded-3xl relative overflow-hidden group clearcoat border border-black/10 hover:border-black/20 active:border-black/30 transition-colors bg-primary hover:bg-primary active:bg-primary"
          style={{
            boxShadow: "0 24px 40px -24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45)",
          }}
        >
          {/* Nuvem dourada difusa atrás do botão */}
          <span aria-hidden className="absolute -inset-3 rounded-[2rem] bg-primary-glow/40 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
          <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.06] rounded-3xl" />
          <span aria-hidden className="spec-sheen" />
          <div aria-hidden className="absolute -right-4 top-1/2 -translate-y-1/2 text-[90px] text-black/10 font-black italic tracking-tighter pointer-events-none transition-transform group-hover:scale-110">TAXI</div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-black/15 ring-1 ring-black/25 shadow-sm grid place-items-center">
                <Car className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="font-display font-bold italic text-2xl leading-tight text-primary-foreground">Táxi &amp; Moto Táxi</h2>
            </div>
            <p className="text-sm text-primary-foreground/80 max-w-[70%] font-medium mt-2">Corridas rápidas e seguras na sua porta agora.</p>

          </div>
        </Link>
      </section>

      {/* ── Espaço Social & Central de Negócios ── */}
      <section className="grid grid-cols-2 gap-3">
        <AeroPanel to="/marketplace/social" icon={Users} title={<>Espaço<br/>Social</>} subtitle="Classificados da cidade" />
        <AeroPanel to="/marketplace/business" icon={Building2} title={<>Central de<br/>Negócios</>} subtitle="Imóveis e locação" />
      </section>

      {/* ── Destaque carousel (Mais bem avaliados) ── */}
      <AeroSection
        title="Em destaque"
       
        subtitle="Os mais bem avaliados agora"
        action={
          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
            <Star className="w-3.5 h-3.5 fill-primary" /> Top {top.length}
          </span>
        }
      >
        <div className="flex gap-4 overflow-x-auto -mx-4 px-4 py-2 scrollbar-none snap-x snap-mandatory">
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
                          ? <img src={s.cover_url} alt={s.name} loading="lazy" className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07] ${!s.is_open ? "grayscale" : ""}`} />
                          : <div className={`w-full h-full ${!s.is_open ? "grayscale" : ""}`} style={{ background: "var(--gradient-primary)" }} />
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {/* Rating badge */}
                        <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur">
                          <Star className="w-3 h-3 fill-primary text-primary" /> {(s.rating ?? 5).toFixed(1)}
                        </span>

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
      </AeroSection>

      {/* ── Lojas próximas com filtros ── */}
      <AeroSection
        title="Lojas próximas"
       
        subtitle="Selecionadas para você"
        action={
          <span className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/25">
            <SlidersHorizontal className="w-3.5 h-3.5" /> {filtered.length} lojas
          </span>
        }
      >
        <FilterBar sort={sort} setSort={handleSetSort} openOnly={openOnly} setOpenOnly={handleSetOpen} />

        {searchTerm && (
          <div className="mt-3 flex items-center justify-between bg-primary/10 border border-primary/30 px-4 py-2.5 rounded-2xl">
            <p className="text-xs font-bold text-foreground">
              Exibindo resultados para "<span className="text-primary">{searchTerm}</span>" ({filtered.length} {filtered.length === 1 ? "loja" : "lojas"})
            </p>
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
        )}

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
                  <p className="text-sm text-muted-foreground mt-1">Tente remover os filtros ou veja todas as lojas.</p>
                  <AeroButton
                    onClick={() => { setOpenOnly(false); setSort("relevance"); saveFilters({}); }}
                    className="mt-4"
                  >
                    Ver todas as lojas
                  </AeroButton>
                </motion.div>
              )}

            </>
          )}
        </div>
      </AeroSection>

      {/* ── BONASOFT Watermark ── */}
      <div className="pt-8 pb-4 flex justify-center opacity-40 select-none pointer-events-none">
        <span className="text-[10px] font-black tracking-[0.5em] text-muted-foreground uppercase">
          B O N A S O F T
        </span>
      </div>
    </div>
  );
}
