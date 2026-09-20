import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { 
  Package, X, Clock, CheckCircle2, XCircle, MapPin, Receipt, 
  DollarSign, Phone, ChevronRight, Edit3, Trash2, Bike, Car, Truck,
  AlertTriangle, MessageCircle, Navigation, ShieldCheck, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; desc: string; color: string; bg: string; step: number }> = {
  pending: { 
    label: "Aguardando Entregador", 
    desc: "Buscando o entregador mais próximo de você...",
    color: "text-amber-600 dark:text-amber-400", 
    bg: "bg-amber-400/20 border-amber-500/30",
    step: 1
  },
  broadcasted: { 
    label: "Aguardando Entregador", 
    desc: "Procurando motoristas e entregadores na região...",
    color: "text-amber-600 dark:text-amber-400", 
    bg: "bg-amber-400/20 border-amber-500/30",
    step: 1
  },
  accepted: { 
    label: "Entregador a Caminho da Coleta", 
    desc: "O entregador aceitou o pedido e está indo retirar seu pacote.",
    color: "text-blue-600 dark:text-blue-400", 
    bg: "bg-blue-500/20 border-blue-500/30",
    step: 2
  },
  in_route: { 
    label: "Em Rota de Entrega", 
    desc: "Pacote coletado! O entregador está a caminho do destino.",
    color: "text-purple-600 dark:text-purple-400", 
    bg: "bg-purple-500/20 border-purple-500/30",
    step: 3
  },
  delivered: { 
    label: "Entrega Concluída", 
    desc: "Seu pacote foi entregue com sucesso!",
    color: "text-emerald-600 dark:text-emerald-400", 
    bg: "bg-emerald-500/20 border-emerald-500/30",
    step: 4
  },
  cancelled: { 
    label: "Entrega Cancelada", 
    desc: "Esta solicitação de entrega foi cancelada.",
    color: "text-rose-600 dark:text-rose-400", 
    bg: "bg-rose-500/20 border-rose-500/30",
    step: 0
  },
};

const VEHICLE_ICONS: Record<string, any> = {
  moto: Bike,
  carro: Car,
  carro_aberto: Truck,
};

const VEHICLE_LABELS: Record<string, string> = {
  moto: "Moto",
  carro: "Carro",
  carro_aberto: "Carro Aberto / Caçamba",
};

interface ClientErrandDetailModalProps {
  errandId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ClientErrandDetailModal({ errandId, isOpen, onClose, onUpdated }: ClientErrandDetailModalProps) {
  const [errand, setErrand] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Campos de Edição
  const [editPickup, setEditPickup] = useState("");
  const [editDropoff, setEditDropoff] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const loadErrand = async () => {
    if (!errandId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("id", errandId)
        .maybeSingle();

      if (error) throw error;
      setErrand(data);

      if (data) {
        setEditPickup(data.pickup_address || "");
        setEditDropoff(data.address || "");
        setEditNotes(data.notes || "");
        setEditPhone(data.customer_phone || "");

        // Se tem motorista atribuído, busca os dados dele
        if (data.driver_id && data.driver_id !== "none") {
          const [driverRes, profileRes] = await Promise.all([
            supabase.from("delivery_drivers").select("*").or(`id.eq.${data.driver_id},user_id.eq.${data.driver_id}`).maybeSingle(),
            supabase.from("profiles").select("*").or(`id.eq.${data.driver_id},user_id.eq.${data.driver_id}`).maybeSingle(),
          ]);

          setDriver({
            name: profileRes.data?.full_name || driverRes.data?.full_name || "Entregador Parceiro",
            phone: profileRes.data?.phone || driverRes.data?.phone,
            avatarUrl: profileRes.data?.avatar_url || null,
            vehicle: driverRes.data?.vehicle_type || data.vehicle_type || "moto",
            plate: driverRes.data?.vehicle_plate || null,
          });
        } else {
          setDriver(null);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar detalhes da entrega:", err);
      toast.error("Não foi possível carregar os detalhes da entrega.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!errandId || !isOpen) {
      setErrand(null);
      setDriver(null);
      setIsEditing(false);
      return;
    }

    loadErrand();

    // Inscrição Realtime para atualizações da entrega
    const channel = supabase
      .channel(`errand_tracking_${errandId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "deliveries",
          filter: `id=eq.${errandId}`,
        },
        (payload) => {
          setErrand(payload.new);
          if (payload.new.driver_id && payload.new.driver_id !== errand?.driver_id) {
            loadErrand();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [errandId, isOpen]);

  const handleSaveEdit = async () => {
    if (!errandId || savingEdit) return;
    if (!editPickup.trim() || !editDropoff.trim()) {
      toast.error("Os endereços de coleta e entrega são obrigatórios.");
      return;
    }

    try {
      setSavingEdit(true);
      const { error } = await supabase
        .from("deliveries")
        .update({
          pickup_address: editPickup.trim(),
          address: editDropoff.trim(),
          notes: editNotes.trim(),
          customer_phone: editPhone.trim() || null,
        } as any)
        .eq("id", errandId);

      if (error) throw error;

      toast.success("Informações da entrega atualizadas!");
      setIsEditing(false);
      loadErrand();
      onUpdated?.();
    } catch (err: any) {
      console.error("Erro ao salvar alterações:", err);
      toast.error("Falha ao salvar as alterações.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!errandId || cancelling) return;
    if (!window.confirm("Deseja realmente cancelar esta solicitação de entrega?")) return;

    try {
      setCancelling(true);
      const { error } = await supabase
        .from("deliveries")
        .update({
          status: "cancelled",
        } as any)
        .eq("id", errandId);

      if (error) throw error;

      toast.success("Entrega cancelada com sucesso.");
      loadErrand();
      onUpdated?.();
    } catch (err: any) {
      console.error("Erro ao cancelar entrega:", err);
      toast.error("Falha ao cancelar a entrega.");
    } finally {
      setCancelling(false);
    }
  };

  const statusInfo = STATUS_CONFIG[errand?.status || "pending"] || STATUS_CONFIG.pending;
  const VehicleIcon = VEHICLE_ICONS[errand?.vehicle_type || "moto"] || Bike;
  const isCancellable = errand && ["pending", "broadcasted", "accepted"].includes(errand.status);
  const isEditable = errand && ["pending", "broadcasted"].includes(errand.status);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] p-0 rounded-t-[28px] bg-background flex flex-col overflow-hidden border-t">
        {/* Top Handle and Header */}
        <div className="p-4 pb-2 border-b flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg tracking-tight flex items-center gap-1.5">
                Envio & Entrega
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  #{errand?.id ? errand.id.slice(0, 8).toUpperCase() : ""}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {errand?.created_at ? new Date(errand.created_at).toLocaleString("pt-BR") : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && !errand ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm">Carregando detalhes do envio...</span>
            </div>
          ) : errand ? (
            <>
              {/* Status Banner */}
              <div className={cn("p-4 rounded-2xl border flex flex-col gap-2", statusInfo.bg)}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-black uppercase tracking-wider", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    R$ {Number(errand.value || 0).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {statusInfo.desc}
                </p>

                {/* Status Stepper */}
                {errand.status !== "cancelled" && (
                  <div className="grid grid-cols-4 gap-1.5 pt-2">
                    {[
                      { step: 1, label: "Solicitado" },
                      { step: 2, label: "Aceito" },
                      { step: 3, label: "Em Rota" },
                      { step: 4, label: "Entregue" },
                    ].map((s) => (
                      <div key={s.step} className="flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            "h-1.5 w-full rounded-full transition-all",
                            statusInfo.step >= s.step
                              ? "bg-primary"
                              : "bg-muted-foreground/20"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[10px] font-bold text-center",
                            statusInfo.step >= s.step
                              ? "text-primary"
                              : "text-muted-foreground/50"
                          )}
                        >
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Driver Card (if assigned) */}
              {driver && (
                <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Entregador Parceiro
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Verificado
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {driver.avatarUrl ? (
                        <img
                          src={driver.avatarUrl}
                          alt={driver.name}
                          className="w-12 h-12 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-base">
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-foreground">{driver.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <VehicleIcon className="w-3.5 h-3.5" />
                          {VEHICLE_LABELS[driver.vehicle] || driver.vehicle}
                          {driver.plate && ` • Placa: ${driver.plate}`}
                        </p>
                      </div>
                    </div>

                    {driver.phone && (
                      <a
                        href={`https://wa.me/55${driver.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        title="Falar no WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Edit Form or View Mode */}
              {isEditing ? (
                <div className="p-4 rounded-2xl bg-card border space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-primary" /> Editar Informações do Envio
                    </h3>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">Endereço de Coleta (Partida)</label>
                    <Input
                      value={editPickup}
                      onChange={(e) => setEditPickup(e.target.value)}
                      placeholder="Rua, número, bairro..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">Endereço de Entrega (Destino)</label>
                    <Input
                      value={editDropoff}
                      onChange={(e) => setEditDropoff(e.target.value)}
                      placeholder="Rua, número, bairro..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">Telefone de Contato</label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="(66) 99999-9999"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">O que vamos transportar? (Observações)</label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Descreva o pacote ou cuidados especiais..."
                      className="text-xs resize-none"
                      rows={3}
                    />
                  </div>

                  <Button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="w-full gap-2 mt-2 h-10"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
                  </Button>
                </div>
              ) : (
                /* Route Stepper Card */
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Trajeto da Entrega
                    </span>
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      <VehicleIcon className="w-3.5 h-3.5 text-primary" />
                      {VEHICLE_LABELS[errand.vehicle_type || "moto"] || "Moto"}
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-4 border-l-2 border-dashed border-border ml-2 my-1">
                    {/* Coleta */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background shadow-sm" />
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Local de Coleta (Partida)
                      </p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {errand.pickup_address || "Não informado"}
                      </p>
                    </div>

                    {/* Entrega */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-background shadow-sm" />
                      <p className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Local de Entrega (Destino)
                      </p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {errand.address || "Não informado"}
                      </p>
                    </div>
                  </div>

                  {errand.notes && (
                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                        Observações do Pacote
                      </p>
                      <p className="text-xs text-foreground/90 bg-muted/50 p-2.5 rounded-xl whitespace-pre-wrap leading-relaxed">
                        {errand.notes}
                      </p>
                    </div>
                  )}

                  {errand.customer_phone && (
                    <div className="pt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Telefone do Cliente: <span className="font-bold text-foreground">{errand.customer_phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Summary */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Resumo dos Valores
                </span>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Distância Estimada:</span>
                  <span className="font-bold text-foreground">
                    {errand.distance_km ? `${Number(errand.distance_km).toFixed(1)} km` : "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Taxa do Entregador:</span>
                  <span className="font-bold text-foreground">
                    R$ {(Number(errand.value || 0) > 0.99 ? Number(errand.value) - 0.99 : Number(errand.value || 0)).toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Taxa de Serviço:</span>
                  <span className="font-bold text-foreground">R$ 0,99</span>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-sm font-bold text-foreground">
                  <span>Total da Entrega:</span>
                  <span className="text-base font-black text-primary">
                    R$ {Number(errand.value || 0).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Entrega não encontrada.
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        {errand && errand.status !== "delivered" && errand.status !== "cancelled" && (
          <div className="p-4 border-t bg-card flex items-center gap-2 shrink-0">
            {isEditable && !isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex-1 gap-1.5 h-11 rounded-xl text-xs font-bold"
              >
                <Edit3 className="w-4 h-4" /> Editar Envio
              </Button>
            )}

            {isCancellable && (
              <Button
                variant="destructive"
                onClick={handleCancelDelivery}
                disabled={cancelling}
                className="flex-1 gap-1.5 h-11 rounded-xl text-xs font-bold"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Cancelar Entrega
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
