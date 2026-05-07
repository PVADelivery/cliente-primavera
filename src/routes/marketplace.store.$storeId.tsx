import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Plus } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import type { Company, Product } from "@/types/database";

export const Route = createFileRoute("/marketplace/store/$storeId")({
  component: StoreDetail,
});

const MOCK_PRODUCTS: Product[] = [
  { id: "p1", company_id: "m1", name: "Lasanha à Bolonhesa", price: 42.9, description: "Massa fresca, molho da casa, queijo gratinado.", category: "Pratos", image_url: null, image_urls: null, active: true },
  { id: "p2", company_id: "m1", name: "Nhoque ao Sugo", price: 36.0, description: "Receita tradicional da nona.", category: "Pratos", image_url: null, image_urls: null, active: true },
  { id: "p3", company_id: "m1", name: "Tiramisu", price: 18.0, description: "Sobremesa italiana clássica.", category: "Sobremesas", image_url: null, image_urls: null, active: true },
];

function StoreDetail() {
  const { storeId } = useParams({ from: "/marketplace/store/$storeId" });
  const { add } = useCart();

  const { data: store } = useQuery<Company | null>({
    queryKey: ["company", storeId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      const { data } = await supabase.from("companies").select("*").eq("id", storeId).maybeSingle();
      return ((data as Company | null) ?? null);
    },
  });

  const { data: products = MOCK_PRODUCTS } = useQuery<Product[]>({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return MOCK_PRODUCTS;
      const { data } = await supabase.from("products").select("*").eq("company_id", storeId).eq("active", true);
      return (data as Product[]) ?? MOCK_PRODUCTS;
    },
  });

  const name = store?.name ?? "Cantina da Nona";
  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    const k = p.category ?? "Outros";
    (acc[k] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6 -mt-4">
      <div className="aspect-[16/9] -mx-4 bg-secondary relative overflow-hidden">
        <Link to="/marketplace" className="absolute top-3 left-3 z-10 w-9 h-9 grid place-items-center rounded-full bg-background/90 backdrop-blur">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="absolute inset-0" style={{ background: "var(--gradient-primary)", opacity: 0.6 }} />
      </div>
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">{name}</h1>
        <p className="text-sm text-muted-foreground">{store?.description ?? "Massas artesanais"} · {store?.category ?? "Italiana"}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-accent text-accent" />{store?.rating?.toFixed(1) ?? "4.8"}</span>
          <span>Entrega R$ {(store?.delivery_fee ?? 6.9).toFixed(2).replace(".", ",")}</span>
        </div>
      </header>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="font-display text-base font-bold mb-2">{cat}</h2>
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3 bg-card rounded-2xl border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  <p className="mt-1 text-sm font-bold text-primary">R$ {p.price.toFixed(2).replace(".", ",")}</p>
                </div>
                <button
                  onClick={() =>
                    add(storeId, name, {
                      productId: p.id,
                      name: p.name,
                      price: p.price,
                      quantity: 1,
                      imageUrl: p.image_url,
                    })
                  }
                  className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 transition-opacity"
                  aria-label={`Adicionar ${p.name} ao carrinho`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
