import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { 
  Store, X, Clock, CheckCircle2, XCircle, MapPin, Receipt, 
  CreditCard, DollarSign, QrCode, Phone, ChevronRight, Package, AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Aguardando confirmação", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-400/20 border-amber-500/30" },
  preparing: { label: "Em preparo na cozinha", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  ready: { label: "Pronto para entrega/retirada", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  in_route: { label: "Saiu para entrega", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
  out_for_delivery: { label: "Saiu para entrega", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
  delivered: { label: "Entregue com sucesso", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  cancelled: { label: "Pedido cancelado", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/20 border-rose-500/30" },
};

const PAYMENT_METHOD_LABEL: Record<string, { label: string; icon: any }> = {
  card: { label: "Cartão (na entrega)", icon: CreditCard },
  money: { label: "Dinheiro (na entrega)", icon: DollarSign },
  pix: { label: "PIX", icon: QrCode },
  credits: { label: "Créditos do App", icon: DollarSign },
};

interface ClientOrderDetailModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientOrderDetailModal({ orderId, isOpen, onClose }: ClientOrderDetailModalProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId || !isOpen) {
      setOrder(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    async function loadOrder() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            companies(id, name, logo_url, phone, address),
            order_items(id, product_name, quantity, price, notes)
          `)
          .eq("id", orderId)
          .maybeSingle();

        if (isMounted) {
          if (data) {
            setOrder(data);
          } else {
            // Fallback simples
            const { data: fallback } = await supabase
              .from("orders")
              .select("*")
              .eq("id", orderId)
              .maybeSingle();
            setOrder(fallback);
          }
        }
      } catch (err) {
        console.error("[ClientOrderDetailModal] Erro:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, isOpen]);

  const company = order?.companies || order?.company || { name: "Estabelecimento", logo_url: null };
  const items = order?.order_items || [];
  const statusInfo = STATUS_LABEL[order?.status] || { label: order?.status || "Status", color: "text-foreground", bg: "bg-secondary" };
  const paymentInfo = PAYMENT_METHOD_LABEL[order?.payment_method] || { label: order?.payment_method || "Não informado", icon: CreditCard };
  const PaymentIcon = paymentInfo.icon;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" hideClose className="h-[90vh] sm:h-[85vh] rounded-t-[2.5rem] border-none p-0 overflow-hidden bg-background shadow-2xl">
        <div className="h-full flex flex-col">
          
          {/* Header */}
          <div className="p-6 border-b border-border/60 flex items-center justify-between bg-card shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pedido</span>
                <p className="font-black text-lg text-foreground">#{orderId?.slice(-6).toUpperCase()}</p>
              </div>
              <p className="text-xs text-muted-foreground">Detalhes completos da sua compra</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="py-24 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-bold text-muted-foreground">Carregando informações do pedido...</p>
              </div>
            ) : !order ? (
              <div className="py-24 text-center text-muted-foreground space-y-2">
                <AlertCircle className="w-12 h-12 mx-auto text-rose-500 opacity-60" />
                <p className="font-bold text-foreground">Pedido não encontrado</p>
                <p className="text-xs">Não foi possível carregar os detalhes deste pedido.</p>
              </div>
            ) : (
              <>
                {/* Status Card */}
                <div className={cn("p-5 rounded-2xl border flex items-center justify-between", statusInfo.bg)}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl bg-background/60 shadow-sm", statusInfo.color)}>
                      {order.status === "delivered" ? <CheckCircle2 className="w-5 h-5" /> : 
                       order.status === "cancelled" ? <XCircle className="w-5 h-5" /> : 
                       <Clock className="w-5 h-5 animate-pulse" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status Atual</p>
                      <p className={cn("font-black text-sm", statusInfo.color)}>{statusInfo.label}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Loja Info */}
                <div className="p-4 bg-card rounded-2xl border border-border flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-7 h-7 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-base text-foreground truncate">{company.name}</p>
                    {company.address && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {company.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                    <Receipt className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Itens do Pedido</h3>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">Lista de itens não disponível para este pedido.</p>
                  ) : (
                    <div className="space-y-3 divide-y divide-border/40">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className={cn("flex items-start justify-between gap-3", idx > 0 && "pt-3")}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-xs">
                                {item.quantity}x
                              </span>
                              <p className="font-bold text-sm text-foreground truncate">{item.product_name || "Item"}</p>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground bg-muted/40 p-1.5 rounded-lg mt-1 ml-7">
                                Obs: {item.notes}
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-sm text-foreground shrink-0">
                            R$ {(Number(item.price || 0) * (item.quantity || 1)).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Entrega e Pagamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Endereço de Entrega</span>
                    </div>
                    <p className="text-xs font-bold text-foreground leading-relaxed">
                      {order.delivery_address || "Retirada no Balcão"}
                    </p>
                  </div>

                  <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <PaymentIcon className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Pagamento</span>
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {paymentInfo.label}
                    </p>
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="bg-secondary/40 rounded-2xl border border-border p-5 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-bold">R$ {Number(order.total || 0).toFixed(2).replace(".", ",")}</span>
                  </div>
                  {order.delivery_fee > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Taxa de Entrega</span>
                      <span className="font-bold">R$ {Number(order.delivery_fee).toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="border-t border-border/60 pt-3 flex justify-between items-center">
                    <span className="font-black text-sm text-foreground uppercase tracking-wider">Total</span>
                    <span className="font-black text-xl text-slate-900 dark:text-white">
                      R$ {Number(order.total || 0).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/60 bg-card shrink-0">
            <button
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-md cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
