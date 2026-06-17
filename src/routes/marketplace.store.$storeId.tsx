import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import type { Company, Product } from "@/types/database";
import coverItalian from "@/assets/cover-italian.jpg";
import dishLasagna from "@/assets/dish-lasagna.jpg";
import dishGnocchi from "@/assets/dish-gnocchi.jpg";
import dishTiramisu from "@/assets/dish-tiramisu.jpg";

export const Route = createFileRoute("/marketplace/store/$storeId")({
  component: StoreDetail,
});

const MOCK_PRODUCTS: (Product & { promo?: number })[] = [
  { id: "p1", company_id: "m1", name: "Lasanha à Bolonhesa", price: 42.9, description: "Massa fresca, molho da casa, queijo gratinado por 40min no forno a lenha.", category: "Pratos", image_url: dishLasagna, image_urls: null, active: true, promo: 20 },
  { id: "p2", company_id: "m1", name: "Nhoque ao Sugo", price: 36.0, description: "Receita tradicional da nona, molho de tomate San Marzano e manjericão fresco.", category: "Pratos", image_url: dishGnocchi, image_urls: null, active: true },
  { id: "p3", company_id: "m1", name: "Tiramisu", price: 18.0, description: "Sobremesa italiana clássica com mascarpone, café espresso e cacau em pó.", category: "Sobremesas", image_url: dishTiramisu, image_urls: null, active: true },
];

function StoreDetail() {
  const { storeId } = useParams({ from: "/marketplace/store/$storeId" });
  const { add } = useCart();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const { data: store } = useQuery<Company | null>({
    queryKey: ["company", storeId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      const { data } = await supabase.from("companies").select("*").eq("id", storeId).maybeSingle();
      return ((data as Company | null) ?? null);
    },
  });

  const { data: products = MOCK_PRODUCTS } = useQuery<(Product & { promo?: number })[]>({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_PRODUCTS;
      const { data } = await supabase.from("products").select("*").eq("company_id", storeId).eq("active", true);
      return ((data as Product[]) as (Product & { promo?: number })[]) ?? MOCK_PRODUCTS;
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
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveCat(cat);
  };

  const rating = store?.rating?.toFixed(1) ?? "4.8";
  const deliveryFee = store?.delivery_fee ?? 6.9;

  return (
    <div className="-mt-4 -mx-4 pb-8">
      {/* Hero / Cover */}
      <div className="relative h-56 sm:h-72 overflow-hidden">
        <motion.img
          src={coverItalian}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />

        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <Link
            to="/marketplace"
            className="w-10 h-10 grid place-items-center rounded-full bg-background/85 backdrop-blur-md border border-border/50 shadow-sm hover:scale-105 transition-transform"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 grid place-items-center rounded-full bg-background/85 backdrop-blur-md border border-border/50 shadow-sm hover:scale-105 transition-transform" aria-label="Compartilhar">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 grid place-items-center rounded-full bg-background/85 backdrop-blur-md border border-border/50 shadow-sm hover:scale-105 transition-transform" aria-label="Favoritar">
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating logo */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="absolute -bottom-8 left-4 w-20 h-20 rounded-2xl bg-card border border-border grid place-items-center overflow-hidden"
          style={{ boxShadow: "var(--shadow-premium)" }}
        >
          <div
            className="w-full h-full grid place-items-center text-2xl font-display font-black text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {name.charAt(0)}
          </div>
        </motion.div>
      </div>

      {/* Header info */}
      <div className="px-4 pt-12 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight truncate">{name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {store?.description ?? "Massas artesanais"} · {store?.category ?? "Italiana"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/15 text-accent-foreground text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
            {rating}
            <span className="text-muted-foreground font-normal">(320+)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aberto agora
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            1.2 km
          </span>
        </div>

        {/* Delivery info card */}
        <div
          className="grid grid-cols-3 rounded-2xl border border-border bg-card overflow-hidden"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <InfoCell icon={<Bike className="w-4 h-4" />} label="Entrega" value={deliveryFee === 0 ? "Grátis" : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`} />
          <InfoCell icon={<Clock className="w-4 h-4" />} label="Tempo" value="25-35 min" divider />
          <InfoCell icon={<ShoppingBag className="w-4 h-4" />} label="Mínimo" value="R$ 20,00" divider />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no cardápio..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/60 border border-transparent focus:border-primary focus:bg-background outline-none text-sm transition-colors"
          />
        </div>
      </div>

      {/* Sticky category nav */}
      {categories.length > 0 && (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCat(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCat === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {cat}
                <span className="ml-1.5 opacity-70">{grouped[cat].length}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product sections */}
      <div className="px-4 pt-4 space-y-7">
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhum item encontrado.
          </p>
        )}
        {categories.map((cat) => (
          <section
            key={cat}
            data-category={cat}
            ref={(el) => {
              sectionRefs.current[cat] = el;
            }}
            className="scroll-mt-24"
          >
            <div className="flex items-end justify-between mb-3">
              <h2 className="font-display text-lg font-bold tracking-tight">{cat}</h2>
              <span className="text-xs text-muted-foreground">{grouped[cat].length} itens</span>
            </div>
            <ul className="space-y-3">
              {grouped[cat].map((p, i) => {
                const hasPromo = p.promo && p.promo > 0;
                const finalPrice = hasPromo ? p.price * (1 - (p.promo as number) / 100) : p.price;
                return (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="group flex items-stretch gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/30 hover:-translate-y-0.5 transition-all"
                    style={{ boxShadow: "var(--shadow-elegant)" }}
                  >
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="text-[15px] font-bold leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 flex-1">{p.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-base font-black text-primary">
                          R$ {finalPrice.toFixed(2).replace(".", ",")}
                        </span>
                        {hasPromo && (
                          <span className="text-xs text-muted-foreground line-through">
                            R$ {p.price.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted grid place-items-center">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            loading="lazy"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <UtensilsCrossed className="w-7 h-7 text-muted-foreground/40" />
                        )}
                      </div>
                      {hasPromo && (
                        <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-black">
                          <BadgePercent className="w-2.5 h-2.5" />-{p.promo}%
                        </span>
                      )}
                      <button
                        onClick={() =>
                          add(storeId, name, {
                            productId: p.id,
                            name: p.name,
                            price: finalPrice,
                            quantity: 1,
                            imageUrl: p.image_url,
                          })
                        }
                        className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-primary text-primary-foreground grid place-items-center hover:scale-110 active:scale-95 transition-transform border-2 border-background"
                        style={{ boxShadow: "var(--shadow-elegant)" }}
                        aria-label={`Adicionar ${p.name} ao carrinho`}
                      >
                        <Plus className="w-4 h-4" strokeWidth={3} />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  divider,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div className={`px-3 py-2.5 flex flex-col items-center justify-center text-center ${divider ? "border-l border-border" : ""}`}>
      <div className="text-primary mb-0.5">{icon}</div>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
      <span className="text-xs font-bold mt-0.5">{value}</span>
    </div>
  );
}
