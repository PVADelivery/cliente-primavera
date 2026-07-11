import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { Home, BookUser, ShoppingBag, ClipboardList, User, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";
import logoIcon from "@/assets/logo-icon-v3.png";
import { useState, useEffect } from "react";

const tabs: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/marketplace", label: "Início", icon: Home, exact: true },
  { to: "/marketplace/directory", label: "Agenda", icon: BookUser },
  { to: "/marketplace/cart", label: "Carrinho", icon: ShoppingBag },
  { to: "/marketplace/orders", label: "Pedidos", icon: ClipboardList },
  { to: "/marketplace/profile", label: "Perfil", icon: User },
];

export function MarketplaceLayout() {
  const { user } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const path = router.state.location.pathname;

  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    // Default to dark to match driver/business apps
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* ── Sol global iluminando o app inteiro ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-56 -right-40 w-[700px] h-[700px] rounded-full z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(250,204,21,0.55) 0%, rgba(250,204,21,0.28) 28%, rgba(250,204,21,0.10) 52%, rgba(250,204,21,0) 75%)",
          filter: "blur(30px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -right-10 w-56 h-56 rounded-full z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(253,224,71,0.95) 0%, rgba(250,204,21,0.6) 40%, rgba(250,204,21,0) 75%)",
          filter: "blur(6px)",
        }}
      />
      <header className="sticky top-0 z-40 bg-[oklch(0.12_0.005_250)] border-b border-white/[0.07]">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 h-14">
          <Link to="/marketplace" className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8">
              <img src={logoIcon} alt="Logo" className="w-full h-full object-contain" />
            </span>
            <span className="font-display font-bold tracking-tight text-sm text-white">Primavera Delivery</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {!user ? (
              <Link to="/login" className="text-sm font-medium text-primary">Entrar</Link>
            ) : (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</span>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
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
