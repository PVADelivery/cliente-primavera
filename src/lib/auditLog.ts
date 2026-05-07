import { supabase, isSupabaseConfigured } from "./supabase";

export type AuditEvent =
  | "checkout.attempt"
  | "orders.insert.success"
  | "orders.insert.403"
  | "orders.insert.23505"
  | "orders.insert.error"
  | "customers.autocreate.success"
  | "customers.autocreate.failed"
  | "auth.signin.success"
  | "auth.signin.failed"
  | "auth.signup.success"
  | "auth.signup.failed";

export interface AuditLogPayload {
  request_id: string;
  event: AuditEvent;
  user_id?: string | null;
  source?: string;
  http_status?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/**
 * Tolerante a falhas: nunca lança. Se a tabela `audit_logs` não existir
 * (PGRST205) ou houver erro de RLS, apenas loga no console.
 */
export async function recordAuditLog(entry: AuditLogPayload): Promise<void> {
  // Sempre log local primeiro
  // eslint-disable-next-line no-console
  console.info(`[audit][${entry.event}]`, {
    requestId: entry.request_id,
    user: entry.user_id,
    code: entry.error_code,
    msg: entry.error_message,
    ctx: entry.context,
  });

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase.from("audit_logs").insert({
      request_id: entry.request_id,
      event: entry.event,
      user_id: entry.user_id ?? null,
      source: entry.source ?? "marketplace-web",
      http_status: entry.http_status ?? null,
      error_code: entry.error_code ?? null,
      error_message: entry.error_message ?? null,
      payload: entry.payload ?? {},
      context: entry.context ?? {},
    });
    if (error && error.code !== "PGRST205") {
      // eslint-disable-next-line no-console
      console.warn("[audit] insert failed (non-fatal)", error.code, error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[audit] threw (non-fatal)", err);
  }
}

export function explainCustomerProvisionError(error: { code?: string; message?: string }): string {
  if (error.code === "42501") {
    return "Sem permissão para criar seu cadastro de cliente. Verifique a policy 'customers_self_insert'.";
  }
  if (error.code === "42703") {
    return "Coluna ausente na tabela 'customers'. Rode o script de reparo de schema.";
  }
  if (error.code === "23505") {
    return "Cadastro de cliente já existe.";
  }
  return error.message ?? "Erro desconhecido ao auto-provisionar customer.";
}

export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
