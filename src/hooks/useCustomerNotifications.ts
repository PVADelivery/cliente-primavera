// @ts-nocheck
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";

export function useCustomerNotifications() {
  const { user } = useAuth();
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    // Configuração Nativa Capacitor (FCM)
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions().then((res) => {
        if (res.display === "granted" && Capacitor.getPlatform() === "android") {
          LocalNotifications.createChannel({
            id: "customer-order-updates-v1",
            name: "Atualizações de Pedidos",
            description: "Notificações de status de pedidos no MT 24 Horas",
            importance: 4,
            visibility: 1,
            vibration: true,
          }).catch(() => {});
        }
      });

      const syncFcmToken = async (tokenVal: string) => {
        if (!tokenVal) return;
        localStorage.setItem("customer_fcm_token", tokenVal);
        // Atualiza fcm_token no perfil do cliente se houver campo
        try {
          await supabase
            .from("profiles")
            .update({ fcm_token: tokenVal } as any)
            .eq("id", user.id);
        } catch (e) {
          console.warn("[FCM] Perfil token update error:", e);
        }
      };

      PushNotifications.addListener("registration", (token) => {
        console.log("[FCM Cliente] Token:", token.value);
        syncFcmToken(token.value);
      });

      const cachedToken = localStorage.getItem("customer_fcm_token");
      if (cachedToken) {
        syncFcmToken(cachedToken);
      }

      PushNotifications.requestPermissions().then((res) => {
        if (res.receive === "granted") {
          PushNotifications.register().catch(() => {});
        }
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const title = notification.title || "Atualização do seu Pedido";
        const body = notification.body || notification.data?.message || "Confira o status no app!";
        toast.info(title, { description: body });
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const orderId = action.notification?.data?.orderId || action.notification?.data?.order_id;
        if (orderId && typeof window !== "undefined") {
          window.location.href = `/orders/${orderId}`;
        }
      });
    }

    // Realtime Postgres Changes para Pedidos do Cliente
    const orderChannel = supabase
      .channel(`customer-orders-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const ord = payload.new as any;
          const old = payload.old as any;

          if (ord.status !== old?.status) {
            let statusText = "Atualizado";
            if (ord.status === "preparing") statusText = "🍳 Seu pedido está sendo preparado!";
            else if (ord.status === "ready") statusText = "📦 Pedido pronto para entrega!";
            else if (ord.status === "in_route" || ord.status === "out_for_delivery") statusText = "🛵 Seu pedido saiu para entrega!";
            else if (ord.status === "completed") statusText = "✅ Pedido entregue com sucesso!";
            else if (ord.status === "cancelled") statusText = "❌ Pedido foi cancelado.";

            toast.info("Status do Pedido", { description: statusText });

            if (Capacitor.isNativePlatform()) {
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: "Status do Pedido",
                    body: statusText,
                    id: Math.floor(Math.random() * 100000),
                    channelId: "customer-order-updates-v1",
                    extra: { orderId: ord.id },
                  },
                ],
              }).catch(() => {});
            }
          }
        }
      )
      .subscribe();

    channelsRef.current.push(orderChannel);

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [user?.id]);
}
