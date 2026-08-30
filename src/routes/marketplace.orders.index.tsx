import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/marketplace/RequireAuth";
import { AeroSkeletonList } from "@/components/aero";
import { ClientOrderDetailModal } from "@/components/marketplace/ClientOrderDetailModal";
import { Package, Clock, CheckCircle2, Store } from "lucide-react";

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
  preparing: "Preparando",
  ready: "Pronto",
  in_route: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function OrdersList() {
  const { user } = useAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ["client-orders-all", user?.id],
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
        if (customerIds.length === 0) {
          customerIds.push(user.id);
        }

        // 2. Buscar todos os pedidos vinculados ao customer_id
        const { data, error } = await supabase
          .from("orders")
          .select(`
            id, status, total, created_at, company_id,
            companies(name, logo_url)
          `)
          .in("customer_id", customerIds)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          const { data: fallbackData } = await supabase
            .from("orders")
            .select("id, status, total, created_at, company_id")
            .in("customer_id", customerIds)
            .order("created_at", { ascending: false })
            .limit(50);

          if (fallbackData && fallbackData.length > 0) {
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
        console.error("Error fetching client orders:", err);
        return [];
      }
    },
  });

  const activeOrders = allOrders.filter((o: any) => ["pending", "preparing", "ready", "in_route"].includes(o.status));
  const pastOrders = allOrders.filter((o: any) => ["delivered", "cancelled"].includes(o.status));

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pb-20 pt-2">
        <h1 className="font-display text-2xl font-black italic tracking-tight">Meus Pedidos</h1>
        <AeroSkeletonList count={3} lines={3} label="Carregando pedidos..." />
      </div>
    );
  }

  if (allOrders.length === 0) {
    return (
      <div className="text-center py-16 space-y-3 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary text-2xl">
          🍔
        </div>
        <h1 className="font-display text-2xl font-bold">Nenhum pedido encontrado</h1>
        <p className="text-sm text-muted-foreground">
          Você ainda não realizou nenhum pedido no MT 24horas express.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/marketplace" className="inline-block px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg">
            Fazer um Pedido
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black italic tracking-tight">Meus Pedidos</h1>
          <p className="text-xs text-muted-foreground">Acompanhe seus pedidos em andamento e histórico</p>
        </div>
        <Link to="/marketplace" className="text-xs font-black text-foreground hover:text-primary bg-secondary px-3.5 py-2 rounded-xl border border-border transition-colors">
          Nova Compra
        </Link>
      </div>

      {/* ── SEÇÃO: PEDIDOS ATIVOS ── */}
      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500">
            <Clock className="w-4 h-4 animate-pulse" />
            Pedidos em Andamento ({activeOrders.length})
          </div>

          <ul className="space-y-3">
            {activeOrders.map((o: any) => {
              const companyName = o.companies?.name || o.company?.name || "Restaurante";
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(o.id)}
                    className="w-full text-left block p-4 bg-card rounded-2xl border-2 border-primary/40 shadow-md hover:border-primary transition-all active:scale-[0.99] cursor-pointer"
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
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── SEÇÃO: HISTÓRICO / PEDIDOS CONCLUÍDOS ── */}
      {pastOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Pedidos Recentes / Histórico ({pastOrders.length})
          </div>

          <ul className="space-y-3">
            {pastOrders.map((o: any) => {
              const companyName = o.companies?.name || o.company?.name || "Restaurante";
              const isDelivered = o.status === "delivered";
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(o.id)}
                    className="w-full text-left block p-4 bg-card rounded-2xl border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-bold truncate text-foreground">{companyName}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isDelivered 
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      }`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(o.created_at).toLocaleDateString("pt-BR")} às {new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-black text-sm text-foreground">R$ {Number(o.total || 0).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* MODAL DE DETALHES DO PEDIDO */}
      <ClientOrderDetailModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
