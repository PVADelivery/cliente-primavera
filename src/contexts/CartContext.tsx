import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export function cleanProductImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{") || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (typeof first === "string") return cleanProductImageUrl(first);
        }
        if (typeof parsed === "string") return cleanProductImageUrl(parsed);
      } catch {
        // fallback
      }
    }
    let cleaned = trimmed.replace(/^[\s\["'`]+|[\s\]"'`]+$/g, "");
    cleaned = cleaned.replace(/^(https?):\/([^\/])/, "$1://$2");
    if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("/")) {
      return cleaned;
    }
  }
  return null;
}

export interface CartOptionSelected {
  groupName: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  notes?: string;
  selectedOptions?: CartOptionSelected[];
}

interface Cart {
  companyId: string | null;
  companyName: string | null;
  items: CartItem[];
}

interface CartContextValue extends Cart {
  add: (companyId: string, companyName: string, item: CartItem) => boolean;
  remove: (keyOrProductId: string) => void;
  setQty: (keyOrProductId: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const STORAGE_KEY = "primavera.cart.v1";
const CartContext = createContext<CartContextValue | undefined>(undefined);

const getItemKey = (i: CartItem): string => {
  if (i.id) return i.id;
  const opts = i.selectedOptions && i.selectedOptions.length > 0
    ? i.selectedOptions.map(o => `${o.groupName}:${o.optionName}:${o.price}`).sort().join('|')
    : '';
  return `${i.productId}_${opts}_${i.notes || ''}`;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ companyId: null, companyName: null, items: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          parsed.items = parsed.items.map((it: CartItem) => ({
            ...it,
            imageUrl: cleanProductImageUrl(it.imageUrl),
          }));
        }
        setCart(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const add: CartContextValue["add"] = (companyId, companyName, item) => {
    const sanitizedItem: CartItem = {
      ...item,
      imageUrl: cleanProductImageUrl(item.imageUrl),
    };
    if (cart.companyId && cart.companyId !== companyId) {
      const ok = confirm("Você já tem itens de outra loja no carrinho. Deseja limpar e começar um novo pedido?");
      if (!ok) return false;
      const key = getItemKey(sanitizedItem);
      setCart({ companyId, companyName, items: [{ ...sanitizedItem, id: key }] });
      return true;
    }
    setCart((c) => {
      const targetKey = getItemKey(sanitizedItem);
      const targetItem = { ...sanitizedItem, id: targetKey };
      const existing = c.items.find((i) => (i.id || getItemKey(i)) === targetKey);
      const items = existing
        ? c.items.map((i) => ((i.id || getItemKey(i)) === targetKey ? { ...i, quantity: i.quantity + sanitizedItem.quantity } : i))
        : [...c.items, targetItem];
      return { companyId, companyName, items };
    });
    return true;
  };

  const remove: CartContextValue["remove"] = (keyOrProductId) =>
    setCart((c) => {
      const items = c.items.filter((i) => i.id !== keyOrProductId && i.productId !== keyOrProductId);
      return items.length === 0 ? { companyId: null, companyName: null, items: [] } : { ...c, items };
    });

  const setQty: CartContextValue["setQty"] = (keyOrProductId, qty) =>
    setCart((c) => ({
      ...c,
      items: c.items.map((i) => ((i.id === keyOrProductId || i.productId === keyOrProductId) ? { ...i, quantity: Math.max(1, qty) } : i)),
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

