import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;
import { recordAuditLog, newRequestId, explainCustomerProvisionError } from "@/lib/auditLog";
import { RequireAuth } from "@/components/marketplace/RequireAuth";
import type { Customer } from "@/types/database";

export const Route = createFileRoute("/marketplace/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Primavera Delivery" }] }),
  component: () => (
    <RequireAuth>
      <Checkout />
    </RequireAuth>
  ),
});

function hashIdempotency(parts: (string | number)[]): string {
  const s = parts.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return `mp_${Math.abs(h).toString(36)}_${Math.floor(Date.now() / 60000)}`;
}

function Checkout() {
  const { user } = useAuth();
  const { items, companyId, companyName, total, clear } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card_delivery" | "cash">("pix");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const deliveryFee = 6.9;
  const grandTotal = total + deliveryFee;

  const handleSubmit = async () => {
    if (!user || !companyId || items.length === 0) return;
    setErrorMsg(null);
    setSubmitting(true);

    const requestId = newRequestId();
    const ctx = { stage: "checkout", companyId, itemsCount: items.length };
    console.log("[Checkout][start]", { requestId, ...ctx });

    await recordAuditLog({
      request_id: requestId,
      event: "checkout.attempt",
      user_id: user.id,
      payload: { companyId, total: grandTotal, paymentMethod },
    });

    if (!isSupabaseConfigured) {
      console.warn("[Checkout][mock] Supabase não configurado — simulando sucesso");
      clear();
      navigate({ to: "/marketplace/orders" });
      return;
    }

    try {
      // 1) Auto-provision customer (lazy)
      const { data: existing, error: selErr } = await sb
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (selErr && selErr.code !== "PGRST116") {
        console.warn("[Checkout][customers.select]", selErr);
      }

      let customer = existing as Customer | null;
      if (!customer) {
        const fullName = (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "Cliente";
        const { data: created, error: insErr } = await sb
          .from("customers")
          .insert({ user_id: user.id, name: fullName, phone: null })
          .select()
          .single();
        if (insErr) {
          const explanation = explainCustomerProvisionError(insErr);
          await recordAuditLog({
            request_id: requestId,
            event: "customers.autocreate.failed",
            user_id: user.id,
            error_code: insErr.code ?? null,
            error_message: insErr.message,
            context: { explanation },
          });
          throw new Error(explanation);
        }
        customer = created as Customer;
        await recordAuditLog({
          request_id: requestId,
          event: "customers.autocreate.success",
          user_id: user.id,
          context: { customerId: customer.id },
        });
      }

      // 2) Idempotency
      const idempotencyKey = hashIdempotency([
        user.id,
        companyId,
        ...items.map((i) => `${i.productId}x${i.quantity}`),
      ]);

      // 3) Insert order
      const { data: order, error: orderErr } = await sb
        .from("orders")
        .insert({
          user_id: user.id,
          customer_id: customer.id,
          company_id: companyId,
          status: "pending",
          total: grandTotal,
          delivery_fee: deliveryFee,
          delivery_address: address,
          payment_method: paymentMethod,
          notes: notes || null,
          idempotency_key: idempotencyKey,
        })
        .select()
        .single();

      if (orderErr) {
        // 23505 → recuperar pedido já criado pela mesma chave
        if (orderErr.code === "23505") {
          await recordAuditLog({
            request_id: requestId,
            event: "orders.insert.23505",
            user_id: user.id,
            error_code: "23505",
            error_message: orderErr.message,
            payload: { idempotencyKey },
          });
          const { data: existingOrder } = await sb
            .from("orders")
            .select("id")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();
          if (existingOrder?.id) {
            clear();
            navigate({ to: "/marketplace/orders/$orderId", params: { orderId: existingOrder.id } });
            return;
          }
          throw new Error("Pedido duplicado, mas não foi possível recuperá-lo. Tente abrir 'Meus pedidos'.");
        }
        if (orderErr.code === "42501" || orderErr.message?.includes("row-level security")) {
          await recordAuditLog({
            request_id: requestId,
            event: "orders.insert.403",
            user_id: user.id,
            http_status: 403,
            error_code: orderErr.code ?? "42501",
            error_message: orderErr.message,
            payload: { customerId: customer.id, companyId },
            context: { hint: "Verifique policy 'orders_customer_insert' (PERMISSIVE, não RESTRICTIVE)." },
          });
          throw new Error("Sem permissão para criar pedido. Confira as policies de RLS em 'orders'.");
        }
        await recordAuditLog({
          request_id: requestId,
          event: "orders.insert.error",
          user_id: user.id,
          error_code: orderErr.code ?? null,
          error_message: orderErr.message,
        });
        throw new Error(orderErr.message);
      }

      // 4) Insert items
      const orderId = (order as { id: string }).id;
      const { error: itemsErr } = await sb.from("order_items").insert(
        items.map((i) => ({
          order_id: orderId,
          product_id: i.productId,
          quantity: i.quantity,
          price: i.price,
          product_name: i.name,
        })),
      );
      if (itemsErr) {
        console.warn("[Checkout][items.insert]", itemsErr);
      }

      await recordAuditLog({
        request_id: requestId,
        event: "orders.insert.success",
        user_id: user.id,
        context: { orderId, total: grandTotal },
      });

      console.log("[Checkout][done]", { requestId, orderId });
      clear();
      navigate({ to: "/marketplace/orders/$orderId", params: { orderId } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado no checkout.";
      console.error("[Checkout][fail]", { requestId, msg });
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">Adicione itens antes de finalizar.</p>;
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Finalizar pedido</h1>
      <p className="text-sm text-muted-foreground">{companyName} · {items.length} {items.length === 1 ? "item" : "itens"}</p>

      <section className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Endereço de entrega</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Rua, número, bairro"
          className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["pix", "Pix"],
            ["card_delivery", "Cartão"],
            ["cash", "Dinheiro"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setPaymentMethod(v)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                paymentMethod === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex: ponto de referência, sem cebola…"
          className="w-full px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </section>

      <section className="bg-card rounded-2xl border border-border p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {total.toFixed(2).replace(".", ",")}</span></div>
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Entrega</span><span>R$ {deliveryFee.toFixed(2).replace(".", ",")}</span></div>
        <div className="flex items-center justify-between font-bold text-base"><span>Total</span><span>R$ {grandTotal.toFixed(2).replace(".", ",")}</span></div>
      </section>

      {errorMsg && <p className="text-sm text-destructive bg-destructive/10 rounded-xl p-3">{errorMsg}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !address.trim()}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        style={{ boxShadow: "var(--shadow-elegant)" }}
      >
        {submitting ? "Enviando…" : "Confirmar pedido"}
      </button>
    </div>
  );
}
