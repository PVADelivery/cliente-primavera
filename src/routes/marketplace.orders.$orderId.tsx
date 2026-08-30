import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Store, Receipt, CreditCard, DollarSign, QrCode } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { RequireAuth } from "@/components/marketplace/RequireAuth";

export const Route = createFileRoute("/marketplace/orders/$orderId")({
  head: () => ({ meta: [{ title: "Detalhes do Pedido — MT 24horas express" }] }),
  component: () => (
    <RequireAuth>
      <OrderDetailPage />
    </RequireAuth>
  ),
});

const TIMELINE = ["pending", "preparing", "ready", "in_route", "delivered"] as const;
const LABEL: Record<string, string> = {
  pending: "Pedido recebido",
  accepted: "Aceito pela loja",
  preparing: "Em preparo",
  ready: "Pronto para retirada/envio",
  in_route: "Saiu para entrega",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue com sucesso",
  cancelled: "Pedido cancelado",
};

const PAYMENT_METHOD_LABEL: Record<string, { label: string; icon: any }> = {
  card: { label: "Cartão (na entrega)", icon: CreditCard },
  money: { label: "Dinheiro (na entrega)", icon: DollarSign },
  pix: { label: "PIX", icon: QrCode },
  credits: { label: "Crédito do App", icon: DollarSign },
};

function OrderDetailPage() {
  const { orderId } = useParams({ from: "/marketplace/orders/$orderId" });

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return null;
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            company:companies(id, name, logo_url, phone, address),
            order_items(id, product_id, product_name, quantity, price)
          `)
          .eq("id", orderId)
          .maybeSingle();

        if (error || !data) {
          const { data: simpleData } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
          return simpleData;
        }
        return data;
      } catch {
        const { data: simpleData } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
        return simpleData;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pb-20 pt-4">
        <Link to="/marketplace/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar aos Pedidos
        </Link>
        <div className="p-8 bg-card rounded-2xl border border-border text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando detalhes do pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pb-20 pt-4 text-center">
        <Link to="/marketplace/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar aos Pedidos
        </Link>
        <div className="p-8 bg-card rounded-2xl border border-border">
          <h2 className="text-xl font-bold">Pedido não encontrado</h2>
          <p className="text-sm text-muted-foreground mt-1">Não foi possível carregar as informações deste pedido.</p>
        </div>
      </div>
    );
  }

  let rawStatus = (order as any)?.status ?? "pending";
  if (rawStatus === "out_for_delivery") rawStatus = "in_route";
  if (rawStatus === "accepted") rawStatus = "preparing";
  const currentIdx = TIMELINE.indexOf(rawStatus as any);
  const isCancelled = order.status === "cancelled";

  const paymentInfo = PAYMENT_METHOD_LABEL[order.payment_method] ?? { label: order.payment_method || "Não informado", icon: CreditCard };
  const PaymentIcon = paymentInfo.icon;
  const items = (order as any)?.order_items ?? [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 pt-2">
      <Link to="/marketplace/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar aos Pedidos
      </Link>

      {/* Header do Pedido */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">
              {order.company?.logo_url ? (
                <img src={order.company.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Store className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="font-display text-xl font-black tracking-tight text-foreground">
                {order.company?.name ?? "Loja"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pedido #{orderId.slice(0, 8)} • {new Date(order.created_at).toLocaleString("pt-BR", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <span className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border shadow-sm ${
            isCancelled 
              ? "bg-rose-500 text-white border-rose-600" 
              : "bg-amber-400 text-black border-amber-500"
          }`}>
            {LABEL[order.status] ?? order.status}
          </span>
        </div>
      </div>

      {/* Timeline de Status */}
      {!isCancelled && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Status do Pedido</h2>
          <ol className="space-y-4">
            {TIMELINE.map((s, i) => {
              const reached = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <li key={s} className="flex items-center gap-3.5">
                  <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 transition-all ${
                    reached 
                      ? isCurrent 
                        ? "bg-amber-400 text-black ring-4 ring-amber-400/30" 
                        : "bg-amber-400 text-black" 
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {reached ? <CheckCircle2 className="w-4 h-4 text-black" /> : <Clock className="w-4 h-4" />}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm ${reached ? "font-bold text-foreground" : "text-muted-foreground font-medium"}`}>
                      {LABEL[s]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Itens do Pedido */}
      {items.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Itens do Pedido</h2>
          </div>
          <ul className="divide-y divide-border/60">
            {items.map((item: any) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-secondary text-foreground text-xs font-bold grid place-items-center">
                    {item.quantity}x
                  </span>
                  <span className="font-medium text-foreground">{item.product_name || "Produto"}</span>
                </div>
                <span className="font-bold text-foreground">
                  R$ {(Number(item.price || 0) * (item.quantity || 1)).toFixed(2).replace(".", ",")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detalhes de Entrega & Pagamento */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4 text-sm">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Endereço de Entrega</p>
            <p className="text-foreground font-medium mt-0.5">{order.delivery_address || "Não informado"}</p>
          </div>
        </div>

        <div className="border-t border-border/60 pt-3 flex items-start gap-3">
          <PaymentIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Forma de Pagamento</p>
            <p className="text-foreground font-medium mt-0.5">{paymentInfo.label}</p>
          </div>
        </div>

        {order.notes && (
          <div className="border-t border-border/60 pt-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Observações</p>
            <p className="text-foreground text-xs mt-0.5 bg-secondary/50 p-2.5 rounded-xl border border-border/50">
              {order.notes}
            </p>
          </div>
        )}

        <div className="border-t border-border/60 pt-3 flex items-center justify-between">
          <span className="font-bold text-foreground text-base">Total Pago</span>
          <span className="font-black text-xl text-primary">
            R$ {Number(order.total || 0).toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>
    </div>
  );
}
