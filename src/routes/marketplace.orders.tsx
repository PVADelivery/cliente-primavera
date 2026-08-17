import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/marketplace/RequireAuth";
import { AeroSkeletonList, AeroEmptyState } from "@/components/aero";

export const Route = createFileRoute("/marketplace/orders")({
  head: () => ({ meta: [{ title: "Meus pedidos — MT 24horas express" }] }),
  component: () => (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  accepted: "Aceito",
  preparing: "Preparando",
  ready: "Pronto",
  in_route: "Saiu para entrega",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function OrdersList() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["active-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured || !user) return [];
      // Filtra estritamente pedidos ATIVOS (em andamento)
      const { data, error } = await supabase
        .from("orders")
        .select(`id, status, total, created_at, company:companies(name, logo_url)`)
        .eq("user_id", user.id)
        .in("status", ["pending", "preparing", "ready", "in_route", "accepted"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching active orders:", error);
        return [];
      }
      return data ?? [];
    },
  });

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
          🍔
        </div>
        <h1 className="font-display text-2xl font-bold">Nenhum pedido ativo no momento</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Seus pedidos em preparo ou a caminho aparecem aqui. Para ver pedidos anteriores, acesse seu Perfil.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/marketplace" className="inline-block px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            Fazer um Pedido
          </Link>
          <Link to="/marketplace/profile" className="inline-block px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm">
            Ver Histórico
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black italic tracking-tight">Pedidos Ativos</h1>
          <p className="text-xs text-muted-foreground">Acompanhe seus pedidos em andamento</p>
        </div>
        <Link to="/marketplace/profile" className="text-xs font-bold text-primary hover:underline">
          Ver Histórico
        </Link>
      </div>

      <ul className="space-y-3">
        {orders.map((o: any) => (
          <li key={o.id}>
            <Link to="/marketplace/orders/$orderId" params={{ orderId: o.id }} className="block p-4 bg-card rounded-2xl border border-border shadow-sm hover:border-primary/50 transition-all">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold truncate text-foreground">{o.company?.name ?? "Restaurante"}</p>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 animate-pulse">
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="font-black text-sm text-foreground">R$ {Number(o.total || 0).toFixed(2).replace(".", ",")}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
