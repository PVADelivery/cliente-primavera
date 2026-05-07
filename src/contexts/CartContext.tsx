import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  notes?: string;
}

interface Cart {
  companyId: string | null;
  companyName: string | null;
  items: CartItem[];
}

interface CartContextValue extends Cart {
  add: (companyId: string, companyName: string, item: CartItem) => boolean;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const STORAGE_KEY = "primavera.cart.v1";
const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ companyId: null, companyName: null, items: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const add: CartContextValue["add"] = (companyId, companyName, item) => {
    if (cart.companyId && cart.companyId !== companyId) {
      const ok = confirm("Você já tem itens de outra loja no carrinho. Deseja limpar e começar um novo pedido?");
      if (!ok) return false;
      setCart({ companyId, companyName, items: [item] });
      return true;
    }
    setCart((c) => {
      const existing = c.items.find((i) => i.productId === item.productId);
      const items = existing
        ? c.items.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...c.items, item];
      return { companyId, companyName, items };
    });
    return true;
  };

  const remove: CartContextValue["remove"] = (productId) =>
    setCart((c) => {
      const items = c.items.filter((i) => i.productId !== productId);
      return items.length === 0 ? { companyId: null, companyName: null, items: [] } : { ...c, items };
    });

  const setQty: CartContextValue["setQty"] = (productId, qty) =>
    setCart((c) => ({
      ...c,
      items: c.items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i)),
    }));

  const clear = () => setCart({ companyId: null, companyName: null, items: [] });

  const { total, count } = useMemo(() => {
    const t = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const c = cart.items.reduce((s, i) => s + i.quantity, 0);
    return { total: t, count: c };
  }, [cart.items]);

  return (
    <CartContext.Provider value={{ ...cart, add, remove, setQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
