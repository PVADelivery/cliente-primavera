import { supabase } from '@/lib/supabase';
import { Address } from '@/types/database';

export interface CustomerResult {
  customerId: string | null;
  error: Error | null;
}

/**
 * Obtém ou provisiona atomicamente o customer_id vinculado ao usuário autenticado (auth.uid()).
 * Utiliza a RPC segura get_or_create_customer com fallback robusto.
 */
export async function getOrCreateCustomer(
  name?: string | null,
  phone?: string | null
): Promise<CustomerResult> {
  try {
    // 1. Validação estrita da sessão de autenticação ativa
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return { customerId: null, error: new Error('Sessão expirada ou usuário não autenticado.') };
    }

    const cleanName = (name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente').trim();
    const cleanPhone = (phone || user.user_metadata?.phone || '').trim() || null;

    // 2. Executa a RPC get_or_create_customer (SECURITY DEFINER)
    try {
      const { data: rpcCustomerId, error: rpcErr } = await supabase.rpc('get_or_create_customer', {
        p_name: cleanName,
        p_phone: cleanPhone,
      });

      if (!rpcErr && rpcCustomerId) {
        return { customerId: rpcCustomerId as string, error: null };
      }
      if (rpcErr && !rpcErr.message.includes('function get_or_create_customer') && !rpcErr.message.includes('not found')) {
        console.warn('[customerService] Erro na RPC get_or_create_customer:', rpcErr);
      }
    } catch (rpcCallErr) {
      console.warn('[customerService] Exceção ao chamar RPC get_or_create_customer:', rpcCallErr);
    }

    // 3. Fallback: Consulta direta na tabela customers via RLS (user_id = auth.uid())
    try {
      const { data: existingCust, error: selectErr } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!selectErr && existingCust?.id) {
        return { customerId: existingCust.id, error: null };
      }

      // Se não existir, tenta criar
      const { data: newCust, error: insertErr } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          name: cleanName,
          phone: cleanPhone,
        })
        .select('id')
        .single();

      if (!insertErr && newCust?.id) {
        return { customerId: newCust.id, error: null };
      }

      if (insertErr) {
        console.warn('[customerService] Erro no fallback de insert em customers:', insertErr);
        return { customerId: null, error: new Error(insertErr.message) };
      }
    } catch (directErr: any) {
      console.warn('[customerService] Exceção no fallback direto:', directErr);
      return { customerId: null, error: directErr instanceof Error ? directErr : new Error(String(directErr)) };
    }

    return { customerId: null, error: new Error('Não foi possível identificar o perfil de cliente.') };
  } catch (err: any) {
    console.error('[customerService] Erro fatal em getOrCreateCustomer:', err);
    return { customerId: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Consulta a lista de endereços pertencentes ao cliente autenticado.
 */
export async function fetchCustomerAddressesList(customerId?: string | null): Promise<Address[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let targetCustomerId = customerId;
    if (!targetCustomerId) {
      const res = await getOrCreateCustomer();
      targetCustomerId = res.customerId;
    }

    if (targetCustomerId) {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', targetCustomerId);

      if (!error && data) {
        return (data as Address[]).sort((a: any, b: any) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
      }
    }

    // Fallback geral via RLS
    const { data: allData, error: allErr } = await supabase.from('addresses').select('*');
    if (!allErr && allData) {
      return (allData as Address[]).sort((a: any, b: any) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    }

    return [];
  } catch (err) {
    console.error('[customerService] Erro ao buscar endereços:', err);
    return [];
  }
}
