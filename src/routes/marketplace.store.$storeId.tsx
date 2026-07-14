import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Plus,
  Heart,
  Share2,
  Bike,
  Clock,
  ShoppingBag,
  Search,
  UtensilsCrossed,
  BadgePercent,
  Minus,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import type { Company, Product } from "@/types/database";
import coverItalian from "@/assets/cover-italian.jpg";
import dishLasagna from "@/assets/dish-lasagna.jpg";
import dishGnocchi from "@/assets/dish-gnocchi.jpg";
import dishTiramisu from "@/assets/dish-tiramisu.jpg";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/marketplace/store/$storeId")({
  component: StoreDetail,
});

const MOCK_PRODUCTS: (Product & { promo?: number })[] = [
  { id: "p1", company_id: "m1", name: "Lasanha à Bolonhesa", price: 42.9, description: "Massa fresca, molho da casa, queijo gratinado por 40min no forno a lenha.", category: "Pratos Principais", image_url: dishLasagna, image_urls: null, is_active: true, promo: 20 },
  { id: "p2", company_id: "m1", name: "Nhoque ao Sugo", price: 36.0, description: "Receita tradicional da nona, molho de tomate San Marzano e manjericão fresco.", category: "Pratos Principais", image_url: dishGnocchi, image_urls: null, is_active: true },
  { id: "p3", company_id: "m1", name: "Tiramisu", price: 18.0, description: "Sobremesa italiana clássica com mascarpone, café espresso e cacau em pó.", category: "Sobremesas", image_url: dishTiramisu, image_urls: null, is_active: true },
  { id: "p4", company_id: "m1", name: "Refrigerante Cola", price: 6.0, description: "Lata 350ml bem gelada.", category: "Bebidas", image_url: null, image_urls: null, is_active: true },
];

function parseImages(imageUrl: string | null): string[] {
  if (!imageUrl) return [];
  try {
    const parsed = JSON.parse(imageUrl);
    if (Array.isArray(parsed)) return parsed.filter((u: any) => typeof u === "string" && u.startsWith("http"));
  } catch {
    if (imageUrl.startsWith("http") || imageUrl.startsWith("/")) return [imageUrl];
  }
  return [];
}

function StoreDetail() {
  const { storeId } = useParams({ from: "/marketplace/store/$storeId" });
  const navigate = useNavigate();
  const { add, items, total, remove, setQty, count } = useCart();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("");
  const [cartOpen, setCartOpen] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const coverImgRef = useRef<HTMLImageElement | null>(null);

  // Parallax + fade leve no cover conforme rola
  const { scrollY } = useScroll();
  const coverY = useTransform(scrollY, [0, 320], [0, 60]);
  const coverScale = useTransform(scrollY, [0, 320], [1, 1.08]);
  const coverOpacity = useTransform(scrollY, [0, 280], [1, 0.6]);

  // Imagens já em cache não disparam onLoad — checa .complete manualmente
  useEffect(() => {
    const img = coverImgRef.current;
    if (img?.complete && img.naturalWidth > 0) setCoverLoaded(true);
    // Defensivo: garante que o cover apareça mesmo se onLoad não disparar
    const t = setTimeout(() => setCoverLoaded(true), 600);
    return () => clearTimeout(t);
  }, []);

  const { data: store } = useQuery<Company | null>({
    queryKey: ["company", storeId],
    placeholderData: null,
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      try {
        const result = await Promise.race([
          supabase.from("companies").select("*").eq("id", storeId).maybeSingle(),
          new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 4000)),
        ]);
        return ((result as { data: Company | null }).data) ?? null;
      } catch {
        return null;
      }
    },
  });

  // Reviews reais — toda loja começa em 5,0 e só baixa com avaliações reais
  const { data: reviewStats = { avg: 5, count: 0 } } = useQuery<{ avg: number; count: number }>({
    queryKey: ["review-stats", storeId],
    placeholderData: { avg: 5, count: 0 },
    queryFn: async () => {
      if (!isSupabaseConfigured) return { avg: 5, count: 0 };
      try {
        const result = await Promise.race([
          supabase.from("reviews").select("rating").eq("company_id", storeId),
          new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 4000)),
        ]);
        const rows = (result as { data: { rating: number }[] | null }).data;
        if (!rows || rows.length === 0) return { avg: 5, count: 0 };
        const sum = rows.reduce((acc, r) => acc + Math.max(1, Math.min(5, Number(r.rating) || 5)), 0);
        return { avg: sum / rows.length, count: rows.length };
      } catch {
        return { avg: 5, count: 0 };
      }
    },
  });

  const { data: products = MOCK_PRODUCTS } = useQuery<(Product & { promo?: number })[]>({
    queryKey: ["products", storeId],
    placeholderData: MOCK_PRODUCTS,
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_PRODUCTS;
      try {
        const result = await Promise.race([
          supabase.from("products").select("*").eq("company_id", storeId).eq("is_active", true),
          new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 4000)),
        ]);
        const data = (result as { data: Product[] | null }).data;
        if (!data || data.length === 0) return MOCK_PRODUCTS;
        return data as (Product & { promo?: number })[];
      } catch {
        return MOCK_PRODUCTS;
      }
    },
  });

  const name = store?.name ?? "Cantina da Nona";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, (Product & { promo?: number })[]>>((acc, p) => {
      const k = p.category ?? "Outros";
      (acc[k] ??= []).push(p);
      return acc;
    }, {});
  }, [filtered]);

  const categories = Object.keys(grouped);

  useEffect(() => {
    if (!activeCat && categories[0]) setActiveCat(categories[0]);
  }, [categories, activeCat]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target instanceof HTMLElement) {
          const cat = visible.target.dataset.category;
          if (cat) setActiveCat(cat);
        }
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: [0.1, 0.5, 1] },
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [categories.join("|")]);

  const scrollToCat = (cat: string) => {
    const el = sectionRefs.current[cat];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 130;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveCat(cat);
  };

  const rating = reviewStats.avg.toFixed(1);
  const reviewCount = reviewStats.count;
  const deliveryFee = store?.delivery_fee ?? 4.99;

  return (
    <div className="-mt-4 -mx-4 pb-32 bg-muted/20 min-h-screen">
      {/* 1. Hero / Cover (Premium, Parallax, Floating Logo) */}
      <div className="relative h-64 sm:h-80 overflow-hidden bg-neutral-950 isolate">
        {/* Premium gradient fallback: visível enquanto a foto carrega ou se ela falhar */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 30% 20%, oklch(0.42 0.18 30 / 0.9), transparent 60%), radial-gradient(100% 80% at 80% 80%, oklch(0.32 0.12 40 / 0.9), transparent 60%), linear-gradient(135deg, oklch(0.22 0.05 30), oklch(0.14 0.03 30))",
          }}
        />

        {/* Shimmer leve enquanto a imagem não carrega (sem flash branco) */}
        {!coverLoaded && !coverFailed && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)",
              backgroundSize: "200% 100%",
              animation: "cover-shimmer 1.6s ease-in-out infinite",
            }}
          />
        )}

        {!coverFailed && (
          <motion.img
            ref={coverImgRef}
            src={coverItalian}
            alt={name}
            decoding="async"
            fetchPriority="high"
            onLoad={() => setCoverLoaded(true)}
            onError={() => setCoverFailed(true)}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            style={{
              y: coverY,
              scale: coverScale,
              opacity: coverLoaded ? 1 : 0,
              filter: "contrast(1.04) saturate(1.08)",
              backfaceVisibility: "hidden",
              transition: "opacity 500ms ease-out",
            }}
          />
        )}

        {/* Overlays sutis — apenas o suficiente para legibilidade do nome */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />

        {/* Top actions */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
          <Link
            to="/marketplace"
            className="w-10 h-10 grid place-items-center rounded-full bg-black/35 backdrop-blur-md text-white border border-white/15 shadow-lg hover:bg-black/55 hover:scale-105 active:scale-95 transition-all duration-300"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 grid place-items-center rounded-full bg-black/35 backdrop-blur-md text-white border border-white/15 shadow-lg hover:bg-black/55 hover:scale-105 active:scale-95 transition-all duration-300">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 grid place-items-center rounded-full bg-black/35 backdrop-blur-md text-white border border-white/15 shadow-lg hover:bg-black/55 hover:scale-105 active:scale-95 transition-all duration-300 group">
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Logo & Name inside cover */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute bottom-6 left-4 right-4 flex items-end gap-4 z-10"
        >
          <motion.div
            whileHover={{ y: -4, rotate: -2 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-card border-2 border-background grid place-items-center overflow-hidden"
            style={{ boxShadow: "var(--shadow-premium)" }}
          >
            <div
              className="w-full h-full grid place-items-center text-3xl sm:text-4xl font-display font-black text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {name.charAt(0)}
            </div>
          </motion.div>
          <div className="flex-1 min-w-0 pb-1">
            <h1
              className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white truncate"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4)" }}
            >
              {name}
            </h1>
            <p
              className="text-white/95 text-sm font-medium mt-1 truncate"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}
            >
              {store?.description ?? "Massas artesanais"} · {store?.category ?? "Italiana"}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-6">
        {/* Pills Hierarchy */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent-foreground text-sm font-bold border border-accent/20">
            <Star className="w-4 h-4 fill-accent text-accent" />
            {rating}
            <span className="text-muted-foreground font-semibold">
              {reviewCount > 0 ? `(${reviewCount})` : "· Novo"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-sm font-bold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Aberto agora
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-semibold border border-border">
            1.2 km
          </span>
        </div>

        {/* 3. Região do Card de Pedido Restruturada */}
        <div
          className="grid grid-cols-3 rounded-2xl border border-border bg-card overflow-hidden divide-x divide-border/50"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <InfoCell icon={<Bike className="w-5 h-5" />} label="Entrega" value={deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`} />
          <InfoCell icon={<Clock className="w-5 h-5" />} label="Tempo" value="25-35 min" />
          <InfoCell icon={<ShoppingBag className="w-5 h-5" />} label="Pedido Mín." value="R$ 20,00" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no cardápio..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base transition-all"
            style={{ boxShadow: "var(--shadow-sm)" }}
          />
        </div>
      </div>

      {/* Sticky category nav */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border shadow-sm">
          <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCat(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                  activeCat === cat
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product sections */}
      <div className="px-4 pt-6 space-y-10">
        {categories.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhum prato encontrado para "{query}".
            </p>
          </div>
        )}
        {categories.map((cat) => (
          <section
            key={cat}
            data-category={cat}
            ref={(el) => {
              sectionRefs.current[cat] = el;
            }}
            className="scroll-mt-28"
          >
            <h2 className="font-display text-2xl font-black tracking-tight mb-4">{cat}</h2>
            {/* 5. Grid de Produtos e Animações de Entrada */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grouped[cat].map((p, i) => {
                const hasPromo = p.promo && p.promo > 0;
                const finalPrice = hasPromo ? p.price * (1 - (p.promo as number) / 100) : p.price;
                const parsedImages = parseImages(p.image_url);
                const displayImage = parsedImages.length > 0 ? parsedImages[0] : (p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null);
                return (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                    className="group flex flex-col sm:flex-row items-stretch gap-0 sm:gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden"
                    style={{ boxShadow: "var(--shadow-elegant)" }}
                  >
                    <div className="flex-1 min-w-0 flex flex-col p-1 sm:p-2">
                      <p className="text-base font-bold leading-tight">{p.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 mb-3 flex-1">{p.description}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex flex-col">
                          {hasPromo && (
                            <span className="text-xs text-muted-foreground line-through">
                              R$ {p.price.toFixed(2).replace(".", ",")}
                            </span>
                          )}
                          <span className="text-lg font-black text-primary">
                            R$ {finalPrice.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        {/* CTA Destacado "Adicionar" (Desktop) ou ícone Plus (Mobile) */}
                        <div className="hidden sm:block">
                          <Button
                            size="sm"
                            className="h-8 rounded-lg px-3 font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => add(storeId, name, { productId: p.id, name: p.name, price: finalPrice, quantity: 1, imageUrl: displayImage || undefined })}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative shrink-0 sm:self-center mt-3 sm:mt-0">
                      <div className="w-full h-36 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-muted grid place-items-center">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={p.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <UtensilsCrossed className="w-8 h-8 text-muted-foreground/30" />
                        )}
                      </div>
                      {hasPromo && (
                        <span className="absolute top-2 left-2 sm:-top-2 sm:-left-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-red-500 text-white text-[10px] sm:text-xs font-black shadow-sm">
                          <BadgePercent className="w-3 h-3" />-{p.promo}%
                        </span>
                      )}
                      {/* Mobile add button */}
                      <button
                        onClick={() => add(storeId, name, { productId: p.id, name: p.name, price: finalPrice, quantity: 1, imageUrl: displayImage || undefined })}
                        className="sm:hidden absolute -bottom-3 right-2 w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center active:scale-95 transition-transform shadow-md"
                        aria-label={`Adicionar ${p.name}`}
                      >
                        <Plus className="w-5 h-5" strokeWidth={3} />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* 4. Carrinho em Drawer (Slide) */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4 bg-gradient-to-t from-background via-background to-transparent"
          >
            <div className="max-w-xl mx-auto w-full">
              <Drawer open={cartOpen} onOpenChange={setCartOpen}>
                <DrawerTrigger asChild>
                  <button className="w-full h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-between px-5 font-bold shadow-lg hover:bg-primary/90 transition-colors">
                    <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{count}</span>
                    </div>
                    <span>Ver carrinho</span>
                    <span>R$ {total.toFixed(2).replace(".", ",")}</span>
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh] pb-6">
                  <div className="max-w-xl mx-auto w-full">
                    <DrawerHeader className="border-b border-border pb-4">
                      <DrawerTitle className="text-xl font-black text-center">Seu Pedido</DrawerTitle>
                      <p className="text-center text-sm text-muted-foreground">{name}</p>
                    </DrawerHeader>
                    <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                      {items.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">Carrinho vazio.</p>
                      ) : (
                        <ul className="space-y-4">
                          {items.map((it) => (
                            <li key={it.productId} className="flex gap-3">
                              <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                                {it.imageUrl ? (
                                  <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-4 h-4 text-muted-foreground/40"/></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm leading-tight truncate">{it.name}</p>
                                <p className="text-primary font-black text-sm mt-0.5">R$ {(it.price * it.quantity).toFixed(2).replace(".", ",")}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden h-8">
                                    <button onClick={() => { if (it.quantity > 1) setQty(it.productId, it.quantity - 1); else remove(it.productId); }} className="w-8 h-full flex items-center justify-center hover:bg-muted active:bg-muted/80 text-muted-foreground transition-colors"><Minus className="w-3 h-3" /></button>
                                    <span className="w-8 text-center text-sm font-bold">{it.quantity}</span>
                                    <button onClick={() => setQty(it.productId, it.quantity + 1)} className="w-8 h-full flex items-center justify-center hover:bg-muted active:bg-muted/80 text-primary transition-colors"><Plus className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      {items.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-dashed border-border space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-semibold">R$ {total.toFixed(2).replace(".", ",")}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Taxa de entrega</span>
                            <span className="font-semibold">{deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`}</span>
                          </div>
                          <div className="flex justify-between text-lg pt-2 font-black border-t border-border mt-2">
                            <span>Total</span>
                            <span className="text-primary">R$ {(total + deliveryFee).toFixed(2).replace(".", ",")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <DrawerFooter className="px-4 pt-0">
                      <Button
                        className="w-full h-14 rounded-2xl text-base font-bold shadow-lg"
                        disabled={items.length === 0}
                        onClick={() => {
                           setCartOpen(false);
                           navigate({ to: "/marketplace/checkout" });
                        }}
                      >
                        Finalizar Pedido
                      </Button>
                    </DrawerFooter>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="px-3 py-4 flex flex-col items-center justify-center text-center group hover:bg-muted/30 transition-colors">
      <div className="text-primary mb-1.5 p-2 rounded-full bg-primary/10 group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span>
      <span className="text-xs sm:text-sm font-black">{value}</span>
    </div>
  );
}
