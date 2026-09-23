import { createFileRoute, Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Star, Clock, Search, Zap, Tag, ChevronRight,
  UtensilsCrossed, ShoppingBasket, Pill, Pizza, IceCream, Coffee, Sandwich,
  SlidersHorizontal, CheckCircle2, X, History, TrendingUp, ShoppingBag, Wine, Car,
  Users, Building2, BookUser, ClipboardList, User, Store, ArrowRight, Sparkles, Bike
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
  { label: "Lanches", icon: Sandwich },
  { label: "Pizza", icon: Pizza },
  { label: "Sorveteria- açaí", icon: IceCream },
  { label: "Padaria- cafés", icon: Coffee },
  { label: "Farmácia", icon: Pill },
  { label: "Bebidas", icon: Wine },
  { label: "Shopping", icon: ShoppingBag },
];

export function normalizeSearchText(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_.,/\\#+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseProductImage(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("[")) {
    try {
      const parsed = JSON.parse(rawUrl);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {}
  }
  return rawUrl;
}

const SEARCH_SYNONYMS: Record<string, string[]> = {
  "lanche": ["x tudo", "xtudo", "x-tudo", "x salada", "x bacon", "x egg", "x frango", "hamburguer", "hambúrguer", "burger", "burguer", "lanche", "lanches", "podrao", "sanduiche", "sanduíche", "artesanal", "fast food", "batata", "batata frita", "hot dog", "cachorro quente", "salgado", "salgados", "pastel", "pasteis"],
  "lanches": ["x tudo", "xtudo", "x-tudo", "x salada", "x bacon", "x egg", "x frango", "hamburguer", "hambúrguer", "burger", "burguer", "lanche", "lanches", "podrao", "sanduiche", "sanduíche", "artesanal", "fast food", "batata", "batata frita", "hot dog", "cachorro quente", "salgado", "salgados", "pastel", "pasteis"],
  "hamburguer": ["x tudo", "xtudo", "x-tudo", "x salada", "x bacon", "x egg", "x frango", "hamburguer", "burger", "lanche", "lanches", "artesanal", "smash"],
  "burger": ["x tudo", "xtudo", "x-tudo", "x salada", "x bacon", "x egg", "x frango", "hamburguer", "burger", "lanche", "lanches", "artesanal", "smash"],
  "x tudo": ["x tudo", "xtudo", "x-tudo", "x salada", "x bacon", "x egg", "x frango", "hamburguer", "burger", "lanche", "lanches", "podrao"],
  "xtudo": ["x tudo", "xtudo", "x-tudo", "x salada", "x bacon", "x egg", "x frango", "hamburguer", "burger", "lanche", "lanches", "podrao"],
  "x-tudo": ["x tudo", "xtudo", "x-tudo", "x salada", "x bacon", "x egg", "x frango", "hamburguer", "burger", "lanche", "lanches", "podrao"],
  "x salada": ["x salada", "x-salada", "x tudo", "hamburguer", "burger", "lanche"],
  "x bacon": ["x bacon", "x-bacon", "x tudo", "hamburguer", "burger", "lanche"],
  "pizza": ["pizza", "pizzas", "pizzaria", "calzone", "esfirra", "esfiha", "massa", "fogazza"],
  "pizzas": ["pizza", "pizzas", "pizzaria", "calzone", "esfirra", "esfiha", "massa", "fogazza"],
  "sorveteria- acai": ["sorveteria", "acai", "açaí", "sorvete", "sorvetes", "gelato", "picole", "picolé", "cremosinho", "casquinha", "sundae", "milk shake", "milkshake", "paleta", "acaiteria", "açaíteria", "sobremesa", "doce"],
  "sorveteria - acai": ["sorveteria", "acai", "açaí", "sorvete", "sorvetes", "gelato", "picole", "picolé", "cremosinho", "casquinha", "sundae", "milk shake", "milkshake", "paleta", "acaiteria", "açaíteria", "sobremesa", "doce"],
  "sorveteria": ["sorveteria", "acai", "açaí", "sorvete", "sorvetes", "gelato", "picole", "picolé", "cremosinho", "casquinha", "sundae", "milk shake", "milkshake", "sobremesa"],
  "sorvete": ["sorveteria", "acai", "açaí", "sorvete", "sorvetes", "gelato", "picole", "picolé", "cremosinho", "casquinha", "sundae", "milk shake", "milkshake"],
  "sorvetes": ["sorveteria", "acai", "açaí", "sorvete", "sorvetes", "gelato", "picole", "picolé", "cremosinho", "casquinha", "sundae", "milk shake", "milkshake"],
  "acai": ["acai", "açaí", "sorveteria", "cremosinho", "sorvete", "sorvetes", "gelato", "picole", "ninho", "nutella", "sobremesa", "doce"],
  "açaí": ["acai", "açaí", "sorveteria", "cremosinho", "sorvete", "sorvetes", "gelato", "picole", "ninho", "nutella", "sobremesa", "doce"],
  "cremosinho": ["cremosinho", "acai", "açaí", "sorvete", "sorveteria", "geladinho", "sobremesa", "doce"],
  "doce": ["doce", "doces", "sobremesa", "bolo", "bolos", "torta", "chocolate", "brigadeiro", "churros", "confeitaria", "padaria", "sorveteria"],
  "doces": ["doce", "doces", "sobremesa", "bolo", "bolos", "torta", "chocolate", "brigadeiro", "churros", "confeitaria", "padaria", "sorveteria"],
  "padaria- cafes": ["padaria", "padarias", "cafe", "café", "cafes", "cafés", "cafeteria", "pao", "pão", "paes", "pães", "confeitaria", "salgado", "salgados", "croissant", "torta", "tortas", "bolo", "bolos", "cappuccino", "cafezinho"],
  "padaria - cafes": ["padaria", "padarias", "cafe", "café", "cafes", "cafés", "cafeteria", "pao", "pão", "paes", "pães", "confeitaria", "salgado", "salgados", "croissant", "torta", "tortas", "bolo", "bolos", "cappuccino", "cafezinho"],
  "padaria": ["padaria", "padarias", "cafe", "café", "cafes", "cafés", "cafeteria", "pao", "pão", "paes", "pães", "confeitaria", "salgado", "salgados", "croissant", "torta", "tortas", "bolo", "bolos", "cappuccino", "cafezinho"],
  "cafe": ["cafe", "café", "cafeteria", "padaria", "pao", "pão", "confeitaria", "salgado", "salgados"],
  "café": ["cafe", "café", "cafeteria", "padaria", "pao", "pão", "confeitaria", "salgado", "salgados"],
  "cafes": ["cafe", "café", "cafeteria", "padaria", "pao", "pão", "confeitaria", "salgado", "salgados"],
  "cafés": ["cafe", "café", "cafeteria", "padaria", "pao", "pão", "confeitaria", "salgado", "salgados"],
  "farmacia": ["farmacia", "farmácia", "drogaria", "remedio", "medicamento", "saude", "curativo", "fralda", "vitamina", "suplemento"],
  "farmácia": ["farmacia", "farmácia", "drogaria", "remedio", "medicamento", "saude", "curativo", "fralda", "vitamina", "suplemento"],
  "remedio": ["farmacia", "farmácia", "drogaria", "remedio", "medicamento", "saude", "curativo", "fralda", "vitamina", "suplemento"],
  "bebida": ["bebida", "bebidas", "cerveja", "chopp", "refrigerante", "agua", "gelo", "adega", "distribuidora", "vinho", "whisky", "vodka", "energetico"],
  "bebidas": ["bebida", "bebidas", "cerveja", "chopp", "refrigerante", "agua", "gelo", "adega", "distribuidora", "vinho", "whisky", "vodka", "energetico"],
  "shopping": ["shopping", "calcado", "calçado", "calcados", "calçados", "sapato", "sapatos", "tenis", "tênis", "roupa", "roupas", "moda", "vestuario", "vestuário", "loja", "acessorio", "acessório", "chinelo", "sandalia", "sandália", "calça", "camisa"],
};

export function checkSearchMatch(targetText?: string | null, query?: string): boolean {
  if (!targetText || !query) return false;
  const targetNorm = normalizeSearchText(targetText);
  const queryNorm = normalizeSearchText(query);
  if (!targetNorm || !queryNorm) return false;

  // 1. Inclusão direta
  if (targetNorm.includes(queryNorm)) return true;

  // 2. Sem espaços
  const targetNoSpace = targetNorm.replace(/\s+/g, "");
  const queryNoSpace = queryNorm.replace(/\s+/g, "");
  if (targetNoSpace.includes(queryNoSpace) || queryNoSpace.includes(targetNoSpace)) return true;

  // 3. Todas as palavras da busca presentes no texto
  const queryWords = queryNorm.split(" ").filter(w => w.length > 1);
  if (queryWords.length > 1 && queryWords.every(w => targetNorm.includes(w))) return true;

  // 4. Prefix match (ex: "x tud" -> "x tudo")
  if (queryWords.length === 1 && queryWords[0].length >= 2) {
    const targetWords = targetNorm.split(" ");
    if (targetWords.some(w => w.startsWith(queryWords[0]))) return true;
  }

  // 5. Sinônimos bidirecionais
  for (const [key, synList] of Object.entries(SEARCH_SYNONYMS)) {
    const normKey = normalizeSearchText(key);
    if (queryNorm.includes(normKey) || normKey.includes(queryNorm) || queryNoSpace.includes(normKey.replace(/\s+/g, ""))) {
      if (synList.some(syn => targetNorm.includes(normalizeSearchText(syn)))) return true;
    }
  }

  return false;
}

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
  const matchRoute = useMatchRoute();
  const active = Boolean(matchRoute({ to, fuzzy: true }));
  return (
    <Link
      to={to}
      className={`p-5 rounded-3xl relative block group clearcoat border transition-colors aero-focus overflow-hidden ${
        active
          ? "bg-btn-active border-btn-active shadow-[0_10px_28px_-12px_rgba(255,222,33,0.8)]"
          : "bg-btn-surface border-btn-line hover:bg-btn-surface-hover hover:border-primary/45 active:bg-btn-active active:border-btn-active active:shadow-[0_10px_28px_-12px_rgba(255,222,33,0.8)]"
      }`}
      style={{
        boxShadow: "0 24px 40px -24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45)",
      }}
    >
      {/* Halo amarelo difuso atrás do botão */}
      <span aria-hidden className="absolute -inset-3 rounded-[2rem] bg-primary-glow/40 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
      <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.06] rounded-3xl pointer-events-none" />
      
      {/* Faixa de bandeira quadriculada correndo no topo (padrão 10px contínuo) */}
      <span
        aria-hidden
        className={`checker-run checker-fade-r absolute top-0 left-0 right-0 h-[10px] pointer-events-none transition-opacity duration-300 ${active ? "text-btn-active-ink/70 opacity-80" : "text-black/30 opacity-80 group-hover:opacity-100"}`}
      />

      <span aria-hidden className="spec-sheen" />
      <div className="relative z-10">
        <div className={`w-11 h-11 rounded-full grid place-items-center ring-1 mb-4 transition-colors ${active ? "bg-black/15 ring-black/25" : "bg-black/[0.06] ring-black/15 group-active:bg-black/15 group-active:ring-black/25"}`}>
          <Icon className={`w-5 h-5 transition-colors ${active ? "text-btn-active-ink" : "text-btn-ink group-active:text-btn-active-ink"}`} strokeWidth={1.75} />
        </div>
        <p className={`font-display font-bold italic text-base leading-tight transition-colors ${active ? "text-btn-active-ink" : "text-btn-ink group-active:text-btn-active-ink"}`}>{title}</p>
        <p className={`text-xs mt-1.5 font-medium transition-colors ${active ? "text-btn-active-ink/80" : "text-btn-ink-soft group-active:text-btn-active-ink/80"}`}>{subtitle}</p>

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

// ─── Funções e Serviços do App para Busca Universal ─────────────────────────
interface AppFeature {
  title: string;
  subtitle: string;
  to: string;
  icon: any;
  badge: string;
  badgeBg: string;
  keywords: string[];
}

const APP_FEATURES: AppFeature[] = [
  {
    title: "Táxi & Moto Táxi",
    subtitle: "Solicitar corrida de carro ou moto táxi em Primavera",
    to: "/marketplace/taxi",
    icon: Car,
    badge: "Corrida",
    badgeBg: "bg-primary/20 text-primary border border-primary/30",
    keywords: ["taxi", "táxi", "carro", "moto taxi", "mototaxi", "moto", "corrida", "uber", "viagem", "motorista", "passageiro", "transporte"],
  },
  {
    title: "Solicitar Entrega (Motoboy)",
    subtitle: "Entregas express, fretes rápidos e busca de encomendas",
    to: "/marketplace/errands",
    icon: Zap,
    badge: "Express",
    badgeBg: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    keywords: ["entrega", "solicitar entrega", "motoboy", "frete", "buscar chave", "encomenda", "pacote", "transporte", "delivery moto", "carro aberto", "entregador"],
  },
  {
    title: "PPP - Prestadores de Serviços",
    subtitle: "Guia comercial, profissionais e contatos locais da cidade",
    to: "/marketplace/directory",
    icon: BookUser,
    badge: "Agenda",
    badgeBg: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    keywords: ["ppp", "prestador", "prestadores", "serviço", "serviços", "servico", "guia", "diarista", "pedreiro", "eletricista", "encanador", "mecanico", "agenda", "telefones", "empresas", "comercio"],
  },
  {
    title: "Espaço Social (Classificados)",
    subtitle: "Classificados da cidade, vagas de emprego e comunidade",
    to: "/marketplace/social",
    icon: Users,
    badge: "Classificados",
    badgeBg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    keywords: ["social", "espaço social", "espaco social", "classificados", "vagas", "empregos", "trabalho", "doações", "doacoes", "comunidade", "anúncios", "anuncios", "achados e perdidos"],
  },
  {
    title: "Central de Negócios (Imóveis, Carros e Motos)",
    subtitle: "Imóveis para aluguel e venda, carros, motos e caminhões",
    to: "/marketplace/business",
    icon: Building2,
    badge: "Negócios",
    badgeBg: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    keywords: ["negócios", "negocios", "imóveis", "imoveis", "aluguel", "alugar", "casa", "apartamento", "kitnet", "comprar casa", "terreno", "imobiliária", "imobiliaria", "corretor", "carros", "veículos", "veiculos", "motos", "caminhões", "venda de carros", "venda de motos"],
  },
  {
    title: "Veículos à Venda",
    subtitle: "Carros, motos e utilitários anunciados na cidade",
    to: "/marketplace/business/vehicles",
    icon: Car,
    badge: "Veículos",
    badgeBg: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
    keywords: ["veículos", "veiculos", "carros", "motos", "comprar carro", "comprar moto", "seminovos", "automotivo", "utilitários", "venda de carro"],
  },
  {
    title: "Meus Pedidos",
    subtitle: "Acompanhar status das compras e histórico de pedidos",
    to: "/marketplace/orders",
    icon: ClipboardList,
    badge: "Pedidos",
    badgeBg: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    keywords: ["pedidos", "meu pedido", "meus pedidos", "histórico de pedidos", "compras", "pedidos em andamento"],
  },
  {
    title: "Minhas Corridas",
    subtitle: "Acompanhar motorista em tempo real ou histórico",
    to: "/marketplace/rides",
    icon: Car,
    badge: "Corridas",
    badgeBg: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    keywords: ["minhas corridas", "minha corrida", "corridas ativas", "acompanhar taxi", "motorista a caminho", "historico de taxi"],
  },
  {
    title: "Meu Carrinho",
    subtitle: "Conferir sacola de itens e finalizar pedido",
    to: "/marketplace/cart",
    icon: ShoppingBag,
    badge: "Sacola",
    badgeBg: "bg-green-500/20 text-green-400 border border-green-500/30",
    keywords: ["carrinho", "meu carrinho", "sacola", "itens", "checkout", "finalizar"],
  },
  {
    title: "Meu Perfil & Endereços",
    subtitle: "Minha conta, dados de entrega e configurações",
    to: "/marketplace/profile",
    icon: User,
    badge: "Conta",
    badgeBg: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
    keywords: ["perfil", "meu perfil", "minha conta", "endereço", "enderecos", "dados", "configurações"],
  },
];

// ─── Smart Search Bar ─────────────────────────────────────────────────────────
function SmartSearchBar({
  searchTerm,
  setSearchTerm,
  stores = [],
  products = [],
}: {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  stores?: Company[];
  products?: any[];
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const q = searchTerm.trim();

  // 1. Filtragem das Funções do App
  const matchingFeatures = useMemo(() => {
    if (!q) return [];
    return APP_FEATURES.filter(
      (f) =>
        checkSearchMatch(f.title, q) ||
        checkSearchMatch(f.subtitle, q) ||
        f.keywords.some((k) => checkSearchMatch(k, q))
    );
  }, [q]);

  // 2. Filtragem de Pratos e Produtos
  const matchingProducts = useMemo(() => {
    if (!q) return [];
    return products
      .filter((p) => checkSearchMatch(p.name, q) || checkSearchMatch(p.description, q) || checkSearchMatch(p.category, q))
      .slice(0, 5);
  }, [q, products]);

  // 3. Filtragem de Lojas Cadastradas
  const matchingStores = useMemo(() => {
    if (!q) return [];
    return stores
      .filter(
        (s) =>
          checkSearchMatch(s.name, q) ||
          checkSearchMatch(s.category, q) ||
          checkSearchMatch(s.description, q) ||
          checkSearchMatch(s.address, q)
      )
      .slice(0, 4);
  }, [q, stores]);

  // 4. Filtragem de Categorias
  const matchingCategories = useMemo(() => {
    if (!q) return [];
    return CATEGORIES.filter((c) => checkSearchMatch(c.label, q));
  }, [q]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      pushRecent(term.trim());
      setRecents(loadRecents());
    }
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleSelectFeature = (feat: AppFeature) => {
    if (feat.title) {
      pushRecent(feat.title);
      setRecents(loadRecents());
    }
    setFocused(false);
    inputRef.current?.blur();
    navigate({ to: feat.to as any });
  };

  const handleSelectStore = (store: Company) => {
    if (store.name) {
      pushRecent(store.name);
      setRecents(loadRecents());
    }
    setFocused(false);
    inputRef.current?.blur();
    navigate({ to: `/marketplace/store/${store.id}` as any });
  };

  const handleSelectProduct = (p: any) => {
    if (p.name) {
      pushRecent(p.name);
      setRecents(loadRecents());
    }
    setFocused(false);
    inputRef.current?.blur();
    navigate({ to: `/marketplace/store/${p.company_id}` as any });
  };

  const handleEnterKey = () => {
    if (!q) return;

    // Se bater exatamente ou prioritariamente com uma função do app, redireciona direto
    if (matchingFeatures.length > 0) {
      handleSelectFeature(matchingFeatures[0]);
      return;
    }

    // Se bater diretamente com uma loja exclusiva, vai para ela
    if (matchingStores.length === 1 && normalizeSearchText(matchingStores[0].name) === normalizeSearchText(q)) {
      handleSelectStore(matchingStores[0]);
      return;
    }

    // Caso contrário, filtra a lista da home
    handleSearch(searchTerm);
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
            placeholder="Buscar lojas, pratos, táxi, entregas, serviços…"
            className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/50 min-w-0"
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEnterKey();
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
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 text-white border border-border/80 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* ── SEÇÃO 1: RESULTADOS DE FUNÇÕES & SERVIÇOS DO APP ── */}
              {matchingFeatures.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 pt-3 pb-1.5 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Serviços & Funções do App</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-semibold">Direcionamento rápido</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {matchingFeatures.map((feat) => {
                      const IconComp = feat.icon;
                      return (
                        <motion.button
                          key={feat.to}
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl hover:bg-card/90 transition-all text-left group"
                          onClick={() => handleSelectFeature(feat)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shrink-0 text-primary group-hover:border-primary/40 group-hover:scale-105 transition-all">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                {feat.title}
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${feat.badgeBg}`}>
                                  {feat.badge}
                                </span>
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">{feat.subtitle}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="h-px bg-white/10 mx-4 my-1" />
                </div>
              )}

              {/* ── SEÇÃO 2: LOJAS & ESTABELECIMENTOS ── */}
              {matchingStores.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Lojas & Restaurantes</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {matchingStores.map((s) => (
                      <motion.button
                        key={s.id}
                        type="button"
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl hover:bg-card/90 transition-all text-left group"
                        onClick={() => handleSelectStore(s)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-4 h-4 text-white/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                              {s.name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{s.category || "Geral"}</span>
                              {s.rating && (
                                <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                  <Star className="w-3 h-3 fill-amber-400" /> {s.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver Loja →
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  <div className="h-px bg-white/10 mx-4 my-1" />
                </div>
              )}

              {/* ── SEÇÃO 3: PRATOS & PRODUTOS ENCONTRADOS ── */}
              {matchingProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-2.5 pb-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Pratos & Produtos</span>
                  </div>
                  <div className="p-1 space-y-0.5">
                    {matchingProducts.map((p) => {
                      const img = parseProductImage(p.image_url);
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl hover:bg-card/90 transition-all text-left group"
                          onClick={() => handleSelectProduct(p)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                              {img ? (
                                <img src={img} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <UtensilsCrossed className="w-4 h-4 text-white/40" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {p.name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {p.category && <span>{p.category}</span>}
                                {p.price && (
                                  <span className="text-emerald-400 font-bold">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Pedir →
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="h-px bg-white/10 mx-4 my-1" />
                </div>
              )}

              {/* ── SEÇÃO 3: BUSCAS RECENTES (Se houver) ── */}
              {!q && recents.length > 0 && (
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
                      transition={{ delay: i * 0.03 }}
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

              {/* ── SEÇÃO 4: ATALHOS RÁPIDOS QUANDO VAZIO ── */}
              {!q && (
                <div className="p-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 px-1 mb-2 block">
                    Serviços Populares
                  </span>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => handleSelectFeature(APP_FEATURES[0])}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/60 hover:bg-card border border-white/5 hover:border-primary/40 transition-all text-left"
                    >
                      <Car className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Táxi & Moto</p>
                        <p className="text-[10px] text-muted-foreground">Corridas</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectFeature(APP_FEATURES[1])}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/60 hover:bg-card border border-white/5 hover:border-primary/40 transition-all text-left"
                    >
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Solicitar Entrega</p>
                        <p className="text-[10px] text-muted-foreground">Motoboy</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectFeature(APP_FEATURES[2])}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/60 hover:bg-card border border-white/5 hover:border-primary/40 transition-all text-left"
                    >
                      <BookUser className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">PPP Serviços</p>
                        <p className="text-[10px] text-muted-foreground">Profissionais</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectFeature(APP_FEATURES[4])}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card/60 hover:bg-card border border-white/5 hover:border-primary/40 transition-all text-left"
                    >
                      <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Imóveis & Venda</p>
                        <p className="text-[10px] text-muted-foreground">Negócios</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* ── SEÇÃO 5: CATEGORIAS & PRATOS POPULARES ── */}
              <div className="flex items-center gap-2 px-4 pt-2 pb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                  {q ? "Buscar por Prato / Categoria" : "Pratos Populares"}
                </span>
              </div>
              {(q ? matchingCategories.map((c) => c.label) : ["X tudo", "Pizza", "Hambúrguer", "Açaí", "Lanches", "Sorveteria- açaí", "Padaria- cafés", "Farmácia", "Bebidas"]).map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.03 }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-card/70 transition-colors text-left group"
                  onClick={() => handleSearch(s)}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-3.5 h-3.5 text-white/40 shrink-0 group-hover:text-primary transition-colors" />
                    <span className="group-hover:text-primary transition-colors">{s}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Filtrar</span>
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
          <motion.button
            key={opt.key}
            type="button"
            whileTap={{ scale: 0.94 }}
            aria-pressed={active}
            onClick={() => setSort(opt.key)}
            className={`tap-target aero-focus shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold border whitespace-nowrap transition-all duration-300 ${
              active
                ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)] ring-1 ring-emerald-400/50"
                : "bg-card/90 border-border text-foreground hover:bg-muted hover:border-emerald-500/40 hover:text-emerald-500"
            }`}
          >
            {active && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {opt.label}
          </motion.button>
        );
      })}
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        aria-pressed={openOnly}
        onClick={() => setOpenOnly(!openOnly)}
        className={`tap-target aero-focus shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold border whitespace-nowrap transition-all duration-300 ${
          openOnly
            ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)] ring-1 ring-emerald-400/50"
            : "bg-card/90 border-border text-foreground hover:bg-muted hover:border-emerald-500/40 hover:text-emerald-500"
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
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
                className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07] ${!s.is_open ? "grayscale" : ""}`}
              />
            ) : (
              <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #FFDE21 0%, #3B82F6 100%)" }} />
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
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFDE21]/90 text-yellow-950 px-2.5 py-1 rounded-full backdrop-blur-sm shadow-lg">
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
                  {s.logo_url ? (
                    <img 
                      src={s.logo_url} 
                      alt="" 
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover" 
                    />
                  ) : s.name.charAt(0)}
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
              <Star className="w-4 h-4 fill-[#FFDE21] text-[#FFDE21]" />
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
    staleTime: 1000 * 60 * 5,
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
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, name, description, price, image_url, category, company_id")
          .eq("is_active", true)
          .limit(2000);
        return data || [];
      } catch {
        return [];
      }
    },
  });

  const allStores = stores ?? [];
  const top = useMemo(() => [...allStores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8), [allStores]);
  const storesMap = useMemo(() => new Map(allStores.map(s => [s.id, s])), [allStores]);

  const matchedProducts = useMemo(() => {
    const q = searchTerm.trim();
    if (!q) return [];
    return allProducts.filter(
      (p) =>
        checkSearchMatch(p.name, q) ||
        checkSearchMatch(p.description, q) ||
        checkSearchMatch(p.category, q)
    );
  }, [allProducts, searchTerm]);

  const filtered = useMemo(() => {
    let list = [...allStores];
    const q = searchTerm.trim();

    if (q) {
      const matchingCompanyIds = new Set(matchedProducts.map((p) => p.company_id));

      list = list.filter((s) => {
        const nameMatch = checkSearchMatch(s.name, q);
        const catMatch = checkSearchMatch(s.category, q);
        const descMatch = checkSearchMatch(s.description, q);
        const addressMatch = checkSearchMatch(s.address, q);
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
  }, [allStores, matchedProducts, searchTerm, sort, openOnly]);

  const visibleStores = filtered;

  return (
    <div className="space-y-8">

      {/* ── Hero ── */}
      <section
        className="group rounded-[22px] p-4 sm:p-6 text-white relative z-20"
        style={{
          boxShadow:
            "0 40px 80px -32px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,222,33,0.10), inset 0 1px 0 rgba(255,255,255,0.08)",
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
                "radial-gradient(circle, rgba(255,232,90,0.95) 0%, rgba(255,222,33,0.55) 25%, rgba(255,200,20,0.15) 55%, rgba(0,0,0,0) 75%)",
              filter: "blur(28px)",
            }}
          />
          {/* Núcleo do sol — brilho concentrado */}
          <div
            aria-hidden
            className="absolute -top-14 -right-4 w-32 h-32 rounded-full pointer-events-none opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(circle, rgba(255,240,170,1) 0%, rgba(255,222,33,0.7) 40%, rgba(255,222,33,0) 70%)",
              filter: "blur(6px)",
            }}
          />
          {/* Fibra de carbono */}
          <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.5] mix-blend-overlay pointer-events-none" />
          {/* Verniz — reflexo de lataria */}
          <div aria-hidden className="absolute inset-0 clearcoat pointer-events-none mix-blend-screen opacity-70" />

          {/* Bandeira quadriculada de corrida na base do hero (igual ao padrão dos cards com 10px) */}
          <span
            aria-hidden
            className="checker-run checker-fade-r absolute left-0 right-0 bottom-0 h-[10px] text-white/40 pointer-events-none"
          />
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
            <span className="text-[#f9a03f]">.</span>
          </h1>

          <p className="text-[13px] sm:text-[14px] text-white/75 font-medium max-w-md leading-snug">
            O que você quer pedir hoje na sua cidade?
          </p>

          <SmartSearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} stores={allStores} products={allProducts} />
        </motion.div>
      </section>

      {/* ── SEÇÃO DE BUSCA ATIVA (Quando o usuário digita algo na busca) ── */}
      {searchTerm.trim() ? (
        <section className="space-y-6 animate-in fade-in duration-200">
          {/* Header dos Resultados */}
          <div className="flex items-center justify-between bg-primary/10 border border-primary/30 px-4 py-3 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-bold text-foreground">
                Resultados para "<span className="text-primary">{searchTerm}</span>"
                <span className="text-xs font-medium text-muted-foreground ml-2">
                  ({matchedProducts.length} {matchedProducts.length === 1 ? "item" : "itens"}, {filtered.length} {filtered.length === 1 ? "loja" : "lojas"})
                </span>
              </p>
            </div>
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" /> Limpar busca
            </button>
          </div>

          {/* Filtros de Ordenação */}
          <FilterBar sort={sort} setSort={handleSetSort} openOnly={openOnly} setOpenOnly={handleSetOpen} />

          {/* 1. Pratos & Produtos Encontrados */}
          {matchedProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <h2 className="font-display font-black text-lg text-foreground tracking-tight">
                  Pratos &amp; Produtos Encontrados ({matchedProducts.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matchedProducts.map((p) => {
                  const store = storesMap.get(p.company_id);
                  const img = parseProductImage(p.image_url);
                  return (
                    <Link
                      key={p.id}
                      to="/marketplace/store/$storeId"
                      params={{ storeId: p.company_id }}
                      className="p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/60 transition-all flex items-center gap-3.5 group active:scale-[0.98] shadow-sm hover:shadow-md"
                    >
                      <div className="w-18 h-18 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border/40 flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <UtensilsCrossed className="w-7 h-7 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </p>
                        {p.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {p.description}
                          </p>
                        )}
                        {store && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-1">
                            <Store className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate font-medium">{store.name}</span>
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/30">
                          <span className="text-xs font-black text-emerald-500">
                            {p.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.price) : "Sob consulta"}
                          </span>
                          <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Pedir <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Lojas Encontradas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              <h2 className="font-display font-black text-lg text-foreground tracking-tight">
                Lojas Correspondentes ({filtered.length})
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <ul className="space-y-5">
                  {visibleStores.map((s, i) => <StoreCard key={s.id} s={s} i={i} />)}
                </ul>
              </AnimatePresence>
            ) : matchedProducts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center bg-card/50 rounded-3xl border border-border/40 p-6">
                <p className="text-4xl mb-2">🔍</p>
                <p className="font-display font-bold text-base text-foreground">Nenhum resultado para "{searchTerm}"</p>
                <p className="text-xs text-muted-foreground mt-1">Tente pesquisar por outro prato, categoria ou nome de loja.</p>
                <AeroButton
                  onClick={() => setSearchTerm("")}
                  className="mt-4 text-xs"
                >
                  Ver todas as lojas e categorias
                </AeroButton>
              </motion.div>
            ) : null}
          </div>
        </section>
      ) : (
        /* ── MODO HOME PADRÃO (Sem busca ativa) ── */
        <>
          {/* ── Categories ── */}
          <AeroSection title="Categorias" subtitle="Escolha por onde começar">
            <div className="flex gap-3 overflow-x-auto scrollbar-none px-1 pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-8 sm:gap-3 sm:overflow-visible sm:px-0">
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
                    className="flex flex-col items-center gap-2 group aero-focus rounded-2xl shrink-0 snap-start w-[76px] sm:w-auto cursor-pointer"
                  >
                    <div
                      className={`aero-plate w-[68px] sm:w-full aspect-square max-w-[72px] min-h-[56px] grid place-items-center relative overflow-hidden -skew-x-[6deg] transition-all duration-300 group-hover:-skew-x-[3deg] border ${isActive ? "bg-btn-active border-btn-active shadow-[0_10px_28px_-12px_rgba(255,222,33,0.8)]" : "bg-btn-surface border-btn-line group-hover:border-primary/45 group-active:bg-btn-active group-active:border-btn-active"}`}
                      style={{
                        boxShadow: "0 14px 26px -14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45)",
                      }}
                    >
                      {/* Halo amarelo difuso atrás da placa */}
                      <span aria-hidden className="absolute -inset-3 rounded-full bg-primary-glow/40 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
                      <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.06] rounded-2xl" />
                      <div aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-2xl" />
                      <span
                        aria-hidden
                        className={`checker-flag absolute inset-x-0 bottom-0 h-[6px] pointer-events-none transition-colors ${isActive ? "text-btn-active-ink/70" : "text-black/30"}`}
                        style={{ backgroundSize: "6px 6px" }}
                      />

                      <span aria-hidden className="spec-sheen" />
                      <Icon className={`w-6 h-6 skew-x-[6deg] relative z-10 transition-colors ${isActive ? "text-btn-active-ink" : "text-btn-ink group-active:text-btn-active-ink"}`} strokeWidth={1.75} />
                    </div>
                    <span className={`text-[11px] sm:text-[12px] font-bold text-center leading-tight line-clamp-2 max-w-[76px] sm:max-w-none transition-colors ${isActive ? "text-primary" : "text-foreground/90 group-hover:text-primary"}`}>{c.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </AeroSection>

          {/* ── Quick banners ── */}
          <section className="grid grid-cols-2 gap-3">
            <AeroPanel to="/marketplace/errands" icon={Zap} title={<>Solicitar<br/>Entrega</>} subtitle="Motoboy rápido" />
            <AeroPanel to="/marketplace/directory" icon={Tag} title="PPP" subtitle="Prestadores" />
          </section>

          {/* ── Taxi ── */}
          <section>
            <Link
              to="/marketplace/taxi"
              className="block p-6 rounded-3xl relative overflow-hidden group clearcoat aero-focus border border-btn-line hover:border-primary/45 active:border-btn-active transition-colors bg-btn-surface hover:bg-btn-surface-hover active:bg-btn-active active:shadow-[0_10px_28px_-12px_rgba(255,222,33,0.8)]"
              style={{
                boxShadow: "0 24px 40px -24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.45)",
              }}
            >
              {/* Nuvem dourada difusa atrás do botão */}
              <span aria-hidden className="absolute -inset-3 rounded-[2rem] bg-primary-glow/40 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
              <div aria-hidden className="absolute inset-0 carbon-weave opacity-[0.06] rounded-3xl" />
              <span aria-hidden className="spec-sheen" />
              
              {/* Faixa de bandeira quadriculada correndo no topo e na base */}
              <span aria-hidden className="checker-run checker-fade-r absolute top-0 left-0 right-0 h-[10px] text-black/30 group-active:text-btn-active-ink/60 pointer-events-none" />
              <span aria-hidden className="checker-run checker-fade-l absolute bottom-0 left-0 right-0 h-[10px] text-black/25 group-active:text-btn-active-ink/50 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-black/[0.04] ring-1 ring-black/10 shadow-sm grid place-items-center group-active:bg-black/15 group-active:ring-black/25 transition-colors">
                    <Car className="w-5 h-5 text-btn-ink group-active:text-btn-active-ink transition-colors" />
                  </div>
                  <h2 className="font-display font-bold italic text-2xl leading-tight text-btn-ink group-active:text-btn-active-ink transition-colors">Táxi &amp; Moto Táxi</h2>
                </div>
                <p className="text-sm text-btn-ink-soft max-w-[70%] font-medium mt-2 group-active:text-btn-active-ink/80 transition-colors">Corridas rápidas e seguras na sua porta agora.</p>
              </div>
            </Link>
          </section>

          {/* ── Espaço Social & Central de Negócios ── */}
          <section className="grid grid-cols-2 gap-3">
            <AeroPanel to="/marketplace/social" icon={Users} title={<>Espaço<br/>Social</>} subtitle="Classificados da cidade" />
            <AeroPanel to="/marketplace/business" icon={Building2} title={<>Central de<br/>Negócios</>} subtitle="Imóveis, Carros e Motos" />
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
                : top.map((s, i) => (
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
                  ))
              }
            </div>
          </AeroSection>

          {/* ── Lojas próximas com filtros ── */}
          <AeroSection
            title="Lojas próximas"
            subtitle="Selecionadas para você"
          >
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
        </>
      )}

      {/* ── BONASOFT Watermark ── */}
      <div className="pt-8 pb-4 flex justify-center opacity-40 select-none pointer-events-none">
        <span className="text-[10px] font-black tracking-[0.5em] text-muted-foreground uppercase">
          B O N A S O F T
        </span>
      </div>
    </div>
  );
}
