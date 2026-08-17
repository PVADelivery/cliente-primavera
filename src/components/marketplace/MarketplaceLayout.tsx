import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { Home, BookUser, ShoppingBag, ClipboardList, User, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import logoIcon from "@/assets/logo-icon-v3.png";
import { useState, useEffect } from "react";
import { Car } from "lucide-react";

const tabs: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/marketplace", label: "Início", icon: Home, exact: true },
  { to: "/marketplace/cart", label: "Carrinho", icon: ShoppingBag },
  { to: "/marketplace/orders", label: "Pedidos", icon: ClipboardList },
  { to: "/marketplace/rides", label: "Corridas", icon: Car },
  { to: "/marketplace/directory", label: "PPP", icon: BookUser },
  { to: "/marketplace/profile", label: "Perfil", icon: User },
];

export function MarketplaceLayout() {
  const { user } = useAuth();
  const { count } = useCart();
  const router = useRouter();
  const path = router.state.location.pathname;

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [activeRidesCount, setActiveRidesCount] = useState(0);

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

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      setActiveOrdersCount(0);
      setActiveRidesCount(0);
      return;
    }

    const fetchActiveCounts = async () => {
      try {
        // Pedidos ativos (usa apenas valores válidos do enum order_status)
        const { count: ordersCount, error: ordersErr } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["pending", "preparing", "ready", "in_route"]);

        if (!ordersErr && typeof ordersCount === "number") {
          setActiveOrdersCount(ordersCount);
        }

        // Corridas ativas
        const { count: ridesCount, error: ridesErr } = await supabase
          .from("ride_requests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["pending", "accepted", "in_progress"]);

        if (!ridesErr && typeof ridesCount === "number") {
          setActiveRidesCount(ridesCount);
        }
      } catch (err) {
        console.error("Erro ao buscar contadores ativos:", err);
      }
    };

    fetchActiveCounts();

    const channel = supabase
      .channel(`active_badges_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` },
        () => fetchActiveCounts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_requests", filter: `user_id=eq.${user.id}` },
        () => fetchActiveCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
      {/* ── Sol global iluminando o app (responsivo, sem flicker) ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 right-0 rounded-full z-0 sun-breathe"
        style={{
          width: "clamp(420px, 55vw, 900px)",
          height: "clamp(420px, 55vw, 900px)",
          transform: "translate(30%, -30%)",
          background:
            "radial-gradient(circle at center, rgba(255,190,90,0.22) 0%, rgba(249,160,63,0.10) 32%, rgba(249,160,63,0.03) 50%, rgba(249,160,63,0) 62%)",
          filter: "blur(40px)",
          willChange: "opacity",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 right-0 rounded-full z-0"
        style={{
          width: "clamp(220px, 28vw, 520px)",
          height: "clamp(220px, 28vw, 520px)",
          transform: "translate(35%, -35%)",
          background:
            "radial-gradient(circle at center, rgba(255,190,90,0.38) 0%, rgba(249,160,63,0.15) 42%, rgba(249,160,63,0) 65%)",
          filter: "blur(24px)",
        }}
      />
      {/* Vinheta escura sutil (canto inferior-esquerdo) para preservar contraste */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 0% 100%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      {!['/marketplace/checkout', '/marketplace/addresses'].includes(path) && (
        <header className="sticky top-0 z-40 bg-[oklch(0.12_0.005_250)] border-b border-white/[0.07] relative overflow-hidden">
          <span aria-hidden className="absolute inset-0 carbon-weave opacity-40 pointer-events-none" />
          <div className="relative mx-auto max-w-2xl grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 h-14">
            <Link to="/marketplace" className="flex min-w-0 items-center gap-2.5 aero-focus rounded-xl">
              <span className="flex items-center justify-center w-8 h-8">
                <img src={logoIcon} alt="Logo" className="w-full h-full object-contain" />
              </span>
              <span className="font-display font-black italic tracking-tight text-sm text-white truncate">MT 24horas express</span>
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={toggleTheme}
                className="tap-target aero-focus grid place-items-center w-10 h-10 rounded-full bg-card/70 border border-border text-white/85 hover:text-white hover:border-primary/50 transition-colors"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {!user ? (
                <Link to="/login" className="tap-target aero-focus inline-flex items-center px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold">Entrar</Link>
              ) : null}
            </div>
          </div>
        </header>
      )}

      <main className={`relative z-10 flex-1 mx-auto w-full max-w-2xl px-4 ${['/marketplace/checkout', '/marketplace/addresses'].includes(path) ? '' : 'pb-24 pt-4'}`}>
        <Outlet />
      </main>

      {!['/marketplace/checkout', '/marketplace/addresses'].includes(path) && (
        <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto max-w-2xl grid grid-cols-6">
          {tabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            const Icon = t.icon;
            return (
              <li key={t.to} className="relative">
                {active && (
                  <motion.span
                    aria-hidden
                    layoutId="tab-active-pill"
                    transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.7 }}
                    className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-primary/12 border border-primary/30 shadow-[0_0_18px_-6px_hsl(var(--primary)/0.55)] overflow-hidden"
                  >
                    <span aria-hidden className="absolute inset-0 nav-sweep" />
                  </motion.span>
                )}
                <Link
                  to={t.to as "/marketplace"}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
                  }}
                  className={`aero-focus relative z-10 min-h-[52px] rounded-2xl flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-all duration-200 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="relative">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-300 ${
                        active ? "-translate-y-0.5 scale-110 drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" : ""
                      }`}
                    />
                    {t.to === "/marketplace/cart" && count > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {count}
                      </span>
                    )}
                    {t.to === "/marketplace/orders" && activeOrdersCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
                        {activeOrdersCount}
                      </span>
                    )}
                    {t.to === "/marketplace/rides" && activeRidesCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
                        {activeRidesCount}
                      </span>
                    )}
                  </span>
                  {t.label}
                </Link>
                {active && (
                  <motion.div
                    aria-hidden
                    layoutId="tab-indicator"
                    transition={{ type: "spring", stiffness: 480, damping: 34 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      )}
    </div>
  );
}
