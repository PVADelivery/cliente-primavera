import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { RequireAuth } from "@/components/marketplace/RequireAuth";

export const Route = createFileRoute("/marketplace/orders/$orderId")({
  component: () => (
    <RequireAuth>
      <OrderDetailPage />
    </RequireAuth>
  ),
});

const TIMELINE = ["pending", "accepted", "preparing", "out_for_delivery", "delivered"] as const;
const LABEL: Record<string, string> = {
  pending: "Pedido recebido",
  accepted: "Aceito pela loja",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
};

function OrderDetailPage() {
  const { orderId } = useParams({ from: "/marketplace/orders/$orderId" });
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return { id: orderId, status: "pending", total: 0, delivery_address: "—", created_at: new Date().toISOString() };
      const { data } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      return data;
    },
  });

  const status = (order as { status?: string } | undefined)?.status ?? "pending";
  const currentIdx = TIMELINE.indexOf(status as (typeof TIMELINE)[number]);

  return (
    <div className="space-y-5">
      <Link to="/marketplace/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Voltar</Link>
      <h1 className="font-display text-2xl font-bold">Pedido</h1>
      <p className="text-xs text-muted-foreground">#{orderId.slice(0, 8)}</p>

      <ol className="space-y-3">
        {TIMELINE.map((s, i) => {
          const reached = i <= currentIdx;
          return (
            <li key={s} className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full grid place-items-center ${reached ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {reached ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </span>
              <span className={`text-sm ${reached ? "font-semibold" : "text-muted-foreground"}`}>{LABEL[s]}</span>
            </li>
          );
        })}
      </ol>

      <section className="bg-card rounded-2xl border border-border p-4 text-sm space-y-1">
        <p><span className="text-muted-foreground">Endereço:</span> {(order as { delivery_address?: string } | undefined)?.delivery_address ?? "—"}</p>
        <p><span className="text-muted-foreground">Total:</span> R$ {Number((order as { total?: number } | undefined)?.total ?? 0).toFixed(2).replace(".", ",")}</p>
      </section>
    </div>
  );
}
