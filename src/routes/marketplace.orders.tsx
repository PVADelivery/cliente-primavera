import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/marketplace/RequireAuth";

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
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function OrdersList() {
  const { user } = useAuth();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured || !user) return [];
      // Tenta a view segura primeiro
      const fromView = await supabase.from("customer_orders_view").select("*").order("created_at", { ascending: false });
      if (!fromView.error && fromView.data) return fromView.data;
      // Fallback: tabela direta
      const fromTable = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return fromTable.data ?? [];
    },
  });

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <h1 className="font-display text-2xl font-bold">Sem pedidos ainda</h1>
        <p className="text-sm text-muted-foreground">Quando você fizer um pedido, ele aparece aqui.</p>
        <Link to="/marketplace" className="inline-block mt-3 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium">Explorar</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="font-display text-2xl font-bold">Meus pedidos</h1>
      <ul className="space-y-2">
        {orders.map((o: { id: string; status: string; total: number; created_at: string; company?: { name?: string } | null }) => (
          <li key={o.id}>
            <Link to="/marketplace/orders/$orderId" params={{ orderId: o.id }} className="block p-3 bg-card rounded-2xl border border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold truncate">{o.company?.name ?? "Pedido"}</p>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{STATUS_LABEL[o.status] ?? o.status}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                <span>R$ {Number(o.total).toFixed(2).replace(".", ",")}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
