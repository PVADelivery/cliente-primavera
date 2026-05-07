import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, ClipboardList, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";

const tabs: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/marketplace", label: "Início", icon: Home, exact: true },
  { to: "/marketplace/search", label: "Buscar", icon: Search },
  { to: "/marketplace/cart", label: "Carrinho", icon: ShoppingBag },
  { to: "/marketplace/orders", label: "Pedidos", icon: ClipboardList },
  { to: "/marketplace/profile", label: "Perfil", icon: User },
];

export function MarketplaceLayout() {
  const { user } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const path = router.state.location.pathname;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 h-14">
          <Link to="/marketplace" className="flex items-center gap-2">
            <span className="inline-block w-8 h-8 rounded-xl" style={{ background: "var(--gradient-primary)" }} />
            <span className="font-display font-bold tracking-tight">Primavera</span>
          </Link>
          {!user ? (
            <Link to="/login" className="text-sm font-medium text-primary">Entrar</Link>
          ) : (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</span>
          )}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <ul className="mx-auto max-w-2xl grid grid-cols-5">
          {tabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            const Icon = t.icon;
            return (
              <li key={t.to} className="relative">
                <Link
                  to={t.to as "/marketplace"}
                  className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span className="relative">
                    <Icon className="w-5 h-5" />
                    {t.to === "/marketplace/cart" && count > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </span>
                  {t.label}
                </Link>
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
