import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const ADMIN_WHATSAPP_NUMBER = "556697196937";
export const BONUS_PERCENTAGE = 0.10; // 10% de bônus

export interface CustomerCredit {
  id: string;
  customer_id: string;
  customer_phone?: string;
  customer_name?: string;
  balance: number;
  total_recharged: number;
  total_bonus: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreditTransaction {
  id: string;
  customer_id: string;
  customer_phone?: string;
  customer_name?: string;
  amount: number;
  paid_amount?: number;
  bonus_amount?: number;
  type: "recharge" | "bonus" | "payment_order" | "payment_ride" | "payment_errand" | "refund" | "admin_adjustment";
  reference_id?: string;
  description: string;
  created_by: string;
  created_at: string;
}

/** Abre o WhatsApp do Administrador com mensagem pré-formatada calculando o bônus de 10% */
export function openCreditRechargeWhatsApp(customerName?: string, amount: number = 100) {
  const bonus = amount * BONUS_PERCENTAGE;
  const totalCredits = amount + bonus;
  const nameStr = customerName ? `Meu nome: ${customerName}.\n` : "";
  const text = `Olá, Administrador do MT 24horas express! 👋\n\nGostaria de comprar *R$ ${amount.toFixed(2).replace(".", ",")* em créditos* para minha conta do App com o *Bônus de 10%* (+R$ ${bonus.toFixed(2).replace(".", ",")} de bônus = Total de *R$ ${totalCredits.toFixed(2).replace(".", ",")} em créditos*).\n\n${nameStr}Por favor, me informe a chave Pix para pagamento!`;
  
  const url = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Hook para buscar o saldo e dados de crédito do cliente */
export function useCustomerCredits(customerId?: string) {
  return useQuery<CustomerCredit | null>({
    queryKey: ["customer_credits", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      try {
        const { data, error } = await supabase
          .from("customer_credits")
          .select("*")
          .eq("customer_id", customerId)
          .maybeSingle();

        if (error) {
          // Se a tabela ainda não foi criada, retorna saldo zerado de forma graciosa
          console.warn("[CustomerCredits] Erro ao buscar saldo ou tabela não encontrada:", error.message);
          return null;
        }
        return data as CustomerCredit;
      } catch (err) {
        console.warn("[CustomerCredits] Exceção ao consultar créditos:", err);
        return null;
      }
    },
    enabled: !!customerId,
    staleTime: 1000 * 30, // 30s
  });
}

/** Hook para buscar o extrato de transações de crédito do cliente */
export function useCustomerCreditTransactions(customerId?: string) {
  return useQuery<CustomerCreditTransaction[]>({
    queryKey: ["customer_credit_transactions", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      try {
        const { data, error } = await supabase
          .from("customer_credit_transactions")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("[CustomerCredits] Erro ao buscar transações:", error.message);
          return [];
        }
        return (data || []) as CustomerCreditTransaction[];
      } catch (err) {
        console.warn("[CustomerCredits] Exceção ao consultar transações:", err);
        return [];
      }
    },
    enabled: !!customerId,
    staleTime: 1000 * 30,
  });
}

/** Função para debitar créditos no pagamento */
export async function deductCustomerCredits({
  customerId,
  amount,
  type,
  referenceId,
  description,
}: {
  customerId: string;
  amount: number;
  type: "payment_order" | "payment_ride" | "payment_errand";
  referenceId?: string;
  description: string;
}) {
  // Tenta chamar a RPC atômica
  const { data, error } = await supabase.rpc("rpc_deduct_customer_credits", {
    p_customer_id: customerId,
    p_amount: amount,
    p_type: type,
    p_reference_id: referenceId || null,
    p_description: description,
  });

  if (error) {
    throw new Error(error.message || "Erro ao debitar saldo de créditos.");
  }
  return data;
}
