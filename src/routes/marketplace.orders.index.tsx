import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/marketplace/RequireAuth";
import { AeroSkeletonList } from "@/components/aero";
import { ClientOrderDetailModal } from "@/components/marketplace/ClientOrderDetailModal";
import { ClientErrandDetailModal } from "@/components/marketplace/ClientErrandDetailModal";
import { 
  Package, Clock, CheckCircle2, Store, Bike, Car, Truck, 
  MapPin, ChevronRight, Edit3, Trash2, ShoppingBag, PlusCircle, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/marketplace/orders/")({
  head: () => ({ meta: [{ title: "Meus pedidos — MT 24horas express" }] }),
  component: () => (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  ),
});

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  preparing: "Preparando",
  ready: "Pronto",
  in_route: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const ERRAND_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Buscando Entregador", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-400/20 border-amber-500/30" },
  broadcasted: { label: "Buscando Entregador", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-400/20 border-amber-500/30" },
  accepted: { label: "Entregador a Caminho", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  in_route: { label: "Em Rota de Entrega", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
  delivered: { label: "Entregue", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  cancelled: { label: "Cancelado", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/20 border-rose-500/30" },
};

const VEHICLE_ICONS: Record<string, any> = {
  moto: Bike,
  carro: Car,
  carro_aberto: Truck,
};

const VEHICLE_LABELS: Record<string, string> = {
  moto: "Moto",
  carro: "Carro",
  carro_aberto: "Carro Aberto",
};

function OrdersList() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"food" | "errands">("food");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedErrandId, setSelectedErrandId] = useState<string | null>(null);

  // 1. Consulta Pedidos de Lojas / Restaurantes
  const { data: allFoodOrders = [], isLoading: isLoadingFood } = useQuery({
    queryKey: ["client-orders-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured || !user?.id) return [];
      try {
        const { data: customers } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id);

        const customerIds = (customers || []).map((c) => c.id).filter(Boolean);
        if (customerIds.length === 0) {
          customerIds.push(user.id);
        }

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

  // 2. Consulta Entregas e Envios do Cliente (Errands)
  const { data: allErrandDeliveries = [], isLoading: isLoadingErrands } = useQuery({
    queryKey: ["client-errands-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured || !user?.id) return [];
      try {
        let savedIds: string[] = [];
        if (typeof window !== "undefined") {
          try {
            savedIds = JSON.parse(localStorage.getItem("pva_my_errand_ids") || "[]");
          } catch (e) {}
        }

        // Busca por customer_id = user.id ou IDs salvos na sessão
        const queries = [
          supabase
            .from("deliveries")
            .select("*")
            .eq("customer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30),
        ];

        if (savedIds.length > 0) {
          queries.push(
            supabase
              .from("deliveries")
              .select("*")
              .in("id", savedIds.slice(0, 30))
              .order("created_at", { ascending: false })
          );
        }

        const results = await Promise.all(queries);
        const mergedMap = new Map<string, any>();

        results.forEach((res) => {
          if (res.data) {
            res.data.forEach((d: any) => {
              if (d.is_customer_errand || !d.company_id || savedIds.includes(d.id)) {
                mergedMap.set(d.id, d);
              }
            });
          }
        });

        const errandList = Array.from(mergedMap.values());
        errandList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return errandList;
      } catch (err) {
        console.error("Error fetching client errands:", err);
        return [];
      }
    },
  });

  // Realtime subscription para atualizar entregas e pedidos
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("client_orders_and_errands_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          qc.invalidateQueries({ queryKey: ["client-orders-all", user.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries" },
        () => {
          qc.invalidateQueries({ queryKey: ["client-errands-all", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  // Se houver entregas ativas e nenhum pedido de comida ativo, alterna para a aba de entregas
  const activeFoodOrders = allFoodOrders.filter((o: any) => ["pending", "preparing", "ready", "in_route"].includes(o.status));
  const pastFoodOrders = allFoodOrders.filter((o: any) => ["delivered", "cancelled"].includes(o.status)).slice(0, 10);

  const activeErrands = allErrandDeliveries.filter((d: any) => ["pending", "broadcasted", "accepted", "in_route"].includes(d.status));
  const pastErrands = allErrandDeliveries.filter((d: any) => ["delivered", "cancelled"].includes(d.status)).slice(0, 15);

  useEffect(() => {
    // Se o usuário veio com foco em entregas ou se tem entregas ativas e nenhum pedido de lanche ativo
    if (activeErrands.length > 0 && activeFoodOrders.length === 0) {
      setActiveTab("errands");
    }
  }, [activeErrands.length, activeFoodOrders.length]);

  const isLoading = isLoadingFood || isLoadingErrands;

  if (isLoading && allFoodOrders.length === 0 && allErrandDeliveries.length === 0) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pb-20 pt-2">
        <h1 className="font-display text-2xl font-black italic tracking-tight">Meus Pedidos</h1>
        <AeroSkeletonList count={3} lines={3} label="Carregando pedidos..." />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-24 pt-2">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black italic tracking-tight">Meus Pedidos</h1>
          <p className="text-xs text-muted-foreground">Acompanhe suas compras e entregas em tempo real</p>
        </div>
        {activeTab === "food" ? (
          <Link to="/marketplace" className="text-xs font-black text-foreground hover:text-primary bg-secondary px-3.5 py-2 rounded-xl border border-border transition-colors">
            Nova Compra
          </Link>
        ) : (
          <Link to="/marketplace/errands" className="text-xs font-black text-primary-foreground bg-primary px-3.5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1">
            <PlusCircle className="w-3.5 h-3.5" /> Novo Envio
          </Link>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl border border-border/80">
        <button
          type="button"
          onClick={() => setActiveTab("food")}
          className={cn(
            "py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all",
            activeTab === "food"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>🍔 Lanches & Lojas</span>
          {activeFoodOrders.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-black animate-pulse">
              {activeFoodOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("errands")}
          className={cn(
            "py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all",
            activeTab === "errands"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>📦 Envios & Entregas</span>
          {activeErrands.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-black animate-pulse">
              {activeErrands.length}
            </span>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* ABA 1: LANCHES E PRODUTOS DE LOJAS                       */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === "food" && (
        <div className="space-y-6">
          {allFoodOrders.length === 0 ? (
            <div className="text-center py-16 space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary text-2xl">
                🍔
              </div>
              <h2 className="font-display text-2xl font-bold">Nenhum pedido de loja</h2>
              <p className="text-sm text-muted-foreground">
                Você ainda não realizou nenhum pedido em restaurantes ou lojas no MT 24horas express.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link to="/marketplace" className="inline-block px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg">
                  Fazer um Pedido
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Pedidos Ativos */}
              {activeFoodOrders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Em Andamento ({activeFoodOrders.length})
                  </div>

                  <ul className="space-y-3">
                    {activeFoodOrders.map((o: any) => {
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
                                {ORDER_STATUS_LABEL[o.status] ?? o.status}
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

              {/* Histórico */}
              {pastFoodOrders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Histórico de Pedidos ({pastFoodOrders.length})
                  </div>

                  <ul className="space-y-3">
                    {pastFoodOrders.map((o: any) => {
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
                                {ORDER_STATUS_LABEL[o.status] ?? o.status}
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
            </>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* ABA 2: ENVIOS E ENTREGAS RÁPIDAS (ERRANDS)                */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === "errands" && (
        <div className="space-y-6">
          {allErrandDeliveries.length === 0 ? (
            <div className="text-center py-16 space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-primary">
                <Package className="w-8 h-8" />
              </div>
              <h2 className="font-display text-2xl font-bold">Nenhum envio solicitado</h2>
              <p className="text-sm text-muted-foreground">
                Precisa enviar ou buscar documentos, lanches, peças ou encomendas? Solicite um entregador rápido na cidade.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link to="/marketplace/errands" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg">
                  <PlusCircle className="w-4 h-4" /> Solicitar Entregador
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Entregas em Andamento */}
              {activeErrands.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Envios em Andamento ({activeErrands.length})
                  </div>

                  <ul className="space-y-3">
                    {activeErrands.map((delivery: any) => {
                      const statusInfo = ERRAND_STATUS_CONFIG[delivery.status] || ERRAND_STATUS_CONFIG.pending;
                      const VehicleIcon = VEHICLE_ICONS[delivery.vehicle_type || "moto"] || Bike;

                      return (
                        <li key={delivery.id}>
                          <div className="p-4 bg-card rounded-2xl border-2 border-primary/40 shadow-md space-y-3">
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                  <VehicleIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-foreground">
                                    Envio #{delivery.id.slice(0, 8).toUpperCase()}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {VEHICLE_LABELS[delivery.vehicle_type || "moto"]} • {new Date(delivery.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>

                              <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm", statusInfo.bg, statusInfo.color)}>
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* Route summary */}
                            <div className="text-xs space-y-1.5 bg-muted/40 p-3 rounded-xl border border-border/60">
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                <p className="text-foreground truncate flex-1">
                                  <strong className="text-muted-foreground font-normal">Coleta: </strong>
                                  {delivery.pickup_address || "Não informado"}
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                                <p className="text-foreground truncate flex-1">
                                  <strong className="text-muted-foreground font-normal">Entrega: </strong>
                                  {delivery.address || "Não informado"}
                                </p>
                              </div>
                            </div>

                            {/* Actions & Price */}
                            <div className="flex items-center justify-between pt-1">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Valor</span>
                                <span className="text-sm font-black text-foreground">
                                  R$ {Number(delivery.value || 0).toFixed(2).replace(".", ",")}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedErrandId(delivery.id)}
                                  className="h-8 rounded-xl text-xs font-bold gap-1 shadow-sm"
                                >
                                  Acompanhar / Editar
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Histórico de Entregas Concluídas / Canceladas */}
              {pastErrands.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Histórico de Envios ({pastErrands.length})
                  </div>

                  <ul className="space-y-3">
                    {pastErrands.map((delivery: any) => {
                      const isDelivered = delivery.status === "delivered";
                      const VehicleIcon = VEHICLE_ICONS[delivery.vehicle_type || "moto"] || Bike;

                      return (
                        <li key={delivery.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedErrandId(delivery.id)}
                            className="w-full text-left block p-4 bg-card rounded-2xl border border-border shadow-sm hover:border-primary/50 transition-all active:scale-[0.99] cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <p className="text-xs font-bold text-foreground">
                                  Envio #{delivery.id.slice(0, 8).toUpperCase()}
                                </p>
                              </div>

                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                isDelivered 
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              }`}>
                                {isDelivered ? "Entregue" : "Cancelado"}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-muted-foreground truncate">
                              {delivery.address ? `Destino: ${delivery.address}` : "Entrega rápida na cidade"}
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {new Date(delivery.created_at).toLocaleDateString("pt-BR")} às {new Date(delivery.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className="font-black text-sm text-foreground">
                                R$ {Number(delivery.value || 0).toFixed(2).replace(".", ",")}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAIS DE DETALHES */}
      <ClientOrderDetailModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />

      <ClientErrandDetailModal
        errandId={selectedErrandId}
        isOpen={!!selectedErrandId}
        onClose={() => setSelectedErrandId(null)}
        onUpdated={() => {
          qc.invalidateQueries({ queryKey: ["client-errands-all", user?.id] });
        }}
      />
    </div>
  );
}
