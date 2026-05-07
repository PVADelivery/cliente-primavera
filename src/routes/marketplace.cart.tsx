import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export const Route = createFileRoute("/marketplace/cart")({
  head: () => ({ meta: [{ title: "Carrinho — Primavera Delivery" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, companyName, total, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <h1 className="font-display text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="text-muted-foreground text-sm">Explore as lojas e adicione itens.</p>
        <Link to="/marketplace" className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium">
          Ver lojas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold">Carrinho</h1>
        <p className="text-sm text-muted-foreground">{companyName}</p>
      </header>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.productId} className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{i.name}</p>
              <p className="text-xs text-muted-foreground">R$ {i.price.toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary rounded-xl">
              <button onClick={() => (i.quantity > 1 ? setQty(i.productId, i.quantity - 1) : remove(i.productId))} className="w-8 h-8 grid place-items-center" aria-label="Diminuir">
                {i.quantity > 1 ? <Minus className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
              </button>
              <span className="text-sm w-5 text-center">{i.quantity}</span>
              <button onClick={() => setQty(i.productId, i.quantity + 1)} className="w-8 h-8 grid place-items-center" aria-label="Aumentar">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {total.toFixed(2).replace(".", ",")}</span></div>
        <div className="flex items-center justify-between text-base font-bold"><span>Total</span><span>R$ {total.toFixed(2).replace(".", ",")}</span></div>
      </div>
      <Link to="/marketplace/checkout" className="block w-full text-center py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold" style={{ boxShadow: "var(--shadow-elegant)" }}>
        Ir para o checkout
      </Link>
    </div>
  );
}
