import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/marketplace/RequireAuth";
import { AeroSkeletonList } from "@/components/aero";

export const Route = createFileRoute("/marketplace/orders/")({
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
      if (!isSupabaseConfigured || !user?.id) return [];
      try {
        // 1. Obter os customer_ids vinculados ao usuário
        const { data: customers } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id);

        const customerIds = (customers || []).map((c) => c.id).filter(Boolean);

        // Se não tiver registro em customers, tenta usar o próprio user.id
        if (customerIds.length === 0) {
          customerIds.push(user.id);
        }

        // 2. Buscar pedidos ativos vinculados aos customer_ids
        let query = supabase
          .from("orders")
          .select(`
            id, status, total, created_at, company_id,
            companies(name, logo_url)
          `)
          .in("status", ["pending", "preparing", "ready", "in_route", "accepted"])
          .order("created_at", { ascending: false });

        if (customerIds.length > 0) {
          query = query.in("customer_id", customerIds);
        }

        const { data, error } = await query;

        if (error) {
          console.warn("[OrdersList] Falha na query primária, tentando fallback:", error);
          // Fallback sem join caso a relação companies esteja inacessível
          const { data: fallbackData } = await supabase
            .from("orders")
            .select("id, status, total, created_at, company_id")
            .in("customer_id", customerIds)
            .in("status", ["pending", "preparing", "ready", "in_route", "accepted"])
            .order("created_at", { ascending: false });

          if (fallbackData && fallbackData.length > 0) {
            // Busca os nomes das empresas separadamente
            const compIds = Array.from(new Set(fallbackData.map((o) => o.company_id).filter(Boolean)));
            const { data: compList } = await supabase
              .from("companies")
              .select("id, name, logo_url")
              .in("id", compIds);

            const compMap = new Map((compList || []).map((c) => [c.id, c]));
            return fallbackData.map((o) => ({
              ...o,
              companies: compMap.get(o.company_id) || { name: "Restaurante", logo_url: null },
            }));
          }
          return [];
        }

        return data ?? [];
      } catch (err) {
        console.error("Error fetching active orders:", err);
        return [];
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pb-20 pt-2">
        <h1 className="font-display text-2xl font-black italic tracking-tight">Pedidos Ativos</h1>
        <AeroSkeletonList count={3} lines={3} label="Carregando pedidos" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16 space-y-3 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary text-2xl">
          🍔
        </div>
        <h1 className="font-display text-2xl font-bold">Nenhum pedido ativo no momento</h1>
        <p className="text-sm text-muted-foreground">
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
        <Link to="/marketplace/profile" className="text-xs font-black text-foreground hover:text-primary bg-secondary px-3 py-1.5 rounded-lg border border-border transition-colors">
          Ver Histórico
        </Link>
      </div>

      <ul className="space-y-3">
        {orders.map((o: any) => {
          const companyName = o.companies?.name || o.company?.name || "Restaurante";
          return (
            <li key={o.id}>
              <Link
                to="/marketplace/orders/$orderId"
                params={{ orderId: o.id }}
                className="block p-4 bg-card rounded-2xl border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold truncate text-foreground">{companyName}</p>
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-400 text-black border border-amber-500 shadow-sm">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-black text-sm text-foreground">R$ {Number(o.total || 0).toFixed(2).replace(".", ",")}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
