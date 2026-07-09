import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, CheckCircle2, Car, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/marketplace/taxi")({
  head: () => ({ meta: [{ title: "Solicitar Táxi / Moto Táxi — Primavera Delivery" }] }),
  component: TaxiPage,
});

function TaxiPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [vehicleType, setVehicleType] = useState<"taxi" | "mototaxi">("mototaxi");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("ride_requests").insert({
        user_id: user?.id || null,
        customer_name: user?.user_metadata?.full_name || user?.email || "Passageiro",
        customer_phone: user?.user_metadata?.phone || "",
        pickup_address: pickup,
        dropoff_address: dropoff,
        vehicle_type: vehicleType,
        notes: notes,
        price: vehicleType === "taxi" ? 25.00 : 15.00, // Preços de exemplo
        status: "pending",
      } as any);

      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Erro ao solicitar corrida. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">Corrida Solicitada!</h2>
        <p className="text-muted-foreground mb-8">
          Motoristas próximos foram notificados. Aguarde enquanto um motorista aceita a corrida.
        </p>
        <Button onClick={() => navigate({ to: "/marketplace" })} className="w-full max-w-xs h-12 rounded-xl">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="w-10 h-10 rounded-full bg-secondary grid place-items-center text-muted-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Táxi & Moto Táxi</h1>
          <p className="text-xs text-muted-foreground">Solicite transporte rápido na cidade</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setVehicleType("mototaxi")}
          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
            vehicleType === "mototaxi"
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          <Bike className="w-8 h-8 mb-2" />
          <span className="font-bold text-sm">Moto Táxi</span>
          <span className="text-xs opacity-80 mt-0.5">R$ 15,00</span>
        </button>

        <button
          type="button"
          onClick={() => setVehicleType("taxi")}
          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
            vehicleType === "taxi"
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          <Car className="w-8 h-8 mb-2" />
          <span className="font-bold text-sm">Táxi (Carro)</span>
          <span className="text-xs opacity-80 mt-0.5">R$ 25,00</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Onde te buscamos?
          </label>
          <input
            required
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Endereço de partida"
            className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" /> Para onde vamos?
          </label>
          <input
            required
            type="text"
            value={dropoff}
            onChange={(e) => setDropoff(e.target.value)}
            placeholder="Endereço de destino"
            className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Observações para o motorista</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Estou de camisa vermelha na frente do mercado..."
            className="w-full h-20 p-4 rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-xl font-bold text-lg mt-4 shadow-[var(--shadow-elegant)]"
        >
          {loading ? "Solicitando..." : "Confirmar Solicitação"}
        </Button>
      </form>
    </div>
  );
}
